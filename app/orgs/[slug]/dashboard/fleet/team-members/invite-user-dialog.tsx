"use client"

import { useTransition } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { createInvitation } from "@/lib/actions/invitations"

type AppPermission = { id: number; permission: string }

interface InviteUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    orgId: string
    roles: string[]
    permissions: AppPermission[]
    onInvited?: () => void
}

const schema = z.object({
    email: z.email("Enter a valid email"),
    role: z.string().min(1, "Role is required"),
    permissions: z.array(z.string()),
})

type FormValues = z.infer<typeof schema>

export function InviteUserDialog({
    open,
    onOpenChange,
    orgId,
    roles,
    permissions,
    onInvited,
}: InviteUserDialogProps) {
    const [isPending, startTransition] = useTransition()

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "", role: "", permissions: [] },
    })

    const selectedPermissions = form.watch("permissions") ?? []

    const permissionGroups = permissions.reduce<Record<string, AppPermission[]>>((acc, p) => {
        const [group] = p.permission.split(".")
        if (!acc[group]) acc[group] = []
        acc[group].push(p)
        return acc
    }, {})

    const togglePermission = (perm: string) => {
        if (selectedPermissions.includes(perm)) {
            form.setValue("permissions", selectedPermissions.filter((p) => p !== perm))
        } else {
            form.setValue("permissions", [...selectedPermissions, perm])
        }
    }

    const toggleGroup = (group: string) => {
        const groupPerms = permissionGroups[group].map((p) => p.permission)
        const allSelected = groupPerms.every((p) => selectedPermissions.includes(p))
        if (allSelected) {
            form.setValue(
                "permissions",
                selectedPermissions.filter((p) => !groupPerms.includes(p)),
            )
        } else {
            form.setValue(
                "permissions",
                Array.from(new Set([...selectedPermissions, ...groupPerms])),
            )
        }
    }

    const onSubmit = (values: FormValues) => {
        startTransition(async () => {
            const result = await createInvitation({
                userEmail: values.email,
                orgId,
                role: values.role,
                permissions: values.permissions,
            })
            if (!result.success) {
                toast.error(result.error)
                return
            }
            toast.success(`Invitation sent to ${values.email}`)
            form.reset()
            onOpenChange(false)
            onInvited?.()
        })
    }

    const handleOpenChange = (next: boolean) => {
        if (isPending) return
        if (!next) form.reset()
        onOpenChange(next)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Invite a team member</DialogTitle>
                    <DialogDescription>
                        They&apos;ll receive an email to join your organisation.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="invite-user-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            placeholder="name@hikyaku.org"
                            autoComplete="off"
                            {...form.register("email")}
                        />
                        {form.formState.errors.email && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {form.formState.errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Controller
                            name="role"
                            control={form.control}
                            render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger id="invite-role">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.role && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {form.formState.errors.role.message}
                            </p>
                        )}
                    </div>

                    {Object.keys(permissionGroups).length > 0 && (
                        <div className="space-y-3">
                            <Label>Permissions</Label>
                            <div className="space-y-4 max-h-64 overflow-y-auto rounded-md border p-3">
                                {Object.entries(permissionGroups).map(([group, perms]) => {
                                    const groupPerms = perms.map((p) => p.permission)
                                    const allSelected = groupPerms.every((p) =>
                                        selectedPermissions.includes(p),
                                    )
                                    return (
                                        <div key={group}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-medium capitalize text-sm">
                                                    {group}
                                                </span>
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={() => toggleGroup(group)}
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    Select all
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map((perm) => (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            checked={selectedPermissions.includes(
                                                                perm.permission,
                                                            )}
                                                            onCheckedChange={() =>
                                                                togglePermission(perm.permission)
                                                            }
                                                        />
                                                        <span className="text-sm">
                                                            {perm.permission}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" form="invite-user-form" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            "Send invite"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
