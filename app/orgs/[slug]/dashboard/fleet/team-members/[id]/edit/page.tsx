"use client"

import { useParams } from "next/navigation";
import { TeamMemberNameCrumb } from "../../driver-crumb";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CameraIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ListDriverDto } from "@/lib/api";
import { getDriversByIds, updateDriver } from "@/lib/supabase/supabase-rpc";
import { addAvatar } from "@/lib/supabase/storage";
import { getVehicleTypes } from "@/lib/supabase/db";
import { Tables } from "@/lib/supabase/supabase";



export default function DriverPage() {

    const params = useParams()
    const driverId = params.id
    const [driver, setDriver] = useState<Partial<ListDriverDto> | null>(null)
    const [driverName, setDriverName] = useState("")
    const [driverEmail, setDriverEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [license, setLicense] = useState("")
    const [licenseExpiry, setLicenseExpiry] = useState<Date>()
    const selectedDate = driver?.license_expiry
        ? new Date(driver.license_expiry)
        : undefined
    const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined)
    const [vehicleType, setVehicleType] = useState("")
    const [savedVehicleTypes, setSavedVeichletypes] = useState<Tables<'vehicle_type'>[]>([])

    useEffect(() => {
        if (driverId) {
            fetchDriver(driverId.toString())
            fetchVehicleTypes()
        }
    }, [driverId])

    async function fetchDriver(driverId: string) {
        const driverList = await getDriversByIds([driverId])
        if (driverList.length > 0) {
            const driver = driverList[0]
            setDriver(driver)
            setDriverName(driver?.display_name ?? "")
            setDriverEmail(driver?.email ?? "")
            setPhone(driver?.phone_number ?? "")
            setLicense(driver?.driver_license ?? "")
            setLicenseExpiry(driver?.license_expiry ? new Date(driver.license_expiry) : undefined)
        }
    }

    async function fetchVehicleTypes() {
        const vehicleTypes = await getVehicleTypes()
        setSavedVeichletypes(vehicleTypes)
    }

    async function updateDriverDetails(driverId: string | undefined) {
        if (!driverId) {
            return
        }
        let avatarUrl: string | undefined = undefined;

        if (avatarFile) {
            avatarUrl = await addAvatar(driverId, avatarFile)
        }

        const updatedDriverData = {
            displayName: driverName,
            email: driverEmail,
            phone: phone,
            driverLicense: license,
            licenseExpiry: licenseExpiry ? format(licenseExpiry, "yyyy-MM-dd") : undefined,
            avatarUrl,
            vehicleTypeId: savedVehicleTypes.find((v) => v.vehicle_type === vehicleType)?.id,
        };
        const updatedDriver = await updateDriver(driverId, updatedDriverData);

        setAvatarFile(undefined);
        setDriver(updatedDriver)
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
        }
    };

    return (
        <div className="p-6 space-y-6">
            <TeamMemberNameCrumb teamMemberName={driver?.display_name || ""} />
            {driver?.avatar_url ? (
                <div className="relative w-28 h-28">
                    <img
                        src={driver?.avatar_url}
                        alt={driver?.display_name || "Driver Avatar"}
                        className="w-28 h-28 rounded-full object-cover border border-gray-200 shadow-sm"
                    />
                    <Tooltip>
                        <TooltipTrigger>
                            <label className="absolute inset-0 rounded-full bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition flex items-center justify-center text-white text-sm cursor-pointer">
                                Change
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleAvatarUpload(e)}
                                />
                            </label>
                        </TooltipTrigger>
                    </Tooltip>
                </div>
            ) : (
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-500 hover:text-gray-600">
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                        <CameraIcon className="h-6 w-6 mb-1" />
                        <span className="text-sm">Upload</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleAvatarUpload(e)}
                        />
                    </label>
                </div>
            )}

            <div className="space-y-6 max-w-3xl">

                <div className="space-y-2">
                    <Label htmlFor="name">Driver Name</Label>
                    <Input
                        id="name"
                        value={driverName ?? ""}
                        placeholder="Tom Cruise"
                        onChange={(e) => setDriverName(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            value={driverEmail ?? ""}
                            placeholder="tomcruise@whendan.com"
                            onChange={(e) => setDriverEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            value={phone ?? ""}
                            placeholder="8720 6021"
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="license">Driver License</Label>
                        <Input
                            id="license"
                            value={license ?? ""}
                            placeholder="License number"
                            onChange={(e) => setLicense(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="license_expiry">License Expiry</Label>

                        <Popover>
                            <PopoverTrigger className="w-full">
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !licenseExpiry && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {licenseExpiry
                                        ? format(licenseExpiry, "PPP")
                                        : "Select a date"}
                                </Button>
                            </PopoverTrigger>

                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setLicenseExpiry}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="flex pt-2">
                    <Button onClick={() => updateDriverDetails(driverId?.toString())}>
                        Update Driver
                    </Button>
                </div>
            </div>
        </div>
    )
}