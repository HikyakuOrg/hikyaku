"use client"

import { useEffect, useState } from "react"
import { TeamMemberDialog } from "./team-member-dialog"
import { TeamTable } from "@/components/team/team-table"
import { getTeamMembers, ListTeamMemberDto } from "@/lib/supabase/team-rpc"

const PAGE_SIZE = 10

export default function TeamPage() {
    const [data, setData] = useState<ListTeamMemberDto[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPage(page)
    }, [page])

    async function fetchPage(pageNumber: number) {
        setLoading(true)
        try {
            const membersResponse = await getTeamMembers(pageNumber, PAGE_SIZE);
            if (membersResponse && membersResponse.length > 0) {
                setData(membersResponse);
                setTotalPages(membersResponse[0].total_pages || 1);
            } else {
                setData([]);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch team members", error);
            setData([]);
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Manage your team members and their roles.
                    </p>
                </div>

                <TeamMemberDialog onMemberAdded={() => fetchPage(page)} />
            </div>

            <TeamTable
                data={data}
                loading={loading}
                pageSize={PAGE_SIZE}
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </div>
    );
}
