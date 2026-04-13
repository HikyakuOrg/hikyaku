
import { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { TableLayout } from "@/components/table-layout"

interface DataTableProps<TData> {
    data: TData[]
    columns: ColumnDef<TData>[]
    loading: boolean
    pageSize: number
    page: number
    totalPages: number
    onPageChange: (page: number) => void
    actions: (row: TData) => void
    handleDelete?: (rows: TData[]) => void
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
    rowSelection?: RowSelectionState
}

export function DataTable<TData>({
    data,
    columns,
    loading,
    pageSize,
    page,
    totalPages,
    onPageChange,
    actions,
    handleDelete,
    onRowSelectionChange,
    rowSelection,
}: DataTableProps<TData>) {

    return (
        <div>
            <TableLayout
                data={data}
                columns={columns}
                loading={loading}
                pageSize={pageSize}
                actions={actions}
                handleDelete={handleDelete}
                onRowSelectionChange={onRowSelectionChange}
                rowSelection={rowSelection}
            />

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                >
                    Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}