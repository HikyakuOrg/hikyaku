import { ServiceRateStepper } from "./service-rate-stepper";

export default function AddServiceRatePage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                    Add Service Rate
                </h1>
                <p className="text-muted-foreground mt-1">
                    Configure a pricing structure for your fleet deliveries.
                </p>
            </div>
            <ServiceRateStepper />
        </div>
    );
}
