"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addDriver } from "@/lib/supabase/supabase-rpc"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CameraIcon, CalendarIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CreateDriverDto } from "@/lib/api"
import PhoneInput, { getCountries } from "react-phone-number-input"
import "react-phone-number-input/style.css"
import flags from "react-phone-number-input/flags"

export default function AddDriverPage() {
    const router = useRouter()
    const [driverName, setDriverName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [license, setLicense] = useState("")
    const [licenseExpiry, setLicenseExpiry] = useState<Date>()
    const [loading, setLoading] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | undefined>(undefined)

    function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
        }
    }

    async function handleSubmit(e: { preventDefault: () => void }) {
        e.preventDefault()
        setLoading(true)
        const licenseEx = licenseExpiry ? format(licenseExpiry, "yyyy-MM-dd") : null
        const driver: CreateDriverDto = {
            displayName: driverName,
            email: email,
            phoneNumber: phone,
            driverLicense: license,
            licenseExpiry: licenseEx,
            file: avatarFile
        }
        try {
            await addDriver(driver)
            toast.success("Driver added successfully")
            router.push("/dashboard/fleet/drivers")
        } catch (error: any) {
            toast.error(error.message || "Failed to add driver")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Add New Driver</h1>
                <p className="text-muted-foreground">Register a new driver for your fleet.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 cursor-pointer hover:border-gray-500 hover:text-gray-600">
                        <label className="flex flex-col items-center justify-center cursor-pointer">
                            <CameraIcon className="h-6 w-6 mb-1" />
                            <span className="text-sm">Upload</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </label>
                    </div>
                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Driver Name</Label>
                            <Input id="name" placeholder="Tom Cruise" value={driverName} onChange={e => setDriverName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" placeholder="tomcruise@whendan.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <PhoneInput
                                id="phone"
                                placeholder="Enter phone number"
                                value={phone}
                                onChange={(e) => setPhone(e ?? "")}
                                flags={flags}
                                defaultCountry="AU"
                                className={cn(
                                    "dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground"
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license">Driver License</Label>
                            <Input id="license" placeholder="License number" value={license} onChange={e => setLicense(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="license_expiry">License Expiry</Label>
                            <Popover>
                                <PopoverTrigger className="w-full">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !licenseExpiry && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {licenseExpiry ? format(licenseExpiry, "PPP") : "Select a date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={licenseExpiry}
                                        onSelect={setLicenseExpiry}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" type="button" onClick={() => router.push("/dashboard/fleet/drivers")}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Create Driver"}</Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
