"use client"

import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogCancel, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"
import { addTeamMember, CreateTeamMemberDto } from "@/lib/supabase/team-rpc"

export function TeamMemberDialog({ onMemberAdded }: { onMemberAdded: () => void }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [permissions, setPermissions] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    function handlePermissionChange(perm: string, checked: boolean) {
        if (checked) {
            setPermissions(prev => {
                const next = new Set(prev)
                next.add(perm)
                if (perm === "packages.view") {
                    next.add("drivers.view")
                    next.add("customers.view")
                    next.add("warehouses.view")
                }
                return Array.from(next)
            })
        } else {
            setPermissions(prev => prev.filter(p => p !== perm))
        }
    }

    const permissionModules = ["packages", "drivers", "warehouses", "customers"]
    const permissionActions = ["view", "edit", "delete", "add"]

    function handleSubmit() {
        setLoading(true)
        const member: CreateTeamMemberDto = {
            displayName: name,
            email: email,
            phoneNumber: phone,
            permissions: permissions
        }

        addTeamMember(member).then(() => {
            setLoading(false)
            setOpen(false)
            onMemberAdded()

            // Reset form
            setName("")
            setEmail("")
            setPhone("")
            setPermissions([])
        }).catch(error => {
            console.error("Failed to add team member", error)
            setLoading(false)
            // Error handling could be expanded here
        })
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger>
                <Button>
                    Add Team Member
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Add Team Member</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="john.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number (Optional)</Label>
                            <Input id="phone" placeholder="+1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
                        </div>

                        <div className="space-y-3 pt-2">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
                                {permissionModules.map(module => (
                                    <div key={module} className="space-y-2">
                                        <h4 className="font-semibold capitalize text-sm">{module}</h4>
                                        <div className="flex flex-col gap-2">
                                            {permissionActions.map(action => {
                                                const permKey = `${module}.${action === 'edit' ? 'update' : action}`;
                                                return (
                                                    <div key={permKey} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={permKey}
                                                            checked={permissions.includes(permKey)}
                                                            onCheckedChange={(c) => handlePermissionChange(permKey, c === true)}
                                                            disabled={loading}
                                                        />
                                                        <Label htmlFor={permKey} className="text-xs font-normal capitalize cursor-pointer">
                                                            {action}
                                                        </Label>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <Button onClick={handleSubmit} disabled={loading || !name || !email}>
                        {loading ? 'Adding...' : 'Create Member'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
