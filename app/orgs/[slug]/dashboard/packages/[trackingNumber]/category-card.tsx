'use client'

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"

interface Attribute {
    label: string
    value: string
}

interface CategoryCardProps {
    title: string
    description?: string
    attributes: Attribute[]
}

export function CategoryCard({
    title,
    description,
    attributes,
}: CategoryCardProps) {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </CardHeader>

            <CardContent className="space-y-3">
                {attributes.map((attr, index) => (
                    <div key={attr.label}>
                        <div className="flex justify-between items-start gap-4">
                            <span className="text-sm text-muted-foreground">
                                {attr.label}
                            </span>

                            <span className="text-sm font-medium text-right">
                                {attr.value}
                            </span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
