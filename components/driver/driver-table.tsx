import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { ListDriverDto } from "@/lib/api"
import { DataTable } from "@/components/data-table"

interface DriverTableProps {
    data: ListDriverDto[]
    loading: boolean
    pageSize: number
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    actions: (row: ListDriverDto) => void
    handleDelete?: (rows: ListDriverDto[]) => void
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
    rowSelection?: RowSelectionState,
    additionalColumns?: ColumnDef<ListDriverDto>[]
}

export function DriverTable({
    data,
    loading,
    pageSize,
    page,
    totalPages,
    onPageChange,
    actions,
    handleDelete,
    onRowSelectionChange,
    rowSelection,
    additionalColumns
}: DriverTableProps) {

    const columns: ColumnDef<ListDriverDto>[] = [
        {
            accessorKey: "display_name",
            header: "Name",
            cell: ({ row }) => {
                const driver = row.original

                return (
                    <div className="flex items-center gap-3">
                        {driver.avatar_url && (
                            <img
                                src={driver.avatar_url}
                                alt={driver.display_name}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        )}
                        <span className="font-medium">{driver.display_name}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "phone_number",
            header: "Contact Number",
        },
    ]

    if(additionalColumns){
        columns.push(...additionalColumns)
    }

    return (
        <DataTable
            data={data}
            columns={columns}
            loading={loading}
            pageSize={pageSize}
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            actions={actions}
            handleDelete={handleDelete}
            onRowSelectionChange={onRowSelectionChange}
            rowSelection={rowSelection}
        />
    )
}