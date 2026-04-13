"use client"

import { ColumnDef } from "@tanstack/react-table"
import { TableLayout } from "@/components/table-layout"
import { Badge } from "@/components/ui/badge"
import { ListTeamMemberDto } from "@/lib/supabase/team-rpc"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TeamTableProps {
    data: ListTeamMemberDto[]
    loading: boolean
    pageSize: number
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    actions?: (row: ListTeamMemberDto) => void
    handleDelete?: (rows: ListTeamMemberDto[]) => void
}

export const columns: ColumnDef<ListTeamMemberDto>[] = [
    {
        accessorKey: "display_name",
        header: "Name",
        cell: ({ row }) => {
            const member = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || ""} />
                        <AvatarFallback>{member.display_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{member.display_name || "Unknown User"}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "phone_number",
        header: "Phone",
        cell: ({ row }) => {
            const phone = row.getValue("phone_number") as string;
            return <div className="text-sm">{phone || "No phone"}</div>
        },
    },
]

export function TeamTable({ data, loading, pageSize, page, totalPages, onPageChange, actions, handleDelete }: TeamTableProps) {
    return (
        <div className="space-y-4">
            <TableLayout
                data={data}
                columns={columns}
                loading={loading}
                pageSize={pageSize}
                actions={actions || (() => { })}
                handleDelete={handleDelete}
            />
            {totalPages > 1 && (
                <div className="flex justify-between items-center text-sm mt-4">
                    <span className="text-muted-foreground">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={page === 1}
                            onClick={() => onPageChange(page - 1)}
                        >
                            Previous
                        </button>
                        <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={page >= totalPages}
                            onClick={() => onPageChange(page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
