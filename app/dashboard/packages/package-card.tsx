import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Packages } from "@/app/models/packages";
import { PackageIcon } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function PackageCard({ packageProps, onClick }: { packageProps: Packages, onClick: () => void }) {
    return (
        <Card className="p-4 hover:shadow-md transition cursor-pointer" onClick={onClick}>
            <div className="flex items-start justify-between">
                <PackageIcon size={24} />
                { packageProps.status == "Delivered" && (
                    <Badge className="bg-green-500 text-white">{packageProps.status}</Badge>
                )}
                { packageProps.status == "Pending" && (
                    <Badge variant="secondary">{packageProps.status}</Badge>
                )}
                { packageProps.status == "Failed" && (
                    <Badge variant="destructive">{packageProps.status}</Badge>
                )}
            </div>


            <div className="mt-4 space-y-2">
                <div className="px-2">
                    <div className="relative flex items-center">
                        { packageProps.status == "Failed" ? (
                            <div className="h-3 w-3 rounded-full bg-red-500 z-10" />
                        ) : (
                            <div className="h-3 w-3 rounded-full bg-primary z-10" />
                        )}

                        <div className="flex-1 h-[2px] bg-border mx-2 relative">
                            {packageProps.status == "Delivered" && (
                                <div
                                    className="absolute left-0 top-0 h-[2px] bg-primary"
                                    style={{ width: "100%" }}
                                />
                            )}
                        </div>

                        <div className="h-3 w-3 rounded-full bg-muted-foreground z-10" />
                    </div>
                </div>

                <div className="flex justify-between text-sm text-muted-foreground px-2">
                    <span className="truncate max-w-[45%] text-left">
                        {packageProps.fromAddress}
                    </span>

                    <span className="truncate max-w-[45%] text-right">
                        {packageProps.toAddress}
                    </span>
                </div>
            </div>
            {/* {packageProps.driverDetails.driverName && (
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <Avatar>
                            <AvatarImage src={packageProps.driverDetails.driverAvatarUrl} />
                            <AvatarFallback>
                                {packageProps.driverDetails.driverName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                            {packageProps.driverDetails.driverName}
                        </span>
                    </div>
                </div>
            )} */}

        </Card>
    )
}