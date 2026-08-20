import { createLazyClient } from "./client";

const supabase = createLazyClient()

export async function addAvatar(userId: string, file: File) {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}.${fileExtension}`;
    const fileBuffer = await file.arrayBuffer()
    // NB: the live bucket id is 'avatar' (singular) - 'avatars' never existed,
    // so uploads silently targeted a nonexistent bucket.
    const { error } = await supabase.storage
        .from('avatar')
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: true,
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('avatar').getPublicUrl(fileName);

    return publicUrlData.publicUrl;

}

export async function addVehicleImages(vehicleId: string, files: File[]) {

    const uploadPromises = files.map(async (file) => {
        const fileExtension = file.name.split('.').pop()
        const fileName = `${vehicleId}/${crypto.randomUUID()}.${fileExtension}`

        const { error } = await supabase.storage
            .from('vehicles')
            .upload(fileName, file, {
                contentType: file.type,
            })

        if (error) throw error

        return fileName
    })

    return await Promise.all(uploadPromises)
}


export async function listVehicleFiles(vehicleId: string) {
    const { data, error } = await supabase.storage.from('vehicles').list(vehicleId)
    if (error) throw error
    return data
}

export async function getSignedUrls(paths: string[]) {
    const { data, error } = await supabase
        .storage
        .from('vehicles')
        .createSignedUrls(paths, 60)

    if (error) throw error

    return data.map((d) => d.signedUrl)
}

/**
 * Upload (or replace) an organisation's QR/branding logo. Path is keyed by
 * organisationId, not slug — the org-logos bucket's RLS policies check
 * team_members against that folder segment, and slugs are mutable-ish while
 * the id isn't. `upsert: true` always writes to the same path so a
 * replacement doesn't leave the old file orphaned in storage; the cache-bust
 * query param is what makes the browser/CDN pick up the new image despite
 * the path staying identical.
 */
export async function uploadOrganisationLogo(organisationId: string, file: File) {
    const fileExtension = file.name.split('.').pop()
    const fileName = `${organisationId}/logo.${fileExtension}`
    const fileBuffer = await file.arrayBuffer()

    const { error } = await supabase.storage
        .from('org-logos')
        .upload(fileName, fileBuffer, {
            contentType: file.type,
            upsert: true,
        })

    if (error) throw error

    const { data: publicUrlData } = supabase.storage.from('org-logos').getPublicUrl(fileName)

    return `${publicUrlData.publicUrl}?v=${Date.now()}`
}

export async function listPackageFiles(packageId: string) {
    const { data, error } = await supabase.storage.from('packages').list(packageId)
    if (error) throw error
    return data
}

export async function getPackageSignedUrls(paths: string[]) {
    const { data, error } = await supabase
        .storage
        .from('packages')
        .createSignedUrls(paths, 60)

    if (error) throw error

    return data.map((d) => d.signedUrl)
}