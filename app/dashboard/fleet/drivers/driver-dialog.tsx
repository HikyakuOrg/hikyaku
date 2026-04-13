import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, CameraIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { CreateDriverDto } from "@/lib/api"
import { addDriver } from "@/lib/supabase/supabase-rpc"

export function DriverDialog() {


    const [open, setOpen] = useState(false)
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

    function handleSubmit() {
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
        addDriver(driver).then(result => {
            setLoading(false)
            setOpen(false)
        }).catch(error => {
            // TODO: Add error handling. Works for now... 
        })
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger>
                <Button>
                    Add Driver
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>Add Driver</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="flex flex-col items-center gap-6">
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

                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Driver Name</Label>
                            <Input id="name" placeholder="Tom Cruise" onChange={(e) => setDriverName(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" placeholder="tomcruise@whendan.com" onChange={(e) => setEmail(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" placeholder="8720 6021" onChange={(e) => setPhone(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="license">Driver License</Label>
                            <Input id="license" placeholder="License number" onChange={(e) => setLicense(e.target.value)} />
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
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit}>Create Driver</Button>
                        </div>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}