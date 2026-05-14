"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TeamMemberTable } from "@/components/team-member/team-member-table"
import { ListTeamMemberDto, getTeamMembers } from "@/lib/supabase/team-rpc"

const PAGE_SIZE = 10

interface TeamMembersListProps {
    canAdd: boolean
    canEdit: boolean
    canDelete: boolean
    roles: string[]
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
    Manager: "Managers have access to the entire organisation. They can edit and manage all project and organisation settings, manage members as well as security settings.",
    Driver: "Drivers can access delivery and route information assigned to them. They cannot edit organisation settings or manage other team members.",
    Dispatcher: "Dispatchers can manage package assignments and driver shifts. However, they cannot edit organisation settings or manage billing.",
}

export function TeamMembersList({ canAdd, canEdit, canDelete, roles }: TeamMembersListProps) {
    const router = useRouter()

    const [data, setData] = useState<ListTeamMemberDto[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")

    // Debounce search input by 300ms
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(t)
    }, [search])

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1)
    }, [debouncedSearch])

    const fetchPage = useCallback(async (p: number, q: string) => {
        setLoading(true)
        try {
            const members = await getTeamMembers(p, PAGE_SIZE, q || undefined)
            setData(members)
            setTotalPages(members[0]?.total_pages ?? 1)
        } catch {
            setData([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPage(page, debouncedSearch)
    }, [page, debouncedSearch, fetchPage])

    function handleDataChange() {
        fetchPage(page, debouncedSearch)
    }

    return (
        <div className="flex gap-6 p-6">
            {/* Main content */}
            <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
                        <p className="text-muted-foreground">Manage your team members.</p>
                    </div>
                    {canAdd && (
                        <Button
                            onClick={() => router.push("/dashboard/fleet/team-members/add")}
                            data-testid="add-member-btn"
                            className="cursor-pointer"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add member
                        </Button>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9 border-primary focus:ring-primary"
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        data-testid="team-members-search-input"
                    />
                </div>

                <TeamMemberTable
                    data={data}
                    loading={loading}
                    pageSize={PAGE_SIZE}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    actions={(row) => router.push(`/dashboard/fleet/team-members/${row.id}`)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    roles={roles}
                    onDataChange={handleDataChange}
                />
            </div>

            <aside
                className="w-72 shrink-0 space-y-5 rounded-lg border p-5 self-start"
                data-testid="access-control-sidebar"
            >
                <div>
                    <h2 className="text-base font-semibold">Access control</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage team members of your organisation and set their access level.
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Learn more about role based access control in our{" "}<a
                            href="https://docs.whendan.com/docs/security-and-access"
                            target="_blank"
                            className="text-primary underline"
                        >
                            documentation
                        </a>.
                    </p>
                </div>
            </aside>
        </div>
    )
}
