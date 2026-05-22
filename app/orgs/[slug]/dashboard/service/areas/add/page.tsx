import { ServiceAreaAddForm } from "./service-area-add-form"

export default function AddServiceAreaPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Add Service Area</h1>
                <p className="text-muted-foreground">
                    Name a service area and define its coverage on the map.
                </p>
            </div>

            <ServiceAreaAddForm />
        </div>
    )
}