import { Button } from "@/components/ui/button";
import { FormData } from "./stepper-form";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrgSlug } from "@/lib/use-org";
import { createClient } from "@/lib/supabase/client";
import { insertPackage, insertPackageDimension, insertPackageDeliveryWindow } from "@/lib/supabase/db";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2, Printer, CheckCircle2 } from "lucide-react";
import { PackageLabel, downloadLabelAsPNG } from "@/components/package-label";
import { insertPackageTimeline } from "@/lib/supabase/supabase-rpc";


export function OverviewStep({ onPrev, formData }: {
    onPrev: () => void;
    formData: FormData;
}) {
    const router = useRouter();
    const slug = useOrgSlug();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const supabase = createClient();

    const handleSubmit = async () => {
        if (!formData.packageInfo || !formData.customerInfo || !formData.logisticsAssignment) {
            toast.error("Missing form data. Please complete all steps.");
            return;
        }

        setIsSubmitting(true);
        const { packageInfo, customerInfo, logisticsAssignment } = formData;
        const packageId = packageInfo.packageId;

        try {
            await insertPackage(
                packageId,
                customerInfo.senderId,
                customerInfo.receiverId,
                logisticsAssignment.warehouseId,
                logisticsAssignment.trackingNumber,
                logisticsAssignment.deliveryNotes
            );

            const uploadPromises = (packageInfo.files || []).map(file =>
                supabase.storage
                    .from('packages')
                    .upload(`${packageId}/images/received/${file.name}`, file)
            );

            await Promise.all([
                ...uploadPromises,
                insertPackageDimension(
                    packageId,
                    packageInfo.weight,
                    packageInfo.height,
                    packageInfo.length,
                    packageInfo.width
                ),
                insertPackageDeliveryWindow(
                    packageId,
                    logisticsAssignment.scheduledArrival
                ),
                insertPackageTimeline(packageId, "PENDING")
            ]);

            toast.success("Package added successfully!");
            setIsSubmitted(true);
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.message || "Failed to add package. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted && formData.packageInfo && formData.logisticsAssignment && formData.customerInfo?.receiver) {
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Success!</h3>
                    <p className="text-muted-foreground">
                        Package has been added to the database. You can now print the shipping label.
                    </p>
                </div>

                <div className="w-full max-w-md">
                    <PackageLabel
                        canvasRef={canvasRef}
                        packageId={formData.packageInfo.packageId}
                        trackingNumber={formData.logisticsAssignment.trackingNumber || ''}
                        receiver={formData.customerInfo.receiver}
                    />
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        onClick={() => {
                            if (canvasRef.current) {
                                downloadLabelAsPNG(canvasRef.current, `label-${formData.logisticsAssignment?.trackingNumber}.png`);
                            }
                        }}
                    >
                        <Printer className="h-4 w-4" />
                        Print Label
                    </Button>
                    <Button
                        size="lg"
                        onClick={() => router.push(`/orgs/${slug}/dashboard/packages`)}
                    >
                        Done
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                Overview
            </h3>
            <p className="text-muted-foreground mt-2 leading-7">
                Review your package details before submission.
            </p>

            <div className="flex-1 mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Package Details</h4>
                            <p className="font-mono text-sm"><span className="text-muted-foreground">ID:</span> {formData.packageInfo?.packageId}</p>
                            <p className="text-sm"><span className="text-muted-foreground">Weight:</span> {formData.packageInfo?.weight} KG</p>
                            <p className="text-sm">
                                <span className="text-muted-foreground">Size:</span> {formData.packageInfo?.length} × {formData.packageInfo?.width} × {formData.packageInfo?.height} CM
                            </p>
                            {formData.logisticsAssignment?.trackingNumber && (
                                <p className="text-sm"><span className="text-muted-foreground">Tracking Number:</span> {formData.logisticsAssignment.trackingNumber}</p>
                            )}

                            {formData.logisticsAssignment?.scheduledArrival && (
                                <p className="text-sm"><span className="text-muted-foreground">Scheduled Arrival:</span> {format(parseISO(formData.logisticsAssignment.scheduledArrival), "PPP p")}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Sender</h4>
                            <p className="text-sm font-semibold">{formData.customerInfo?.sender?.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{formData.customerInfo?.sender?.customer_address}</p>
                            <p className="text-sm text-muted-foreground">{formData.customerInfo?.sender?.customer_suburb}, {formData.customerInfo?.sender?.customer_postcode}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Warehouse</h4>
                            <p className="text-sm font-semibold">{formData.logisticsAssignment?.warehouse?.warehouse_name}</p>
                            <p className="text-sm text-muted-foreground">{formData.logisticsAssignment?.warehouse?.warehouse_address}</p>
                            <p className="text-sm text-muted-foreground">{formData.logisticsAssignment?.warehouse?.warehouse_city}, {formData.logisticsAssignment?.warehouse?.warehouse_zipcode}</p>
                        </div>

                        <div className="space-y-1">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Receiver</h4>
                            <p className="text-sm font-semibold">{formData.customerInfo?.receiver?.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{formData.customerInfo?.receiver?.customer_address}</p>
                            <p className="text-sm text-muted-foreground">{formData.customerInfo?.receiver?.customer_suburb}, {formData.customerInfo?.receiver?.customer_postcode}</p>
                        </div>
                    </div>
                </div>
                <p className="text-sm">
                    <span className="text-muted-foreground">Delivery Notes:</span> {formData.logisticsAssignment?.deliveryNotes}
                </p>

            </div>

            <div className="mt-auto flex justify-end gap-2 pt-6">
                <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
                    Previous
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit"
                    )}
                </Button>
            </div>
        </div>
    );
}
