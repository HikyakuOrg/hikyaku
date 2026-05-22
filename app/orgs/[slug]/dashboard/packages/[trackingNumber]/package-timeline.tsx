import { PackageStatus } from "@/app/models/package-status";
import { ProgressTracker } from "@/components/tool-ui/progress-tracker";
import { format } from "date-fns"


interface PackageStatusTimeline {
    id: string
    label: string
    createdAt: string
    status: PackageStatus
    statusText: string
}

interface PackageTimelineProps {
    packageStatusTimeline: PackageStatusTimeline[]
}

type StepStatus = "completed" | "in-progress" | "failed" | "pending"

const STEPS: { id: PackageStatus; label: string }[] = [
    { id: "PENDING", label: "Pending" },
    { id: "ASSIGNED", label: "Assigned" },
    { id: "IN_TRANSIT", label: "In Transit" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "FAILED", label: "Failed" }
]

function formatDate(dateString: string) {
    const date = new Date(dateString)
    const formatted = format(date, "dd MMMM yyyy hh:mm a")

    return formatted
}

export default function PackageTimeline({
    packageStatusTimeline,
}: PackageTimelineProps) {
    if (!packageStatusTimeline.length) return null

    const sorted = [...packageStatusTimeline].sort(
        (a, b) =>
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime()
    )

    const last = sorted[sorted.length - 1]
    const lastIndex = STEPS.findIndex((s) => s.id === last.status)

    const statusMap = new Map(
        sorted.map((item) => [item.status, item])
    )

    const computedSteps = STEPS.map((step, index) => {
        const timelineEntry = statusMap.get(step.id)

        const description = timelineEntry
            ? formatDate(timelineEntry.createdAt)
            : ""

        //  Always Pending when size of element is 1
        // if (sorted.length === 1) {
        //     return {
        //         ...step,
        //         description,
        //         status:
        //             step.id === "PENDING"
        //                 ? ("in-progress" as StepStatus)
        //                 : ("pending" as StepStatus),
        //     }
        // }

        // Fails overrides everything
        if (last.status === "FAILED") {
            return {
                ...step,
                description,
                status:
                    index < lastIndex
                        ? ("completed" as StepStatus)
                        : index === lastIndex
                            ? ("failed" as StepStatus)
                            : ("pending" as StepStatus),
            }
        }

        // Delivered
        if (last.status === "DELIVERED") {
            return {
                ...step,
                description,
                status:
                    index <= lastIndex
                        ? ("completed" as StepStatus)
                        : ("pending" as StepStatus),
            }
        }

        // Otherwise in-progress
        return {
            ...step,
            description,
            status:
                index < lastIndex
                    ? ("completed" as StepStatus)
                    : index === lastIndex
                        ? ("in-progress" as StepStatus)
                        : ("pending" as StepStatus),
        }
    })

    return (
        <ProgressTracker
            id="progress-tracker"
            steps={computedSteps}
        />
    )
}
