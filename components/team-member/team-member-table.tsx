"use client"

import { useState, useTransition } from "react"
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { ListTeamMemberDto } from "@/lib/supabase/team-rpc"
import { updateTeamMemberRole, deleteTeamMembers } from "@/lib/actions/team-members"
import { toast } from "sonner"

interface TeamMemberTableProps {
    data: ListTeamMemberDto[]
    loading: boolean
    pageSize: number
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    actions: (row: ListTeamMemberDto) => void
    canEdit: boolean
    canDelete: boolean
    roles: string[]
    onDataChange?: () => void
}

function RoleCell({
    member,
    roles,
    canEdit,
    onRoleChanged,
}: {
    member: ListTeamMemberDto
    roles: string[]
    canEdit: boolean
    onRoleChanged?: () => void
}) {
    const [isPending, startTransition] = useTransition()
    const [currentRole, setCurrentRole] = useState(member.role)

    function handleRoleChange(newRole: string | null) {
        if (!newRole) return
        const prev = currentRole
        setCurrentRole(newRole)
        startTransition(async () => {
            const result = await updateTeamMemberRole(member.id, newRole)
            if (!result.success) {
                setCurrentRole(prev)
                toast.error(result.error)
            } else {
                onRoleChanged?.()
            }
        })
    }

    if (!canEdit) {
        return <span className="text-sm">{currentRole}</span>
    }

    return (
        <Select
            value={currentRole}
            onValueChange={handleRoleChange}
            disabled={isPending}
        >
            <SelectTrigger
                className="h-8 w-36 border border-primary bg-muted text-foreground shadow-sm"
                data-testid={`team-member-role-select-${member.id}`}
                onClick={(e) => e.stopPropagation()}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent onClick={(e) => e.stopPropagation()}>
                {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                        {r}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export function TeamMemberTable({
    data,
    loading,
    pageSize,
    page,
    totalPages,
    onPageChange,
    actions,
    canEdit,
    canDelete,
    roles,
    onDataChange,
}: TeamMemberTableProps) {
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [, startTransition] = useTransition()

    function handleDelete(members: ListTeamMemberDto[]) {
        const deletable = members.filter((m) => !m.is_admin)
        const skipped = members.length - deletable.length
        if (skipped > 0) {
            toast.warning(`${skipped} admin account(s) cannot be removed`)
        }
        if (deletable.length === 0) return
        const ids = deletable.map((m) => m.id)
        startTransition(async () => {
            const result = await deleteTeamMembers(ids)
            if (!result.success) {
                toast.error(result.error)
            } else {
                if (result.failed.length > 0) {
                    toast.error(`Failed to remove ${result.failed.length} member(s)`)
                } else {
                    toast.success(`${ids.length} member(s) removed`)
                    setRowSelection({})
                    onDataChange?.()
                }
            }
        })
    }

    const columns: ColumnDef<ListTeamMemberDto>[] = [
        {
            accessorKey: "display_name",
            header: "Name",
            cell: ({ row }) => {
                const member = row.original
                const initials = (member.display_name ?? member.email)
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()

                return (
                    <div className="flex items-center gap-3">
                        <Avatar size="sm">
                            <AvatarImage src={member.avatar_url ?? undefined} alt={member.display_name} />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-medium leading-tight">{member.display_name}</span>
                            {!member.email_confirmed_at && (
                                <Badge
                                    variant="outline"
                                    className="mt-0.5 w-fit text-[10px]"
                                    data-testid={`team-member-pending-badge-${member.id}`}
                                >
                                    Invitation pending
                                </Badge>
                            )}
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            id: "role",
            header: "Role",
            cell: ({ row }) => (
                <RoleCell
                    member={row.original}
                    roles={roles}
                    canEdit={canEdit}
                    onRoleChanged={onDataChange}
                />
            ),
        },
    ]

    return (
        <div data-testid="team-members-table">
            <DataTable
                data={data}
                columns={columns}
                loading={loading}
                pageSize={pageSize}
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                actions={actions}
                rowSelection={canDelete ? rowSelection : undefined}
                onRowSelectionChange={canDelete ? setRowSelection : undefined}
                handleDelete={canDelete ? handleDelete : undefined}
                isRowSelectable={canDelete ? (row: ListTeamMemberDto) => !row.is_admin : undefined}
            />
        </div>
    )
}
