import { PackagesTable } from "./packages-table";


export default async function PackagePage(){


    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Packages</h1>
                <p className="text-muted-foreground">
                    Manage your packages.
                </p>
            </div>
            <PackagesTable />
        </div>
    )
}