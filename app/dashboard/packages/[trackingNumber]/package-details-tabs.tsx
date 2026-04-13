import { CategoryCard } from "./category-card"
import { format, parseISO, isValid } from "date-fns"

interface PackageDetailsTabsProps {
    deliveryStatus: string
    packageAttributes: {
        width: number
        length: number
        height: number
        weight: number
    }
    scheduledArrival: string
    driver?: {
        name: string
        contact: string
    }
    recipient: {
        name: string
        address: string
        contact: string
    }
    sender: {
        name: string
        contact: string
    }
}

export function PackageDetailsTabs({ recipient, sender, deliveryStatus, scheduledArrival, packageAttributes, driver }: PackageDetailsTabsProps) {

    type Attribute = {
        label: string
        value: string
    }

    type Category = {
        title: string
        description?: string
        attributes: Attribute[]
    }

    const packageVolume = packageAttributes.length * packageAttributes.width * packageAttributes.height

    let scheduledArrivalDateTime = "Not scheduled"
    if (scheduledArrival) {
        const date = parseISO(scheduledArrival)
        if (isValid(date)) {
            scheduledArrivalDateTime = format(date, "dd MMMM yyyy hh:mm a")
        }
    }

    const deliveryCategories: Category[] = [
        {
            title: "Delivery Info",
            attributes: [
                { label: "Status", value: deliveryStatus },
                { label: "Scheduled Arrival", value: scheduledArrivalDateTime },
                { label: "Package Size", value: `${packageAttributes.length.toFixed(2)} x ${packageAttributes.width.toFixed(2)} x ${packageAttributes.height.toFixed(2)} (${packageVolume.toFixed(2)} cm³)` },
                { label: "Package Weight", value: `${packageAttributes.weight.toFixed(2)} kg` },
            ],
        },
        ...(driver ? [{
            title: "Driver Info",
            attributes: [
                { label: "Driver Name", value: driver.name },
                { label: "Contact", value: driver.contact },
            ],
        }] : []),
        {
            title: "Recipient Info",
            attributes: [
                { label: "Name", value: recipient.name },
                { label: "Contact", value: recipient.contact },
                { label: "Address", value: recipient.address },
            ],
        },
        {
            title: "Sender Info",
            attributes: [
                { label: "Name", value: sender.name },
                { label: "Contact", value: sender.contact },
            ],
        },
    ]


    return (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {deliveryCategories.map((category) => (
                <CategoryCard
                    key={category.title}
                    title={category.title}
                    attributes={category.attributes}
                />
            ))}
        </div>

    )

}
