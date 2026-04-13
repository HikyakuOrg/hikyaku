'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Grid, LayoutList } from 'lucide-react';
import { FleetTable } from './fleet-table';
import { useRouter } from "next/navigation"
import { FleetGrid } from './fleet-grid';
import { getVehiclesByType, getVehicleTypes, VehiclesWithTypes } from '@/lib/supabase/db';
import { Tables } from '@/lib/supabase/supabase';
import { RowSelectionState } from '@tanstack/react-table';


export function FleetInventory() {
    const [view, setView] = useState<'table' | 'grid'>('table');

    const [currentPage, setCurrentPage] = useState(1);
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string[]>([])
    const [vehicles, setVehicles] = useState<VehiclesWithTypes[]>([])
    const [vehicleTypes, setVehicleTypes] = useState<Tables<'vehicle_type'>[]>([])
    const itemsPerPage = 20;
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    useEffect(() => {
        setLoading(true)
        getVehiclesByType(vehicleTypeFilter, currentPage, itemsPerPage).then((data) => {
            setTotalPages(Math.ceil(data.total / itemsPerPage))
            setVehicles(data.data)
            setLoading(false)
        })

    }, [vehicleTypeFilter, currentPage])

    
    useEffect(() => {
        getVehicleTypes().then(setVehicleTypes)
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-end mb-4 gap-2">
                <Button
                    variant={view === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                        setView('table')
                        setVehicleTypeFilter([])
                    }}>
                    <LayoutList className="w-5 h-5" />
                </Button>
                <Button
                    variant={view === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                        setView('grid')
                        setVehicleTypeFilter([])
                    }}>
                    <Grid className="w-5 h-5" />
                </Button>
                <Button onClick={() => router.push("/dashboard/fleet/vehicles/add")}>
                    Add Vehicle
                </Button>
            </div>

            {view === 'grid' && (
                <FleetGrid vehicles={vehicles} />
            )}

            {view === 'table' && (
                <FleetTable 
                    vehicles={vehicles}
                    vehicleTypes={vehicleTypes}
                    loading={loading}
                    pageSize={itemsPerPage}
                    vehicleTypeFilter={vehicleTypeFilter}
                    onPageChange={setCurrentPage}
                    rowSelection={rowSelection}
                    actions={(row) => {
                        
                    }}
                    onRowSelectionChange={setRowSelection}
                    onVehicleTypeFilterChange={(filter) => {
                        setCurrentPage(1)
                        setVehicleTypeFilter(filter)
                    }}                
                />
            )}


            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}>
                    Next
                </Button>
            </div>

        </div>
    );
}
