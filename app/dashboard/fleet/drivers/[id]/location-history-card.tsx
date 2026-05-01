"use client"

import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Pause, Play, RotateCcw } from "lucide-react"
import { getDriverLocationHistory } from "@/lib/supabase/supabase-rpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import LocationHistoryMap, { HistoryPoint } from "./location-history-map"

interface Props {
    driverId: string
}

function DateTimePicker({
    label,
    date,
    time,
    onDateChange,
    onTimeChange,
}: {
    label: string
    date: Date | undefined
    time: string
    onDateChange: (d: Date | undefined) => void
    onTimeChange: (t: string) => void
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <Popover>
                {/* Use render prop so PopoverTrigger adopts the Button element
                    directly — avoids an invalid nested <button><button> */}
                <PopoverTrigger
                    render={
                        <Button
                            variant="outline"
                            className={cn(
                                "w-52 justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                    }
                />
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={onDateChange} />
                    <div className="border-t px-3 pb-3 pt-2">
                        <span className="text-xs text-muted-foreground">Time</span>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => onTimeChange(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

function useLocationPlayback(pointCount: number) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (!isPlaying) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return
        }

        intervalRef.current = setInterval(() => {
            setCurrentIndex((prev) => {
                if (prev >= pointCount - 1) {
                    setIsPlaying(false)
                    return prev
                }
                return prev + 1
            })
        }, 500)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [isPlaying, pointCount])

    // Reset to 0 if already at the end so Play restarts from the beginning
    const play = () => {
        setCurrentIndex((prev) => (prev >= pointCount - 1 ? 0 : prev))
        setIsPlaying(true)
    }
    const pause = () => setIsPlaying(false)
    // pause + seek — used by both slider drag and (optionally) external callers
    const scrub = (index: number) => {
        setIsPlaying(false)
        setCurrentIndex(index)
    }
    const reset = () => {
        setIsPlaying(false)
        setCurrentIndex(0)
    }

    return { currentIndex, isPlaying, play, pause, scrub, reset }
}

export default function LocationHistoryCard({ driverId }: Props) {
    const [fromDate, setFromDate] = useState<Date | undefined>()
    const [fromTime, setFromTime] = useState("00:00")
    const [toDate, setToDate] = useState<Date | undefined>()
    const [toTime, setToTime] = useState("23:59")

    const [points, setPoints] = useState<HistoryPoint[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const { currentIndex, isPlaying, play, pause, scrub, reset } =
        useLocationPlayback(points.length)

    async function loadHistory() {
        if (!fromDate || !toDate) return

        const fromISO = `${format(fromDate, "yyyy-MM-dd")}T${fromTime}:00`
        const toISO = `${format(toDate, "yyyy-MM-dd")}T${toTime}:00`

        setLoading(true)
        setError(null)
        setPoints([])
        reset()

        try {
            const data = await getDriverLocationHistory(driverId, fromISO, toISO)
            if (!data || data.length === 0) {
                setError("No location history found for the selected range.")
                return
            }
            setPoints(
                (data.reverse() as { lat: number; lng: number; created_at: string }[]).map(
                    (row) => ({ lat: row.lat, lng: row.lng, created_at: row.created_at })
                )
            )
        } catch (e) {
            console.error(e)
            setError("Failed to fetch location history.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-medium">Location History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Date-time pickers */}
                <div className="flex flex-wrap items-end gap-4">
                    <DateTimePicker
                        label="From"
                        date={fromDate}
                        time={fromTime}
                        onDateChange={setFromDate}
                        onTimeChange={setFromTime}
                    />
                    <DateTimePicker
                        label="To"
                        date={toDate}
                        time={toTime}
                        onDateChange={setToDate}
                        onTimeChange={setToTime}
                    />
                    <Button
                        onClick={loadHistory}
                        disabled={!fromDate || !toDate || loading}
                        className="self-end"
                    >
                        {loading ? "Loading…" : "Load History"}
                    </Button>
                </div>

                {/* Error */}
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                {/* Map + playback */}
                {points.length > 0 && (
                    <div className="space-y-3">
                        {/* Map */}
                        <div className="w-full h-[450px] rounded-md overflow-hidden border">
                            <LocationHistoryMap
                                points={points}
                                currentIndex={currentIndex}
                            />
                        </div>

                        {/* Playback controls */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={isPlaying ? pause : play}
                                aria-label={isPlaying ? "Pause" : currentIndex >= points.length - 1 ? "Restart" : "Play"}
                                data-testid="playback-btn"
                            >
                                {isPlaying ? (
                                    <Pause className="h-4 w-4" />
                                ) : currentIndex >= points.length - 1 ? (
                                    <RotateCcw className="h-4 w-4" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                            </Button>

                            <Slider
                                className="flex-1"
                                min={0}
                                max={points.length - 1}
                                step={1}
                                value={[currentIndex]}
                                // onValueChange only fires on user interaction, not on
                                // programmatic controlled-value updates, so scrub() here
                                // is safe and won't interrupt the playback interval.
                                //
                                // Base UI v1.x inconsistency: pointer/mouse events call
                                // onValueChange with a plain number (SliderControl
                                // treats a single-thumb slider as non-range and passes
                                // the raw computed value). Keyboard events go through
                                // SliderRoot.handleInputChange which wraps the value in
                                // an array. Handle both shapes at runtime.
                                onValueChange={(v) =>
                                    scrub(Array.isArray(v) ? (v as number[])[0] : (v as unknown as number))
                                }
                                data-testid="playback-slider"
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
