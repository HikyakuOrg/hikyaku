import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createTokenClient } from '@/lib/supabase/admin'

const REQUIRED_PERMISSION = 'drivers.add'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
])

type CreateDriverInput = {
    displayName: string
    email: string
    phoneNumber: string
    driverLicense: string | null
    licenseExpiry: string | null
    avatar: File | null
}

class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status })
}

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function isValidDateOnly(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function parseRequestBody(request: NextRequest): Promise<CreateDriverInput> {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? ''

    if (!contentType.includes('multipart/form-data')) {
        throw new ApiError('Content-Type must be multipart/form-data', 400)
    }

    const formData = await request.formData()

    const displayName = String(formData.get('displayName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const phoneNumber = String(formData.get('phone_number') ?? '').trim()
    const driverLicenseRaw = String(formData.get('driverLicense') ?? '').trim()
    const licenseExpiryRaw = String(formData.get('licenseExpiry') ?? '').trim()

    const avatarEntry = formData.get('avatar')
    const avatar = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null

    if (!displayName || !email || !phoneNumber) {
        throw new ApiError('displayName, email, and phone_number are mandatory', 400)
    }

    if (licenseExpiryRaw && !isValidDateOnly(licenseExpiryRaw)) {
        throw new ApiError('licenseExpiry must be in YYYY-MM-DD format', 400)
    }

    if (avatar) {
        if (!ALLOWED_AVATAR_MIME_TYPES.has(avatar.type)) {
            throw new ApiError('avatar must be a JPEG, PNG, or WEBP image', 400)
        }

        if (avatar.size > MAX_AVATAR_BYTES) {
            throw new ApiError('avatar file size exceeds 5MB limit', 400)
        }
    }

    return {
        displayName,
        email,
        phoneNumber,
        driverLicense: driverLicenseRaw ? driverLicenseRaw : null,
        licenseExpiry: licenseExpiryRaw ? licenseExpiryRaw : null,
        avatar,
    }
}

function getBearerToken(headerValue: string | null) {
    if (!headerValue) {
        return null
    }

    const trimmed = headerValue.trim()
    if (!trimmed.toLowerCase().startsWith('bearer ')) {
        return null
    }

    const token = trimmed.slice(7).trim()
    return token || null
}

export async function POST(request: NextRequest) {
    let createdUserId: string | null = null
    let uploadedAvatarPath: string | null = null

    try {
        const token = getBearerToken(request.headers.get('Authorization'))
        if (!token) {
            return jsonError('Missing or invalid Authorization header', 401)
        }

        const tokenClient = createTokenClient()
        const { data: tokenData, error: tokenError } = await tokenClient.auth.getUser(token)

        if (tokenError || !tokenData.user) {
            return jsonError('Invalid Supabase token', 401)
        }

        const requesterId = tokenData.user.id
        const input = await parseRequestBody(request)

        const adminClient = createAdminClient()

        const { data: permissionData, error: permissionError } = await adminClient
            .from('user_permission')
            .select('permission_id, app_permission!inner(permission)')
            .eq('user_id', requesterId)
            .eq('app_permission.permission', REQUIRED_PERMISSION)
            .limit(1)

        if (permissionError) {
            return jsonError('Unable to verify permissions', 500)
        }

        if (!permissionData || permissionData.length === 0) {
            return jsonError('Forbidden: missing drivers.add permission', 403)
        }

        const { data: createdUserData, error: createUserError } = await adminClient.auth.admin.createUser({
            email: input.email,
            phone: input.phoneNumber,
            user_metadata: {
                display_name: input.displayName,
                displayName: input.displayName,
            },
        })

        if (createUserError || !createdUserData.user) {
            const message = createUserError?.message?.toLowerCase() ?? ''
            if (message.includes('already')) {
                return jsonError('User already exists', 409)
            }

            return jsonError(createUserError?.message ?? 'Failed to create auth user', 400)
        }

        createdUserId = createdUserData.user.id

        let avatarUrl: string | null = null

        if (input.avatar) {
            const safeName = sanitizeFileName(input.avatar.name || 'avatar')
            uploadedAvatarPath = `${createdUserId}/${safeName}`

            const { error: uploadError } = await adminClient.storage
                .from('avatar')
                .upload(uploadedAvatarPath, input.avatar, {
                    contentType: input.avatar.type,
                    upsert: true,
                })

            if (uploadError) {
                throw new ApiError(`Avatar upload failed: ${uploadError.message}`, 500)
            }

            avatarUrl = adminClient.storage
                .from('avatar')
                .getPublicUrl(uploadedAvatarPath).data.publicUrl

            const { error: updateMetadataError } = await adminClient.auth.admin.updateUserById(createdUserId, {
                user_metadata: {
                    display_name: input.displayName,
                    displayName: input.displayName,
                    avatar_url: avatarUrl,
                },
            })

            if (updateMetadataError) {
                throw new ApiError(`Failed to update user metadata: ${updateMetadataError.message}`, 500)
            }
        }

        const { data: driverRow, error: driverInsertError } = await adminClient
            .from('drivers')
            .insert({
                id: createdUserId,
                driver_license: input.driverLicense,
                license_expiry: input.licenseExpiry,
            })
            .select('id, driver_license, license_expiry')
            .single()

        if (driverInsertError || !driverRow) {
            throw new ApiError(driverInsertError?.message ?? 'Failed to create driver record', 500)
        }

        return NextResponse.json(
            {
                id: driverRow.id,
                displayName: input.displayName,
                email: input.email,
                phone_number: input.phoneNumber,
                avatarUrl,
                driverLicense: driverRow.driver_license,
                licenseExpiry: driverRow.license_expiry,
            },
            { status: 201 }
        )
    } catch (error) {
        if (uploadedAvatarPath || createdUserId) {
            const adminClient = createAdminClient()

            if (uploadedAvatarPath) {
                await adminClient.storage.from('avatar').remove([uploadedAvatarPath])
            }

            if (createdUserId) {
                await adminClient.auth.admin.deleteUser(createdUserId)
            }
        }

        const message = error instanceof Error ? error.message : 'Unexpected server error'
        const status = error instanceof ApiError ? error.status : 500
        return jsonError(message, status)
    }
}
