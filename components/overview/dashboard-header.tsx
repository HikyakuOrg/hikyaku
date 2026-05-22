import { Button } from "@/components/ui/button"
import Link from "next/link"

export function DashboardHeader({ slug }: { slug: string }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back! Here's an overview of your logistics operations.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button>
                    <Link href={`/orgs/${slug}/dashboard/packages/add`}>
                        Add Package
                    </Link>
                </Button>
            </div>
        </div>
    )
}
