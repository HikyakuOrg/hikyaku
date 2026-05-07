"use client"

import { useState, useRef, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Loader2, AlertCircle, CameraIcon } from "lucide-react"
import { toast } from "sonner"
import { createUser } from "@/lib/actions/users"
import PhoneInput, { isValidPhoneNumber, getCountries } from "react-phone-number-input"
import en from "react-phone-number-input/locale/en.json"
import "react-phone-number-input/style.css"
import flags from "react-phone-number-input/flags"

const countryOptions = getCountries().map((code) => ({
    code,
    name: (en as Record<string, string>)[code] ?? code,
})).sort((a, b) => a.name.localeCompare(b.name))
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const schema = z.object({
    displayName: z.string().min(1, "Display name is required"),
    email: z.email("Valid email is required"),
    phone: z.string().refine(isValidPhoneNumber, "Invalid phone number"),
    roleId: z.number({ error: "Role is required" }),
    drivingLicense: z.string().optional(),
    licenseExpiry: z.string().optional(),
    countryOfIssue: z.string().optional(),
    underProbation: z.enum(["yes", "no"]).optional(),
    vehicleTypeId: z.string().optional(),
    permissionIds: z.array(z.number()).optional(),
})

type FormValues = z.infer<typeof schema>

type Role = { id: number; name: string }
type Permission = { id: number; permission: string }
type VehicleType = { id: string; vehicle_type: string }

type Props = {
    roles: Role[]
    permissions: Permission[]
    vehicleTypes: VehicleType[]
}

export default function AddTeamMemberForm({ roles, permissions, vehicleTypes }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [expiryDate, setExpiryDate] = useState<Date | undefined>()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            displayName: "",
            email: "",
            phone: "",
            roleId: undefined,
            drivingLicense: "",
            licenseExpiry: "",
            countryOfIssue: "",
            underProbation: undefined,
            vehicleTypeId: "",
            permissionIds: [],
        },
    })

    // Avatar preview cleanup
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        }
    }, [avatarPreview])

    // Watch role for conditional fields
    const watchRoleId = form.watch("roleId")
    const selectedRole = roles.find((r) => r.id === watchRoleId)
    const isDriver = selectedRole?.name === "Driver"

    // Permissions grouping
    const permissionGroups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        const [group] = p.permission.split(".")
        if (!acc[group]) acc[group] = []
        acc[group].push(p)
        return acc
    }, {})

    // Permission selection helpers
    const selectedPermissions = form.watch("permissionIds") ?? []
    const togglePermission = (id: number) => {
        if (selectedPermissions.includes(id)) {
            form.setValue(
                "permissionIds",
                selectedPermissions.filter((pid) => pid !== id)
            )
        } else {
            form.setValue("permissionIds", [...selectedPermissions, id])
        }
    }
    const toggleGroup = (group: string) => {
        const groupIds = permissionGroups[group].map((p) => p.id)
        const allSelected = groupIds.every((id) => selectedPermissions.includes(id))
        if (allSelected) {
            form.setValue(
                "permissionIds",
                selectedPermissions.filter((id) => !groupIds.includes(id))
            )
        } else {
            form.setValue(
                "permissionIds",
                Array.from(new Set([...selectedPermissions, ...groupIds]))
            )
        }
    }

    // Avatar file select
    const handleAvatarClick = () => fileInputRef.current?.click()
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    // License expiry select
    const handleExpirySelect = (date?: Date) => {
        setExpiryDate(date)
        if (date) {
            form.setValue("licenseExpiry", format(date, "yyyy-MM-dd"))
        } else {
            form.setValue("licenseExpiry", "")
        }
    }

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true)
        try {

            const permissionStrings =
                values.permissionIds && values.permissionIds.length > 0
                    ? permissions
                        .filter((p) => values.permissionIds!.includes(p.id))
                        .map((p) => p.permission)
                    : []

            const result = await createUser({
                user_email: values.email,
                user_display_name: values.displayName,
                user_phone_number: values.phone,
                user_role: selectedRole!.name,
                user_permission: permissionStrings,
                user_avatar: avatarFile ? true : undefined,
                user_metadata: isDriver
                    ? {
                        driver_license: values.drivingLicense || undefined,
                        license_expiry: values.licenseExpiry || undefined,
                        country_of_issue: values.countryOfIssue || undefined,
                        driver_under_probation:
                            values.underProbation === "yes"
                                ? true
                                : values.underProbation === "no"
                                    ? false
                                    : undefined,
                        license_type: values.vehicleTypeId || undefined,
                    }
                    : undefined,
            })

            if (!result.success) {
                toast.error(result.error)
                return
            }

            // Two-step avatar upload: PUT file directly to signed Supabase Storage URL
            if (avatarFile && result.avatarUploadUrl) {
                try {
                    const uploadRes = await fetch(result.avatarUploadUrl, {
                        method: "PUT",
                        body: avatarFile,
                        headers: { "Content-Type": avatarFile.type },
                    })
                    if (!uploadRes.ok) {
                        toast.warning("Team member added, but avatar upload failed.")
                        router.push("/dashboard/fleet/team-members")
                        return
                    }
                } catch {
                    toast.warning("Team member added, but avatar upload failed.")
                    router.push("/dashboard/fleet/team-members")
                    return
                }
            }

            toast.success("Team member added successfully")
            router.push("/dashboard/fleet/team-members")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
                <div
                    className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-muted cursor-pointer relative group overflow-hidden"
                    onClick={handleAvatarClick}
                >
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="object-cover w-full h-full rounded-full" />
                    ) : (
                        <CameraIcon className="h-8 w-8 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition">
                        <CameraIcon className="h-8 w-8 text-white" />
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>
                <div>
                    <div className="font-medium">Profile Picture</div>
                    <div className="text-sm text-muted-foreground">Optional. Click to upload a photo.</div>
                </div>
            </div>

            {/* Personal Info */}
            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Enter team member details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input id="displayName" {...form.register("displayName")} />
                            {form.formState.errors.displayName && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.displayName.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" {...form.register("email")} />
                            {form.formState.errors.email && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.email.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Controller
                                name="phone"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <PhoneInput
                                        id="phone"
                                        value={field.value}
                                        onChange={(value) => field.onChange(value ?? "")}
                                        flags={flags}
                                        defaultCountry="AU"
                                        className={cn(
                                            "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground"
                                        )}
                                    />
                                )}
                            />
                            {form.formState.errors.phone && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.phone.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Controller
                                name="roleId"
                                control={form.control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value ? String(field.value) : ""}
                                        onValueChange={(val) => field.onChange(Number(val))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role">
                                                {roles.find((r) => r.id === field.value)?.name}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map((role) => (
                                                <SelectItem key={role.id} value={String(role.id)}>
                                                    {role.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.roleId && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {form.formState.errors.roleId.message}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isDriver && (
                <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Driver Licensing Details</CardTitle>
                        <CardDescription>
                            Provide details about the driver's license.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="drivingLicense">Driving License</Label>
                                <Input id="drivingLicense" {...form.register("drivingLicense")} placeholder="License number" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="licenseExpiry">License Expiry</Label>
                                <Popover>
                                    <PopoverTrigger className="w-full">
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 rounded-md border bg-transparent px-3 py-2 text-sm justify-start text-left font-normal",
                                                !expiryDate && "text-muted-foreground"
                                            )}
                                        >
                                            <span>
                                                {expiryDate ? format(expiryDate, "yyyy-MM-dd") : "Select a date"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={expiryDate}
                                            onSelect={handleExpirySelect}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="countryOfIssue">Country of Issue</Label>
                                <Controller
                                    name="countryOfIssue"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select country">
                                                    {countryOptions.find(({ code }) => code === field.value)?.name}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countryOptions.map(({ code, name }) => (
                                                    <SelectItem key={code} value={code}>
                                                        {name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="underProbation">Under Probation</Label>
                                <Controller
                                    name="underProbation"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select">
                                                    {field.value === "yes" ? "Yes" : field.value === "no" ? "No" : undefined}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicleTypeId">License Type</Label>
                                <Controller
                                    name="vehicleTypeId"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select vehicle type">
                                                    {vehicleTypes.find((vt) => vt.id === field.value)?.vehicle_type}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicleTypes.map((vt) => (
                                                    <SelectItem key={vt.id} value={vt.id}>
                                                        {vt.vehicle_type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

            )}

            {/* Permissions */}
            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Additional Permissions</CardTitle>
                    <CardDescription>
                        Grant extra permissions beyond the role's default access.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {Object.entries(permissionGroups).map(([group, perms]) => (
                            <div key={group} className="">
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="font-medium capitalize">{group}</span>
                                    <Checkbox
                                        checked={perms.every((p) => selectedPermissions.includes(p.id))}
                                        onCheckedChange={() => toggleGroup(group)}
                                    />
                                    <span className="text-xs text-muted-foreground">Select All</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {perms.map((perm) => (
                                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={selectedPermissions.includes(perm.id)}
                                                onCheckedChange={() => togglePermission(perm.id)}
                                            />
                                            <span className="text-sm">{perm.permission}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex justify-end gap-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Add Team Member...
                        </>
                    ) : (
                        "Add Team Member"
                    )}
                </Button>
            </div>
        </form>
    )
}
