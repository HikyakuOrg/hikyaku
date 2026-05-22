import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ColumnDef,
    RowSelectionState,
} from '@tanstack/react-table';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import { VehiclesWithTypes } from '@/lib/supabase/db';
import { Tables } from '@/lib/supabase/supabase';
import { TableLayout } from '@/components/table-layout';


interface FleetTableProps {
    vehicles: VehiclesWithTypes[]; 
    vehicleTypes: Tables<'vehicle_type'>[];
    loading: boolean;
    pageSize: number;
    onPageChange: (page: number) => void;
    vehicleTypeFilter?: string[];
    onVehicleTypeFilterChange?: (filter: string[]) => void;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>
    handleDelete?: (rows: VehiclesWithTypes[]) => void
    actions: (a: VehiclesWithTypes) => void
}

export function FleetTable({
    vehicles,
    vehicleTypes,
    loading,
    pageSize,
    onPageChange,
    vehicleTypeFilter,
    onVehicleTypeFilterChange,
    rowSelection,
    onRowSelectionChange,
    handleDelete,
    actions
}: FleetTableProps) {

    const columns: ColumnDef<VehiclesWithTypes>[] = [
        { accessorKey: 'vehicle_plate', header: 'Plate' },
        { accessorKey: 'vehicle_make', header: 'Make' },
        { accessorKey: 'vehicle_model', header: 'Model' },
        { accessorKey: 'vehicle_year', header: 'Year' },
        { accessorKey: 'vehicle_identification_number', header: 'VIN' },
        {
            accessorKey: 'vehicle_type',
            header: () => (
                <div className="flex items-center gap-2">
                    <span>Type</span>
                    {vehicleTypeFilter && onVehicleTypeFilterChange && (
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${vehicleTypeFilter.length
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                        }`}
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="start" className="w-44">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Filter Vehicle Type</DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />

                                {vehicleTypes.map((vh_type) => (
                                    <DropdownMenuCheckboxItem
                                        key={vh_type.id}
                                        checked={vehicleTypeFilter.includes(vh_type.id)}
                                        onCheckedChange={(checked) => {
                                            const updated = checked
                                                ? [...vehicleTypeFilter, vh_type.id]
                                                : vehicleTypeFilter.filter((s) => s !== vh_type.id);

                                            onVehicleTypeFilterChange(updated)
                                            onPageChange(1);
                                        }}
                                    >
                                        {vh_type.vehicle_type}
                                    </DropdownMenuCheckboxItem>
                                ))}

                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={false}
                                    onClick={() => {
                                        onVehicleTypeFilterChange([])
                                        onPageChange(1);
                                    }}
                                >
                                    Clear
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            ),
            cell: ({ row }) => {
                return (        
                    row.original.vehicle_type?.vehicle_type 
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <TableLayout
                data={vehicles}
                columns={columns}
                loading={loading}
                pageSize={pageSize}
                rowSelection={rowSelection}
                onRowSelectionChange={onRowSelectionChange}
                actions={actions}
                handleDelete={handleDelete}
            />
        </div>
    );
}
