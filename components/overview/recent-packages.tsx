import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface PackageData {
    id: string
    tracking_number: string
    from_customer: string
    to_customer: string
    latest_package_status_text: string
    created_at: string
}

interface RecentPackagesProps {
    packages: PackageData[]
    slug: string
}

export function RecentPackages({ packages, slug }: RecentPackagesProps) {
    return (
        <Card className="col-span-1 lg:col-span-3 border-none bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Packages</CardTitle>
                    <p className="text-sm text-muted-foreground">Latest package updates across the network</p>
                </div>
                <Link
                    href={`/orgs/${slug}/dashboard/packages`}
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                    View all <ArrowRight className="h-4 w-4" />
                </Link>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tracking Number</TableHead>
                            <TableHead>Receiver</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {packages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No recent packages found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            packages.map((pkg) => (
                                <TableRow key={pkg.id}>
                                    <TableCell className="font-medium">
                                        {pkg.tracking_number}
                                    </TableCell>
                                    <TableCell>{pkg.to_customer}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={getStatusVariant(pkg.latest_package_status_text)}
                                            className="font-semibold"
                                        >
                                            {pkg.latest_package_status_text}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-sm">
                                        {new Date(pkg.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status.toUpperCase()) {
        case "DELIVERED":
            return "default"
        case "PENDING":
        case "ASSIGNED":
            return "secondary"
        case "FAILED":
            return "destructive"
        default:
            return "outline"
    }
}
