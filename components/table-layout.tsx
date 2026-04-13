import { ColumnDef, flexRender, getCoreRowModel, RowSelectionState, useReactTable } from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "./ui/skeleton"
import { Checkbox } from "./ui/checkbox"
import { Button } from "./ui/button"

interface TableLayoutProps<TData> {
    data: TData[]
    columns: ColumnDef<TData>[]
    loading: boolean
    pageSize: number
    actions: (a: TData) => void
    handleDelete?: (a: TData[]) => void
    rowSelection?: RowSelectionState
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
}

export function TableLayout<TData>({ data, columns, loading, pageSize, actions, handleDelete, rowSelection, onRowSelectionChange }: TableLayoutProps<TData>) {

    const isSelectionEnabled =
        rowSelection !== undefined && onRowSelectionChange !== undefined

    const columnsWithSelection: ColumnDef<TData>[] = isSelectionEnabled
        ? [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center"
                    >
                        <Checkbox
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) =>
                                row.toggleSelected(!!value)
                            }
                            aria-label="Select row"
                        />
                    </div>
                ),
                enableSorting: false,
                enableHiding: false,
            },
            ...columns,
        ]
        : columns

    const table = useReactTable({
        data: data || [],
        columns: columnsWithSelection,
        getRowId: (row: any) => row.id,
        state: isSelectionEnabled
            ? { rowSelection }
            : {},
        enableRowSelection: isSelectionEnabled,
        onRowSelectionChange: isSelectionEnabled
            ? onRowSelectionChange
            : undefined,
        getCoreRowModel: getCoreRowModel(),
    })

    const selectedRowModel = table.getSelectedRowModel()
    const selectedRows = selectedRowModel?.rows ?? []
    const selectedCount = selectedRows.length

    function TableSkeletonRows({
        rows,
        columns,
    }: {
        rows: number
        columns: number
    }) {
        return (
            <>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow key={i}>
                        {Array.from({ length: columns }).map((_, j) => (
                            <TableCell key={j}>
                                <Skeleton className="h-4 w-full max-w-[200px]" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </>
        )
    }
    return (
        <div className="rounded-md border bg-background">
            {selectedCount > 0 && (
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">                    
                <p className="text-sm text-muted-foreground">
                    {selectedRows.length} selected
                </p>
                
                { handleDelete != undefined && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(selectedRows.map((r) => r.original))}>
                        Delete
                    </Button>
                )}
                </div>
            )}

            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                            {hg.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <TableSkeletonRows
                            rows={pageSize}
                            columns={columns.length}
                        />
                    ) : data.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className="cursor-pointer hover:bg-muted"
                                onClick={() => actions(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell
                                colSpan={isSelectionEnabled ? columns.length + 1 : columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}