import { Button } from "@/components/ui/button";
import { FormData } from "./stepper-form";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrgSlug } from "@/lib/use-org";
import { createPackage, type CreatePackageSuccess } from "@/lib/actions/packages";
import type { AssignmentOutcomeDto, AssignmentOutcomeDtoReasonEnum } from "@/lib/api";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Loader2, Printer, CheckCircle2, Truck, Clock, MapPin, Info } from "lucide-react";
import { PackageLabel, downloadLabelAsPNG } from "@/components/package-label";

/**
 * Why a package was not put on a shift, in the dispatcher's language.
 *
 * An exhaustive Record over the generated union rather than a lookup with a
 * fallback: if the API grows a new reason, this fails the build instead of
 * silently rendering nothing.
 */
const ASSIGNMENT_REASON_COPY: Record<AssignmentOutcomeDtoReasonEnum, string> = {
    no_capacity: "Every shift running today is already full.",
    no_free_driver_vehicle: "No driver and van are free today.",
    shift_allowance_exhausted:
        "This billing period's shift allowance is used up, so no new shift could be opened.",
    no_geocode: "The recipient's address has no map location yet, so it cannot be routed.",
    auto_assign_disabled: "Automatic assignment was turned off for this package.",
    deadline_infeasible: "No shift can reach the recipient before the promised time.",
};

function formatEta(estimatedArrival: string | null): string | null {
    if (!estimatedArrival) return null;
    try {
        return format(parseISO(estimatedArrival), "HH:mm");
    } catch {
        return null;
    }
}

/**
 * The payoff of instant assignment: what happened to the package, right now.
 *
 * Four outcomes, two shapes — assigned (which shift, which stop, what time) and
 * not assigned (why, and what happens next). Never the raw enum.
 */
function AssignmentPanel({
    assignment,
    driverName,
}: {
    assignment: AssignmentOutcomeDto;
    driverName: string | null;
}) {
    const { outcome, shift, reason, evictedPackageIds } = assignment;
    const isAssigned = outcome === "assigned" || outcome === "assigned_new_shift";

    if (isAssigned && shift) {
        const driver = driverName ?? "a driver";
        const eta = formatEta(shift.estimatedArrival);
        return (
            <div className="w-full max-w-md rounded-lg border border-green-600/30 bg-green-600/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 shrink-0 text-green-600" />
                    <div className="space-y-0.5">
                        <p className="font-medium leading-snug">
                            {outcome === "assigned_new_shift"
                                ? `A new shift was opened for ${driver}`
                                : `Assigned to ${driver}'s shift`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {format(parseISO(`${shift.shiftDate}T00:00:00`), "EEEE, d MMMM")}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 pl-8 text-sm">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {/* stopIndex is zero-based; drivers count from one. */}
                        Stop {shift.stopIndex + 1}
                    </span>
                    {eta && (
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            ETA {eta}
                        </span>
                    )}
                </div>

                {evictedPackageIds.length > 0 && (
                    <p className="pl-8 text-xs text-muted-foreground">
                        {evictedPackageIds.length === 1
                            ? "1 package was moved off this shift to make room."
                            : `${evictedPackageIds.length} packages were moved off this shift to make room.`}
                    </p>
                )}

                <p className="pl-8 text-xs text-muted-foreground">
                    The stop order is re-optimised in the background, so the ETA may shift
                    slightly.
                </p>
            </div>
        );
    }

    const isDeferred = outcome === "deferred";
    return (
        <div className="w-full max-w-md rounded-lg border border-amber-600/30 bg-amber-600/5 p-4">
            <div className="flex items-start gap-3">
                {isDeferred ? (
                    <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                ) : (
                    <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="space-y-1">
                    <p className="font-medium leading-snug">
                        {isDeferred ? "Queued — not on a shift yet" : "Not assigned to a shift"}
                    </p>
                    {reason && (
                        <p className="text-sm text-muted-foreground">
                            {ASSIGNMENT_REASON_COPY[reason]}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {isDeferred
                            ? "It joins a shift automatically as soon as one has room, or a dispatcher can place it from Driver Shifts."
                            : "Place it on a shift from Driver Shifts when you are ready."}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function OverviewStep({ onPrev, formData }: {
    onPrev: () => void;
    formData: FormData;
}) {
    const router = useRouter();
    const slug = useOrgSlug();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<CreatePackageSuccess | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleSubmit = async () => {
        if (!formData.packageInfo || !formData.customerInfo || !formData.logisticsAssignment) {
            toast.error("Missing form data. Please complete all steps.");
            return;
        }

        setIsSubmitting(true);
        const { packageInfo, customerInfo, logisticsAssignment } = formData;

        try {
            // One call replaces the four non-atomic table writes this step used to
            // make. `id` is the UUID minted back in the package-info step — it names
            // the Storage folder the photos were dropped into, so it is sent rather
            // than letting the server generate one.
            const response = await createPackage({
                id: packageInfo.packageId,
                warehouseId: logisticsAssignment.warehouseId,
                fromCustomerId: customerInfo.senderId,
                toCustomerId: customerInfo.receiverId,
                trackingNumber: logisticsAssignment.trackingNumber || undefined,
                deliveryNotes: logisticsAssignment.deliveryNotes || undefined,
                // The customer promise, never overwritten by the planner.
                deadlineAt: logisticsAssignment.scheduledArrival || undefined,
                dimensions: {
                    weightKg: packageInfo.weight,
                    lengthCm: packageInfo.length,
                    widthCm: packageInfo.width,
                    heightCm: packageInfo.height,
                },
            });

            if (!response.success) {
                toast.error(response.error);
                return;
            }

            // Creation succeeded even when assignment did not — the outcome decides
            // the tone of the toast, not whether this is an error.
            const { outcome } = response.result.assignment;
            if (outcome === "assigned" || outcome === "assigned_new_shift") {
                toast.success("Package added and assigned to a shift.");
            } else {
                toast.message("Package added. It is queued for a shift.");
            }
            setSubmitted(response);
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(getErrorMessage(error) || "Failed to add package. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted && formData.customerInfo?.receiver) {
        const { package: createdPackage, assignment } = submitted.result;
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="flex justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Package added</h3>
                    <p className="text-muted-foreground">
                        Tracking number{" "}
                        <span className="font-mono">{createdPackage.trackingNumber}</span>
                    </p>
                </div>

                <AssignmentPanel assignment={assignment} driverName={submitted.driverName} />

                <div className="w-full max-w-md">
                    <PackageLabel
                        canvasRef={canvasRef}
                        packageId={createdPackage.id}
                        trackingNumber={createdPackage.trackingNumber}
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
                                downloadLabelAsPNG(canvasRef.current, `label-${createdPackage.trackingNumber}.png`);
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
                                <p className="text-sm"><span className="text-muted-foreground">Deliver By:</span> {format(parseISO(formData.logisticsAssignment.scheduledArrival), "PPP p")}</p>
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
