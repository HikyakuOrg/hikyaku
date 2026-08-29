"use client"

import ShadcnBigCalendar from '@/components/shadcn-big-calendar/shadcn-big-calendar'
import { format, parse, startOfWeek, endOfWeek, getDay, differenceInHours } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { dateFnsLocalizer } from 'react-big-calendar'
import { ChevronLeft, ChevronRight, Clock, Package } from 'lucide-react'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import type { ToolbarProps } from 'react-big-calendar'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useOrgSlug } from '@/lib/use-org'
import { getShiftsByDates, getShiftStartEnd, type CalendarShift } from '@/lib/supabase/db'
import { getDriversByIds } from '@/lib/supabase/supabase-rpc'
import type { ListDriverDto } from '@/lib/api'
import { SHIFTS_REFRESH_EVENT } from './shift-events'


interface DriverShiftsCalendarProps {
    driverId?: string
    emptyMessage?: string
}


function CalendarToolbar({ label, onNavigate }: ToolbarProps<CalendarShift, object>) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('TODAY')}
                >
                    Today
                </Button>
                <ButtonGroup>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Previous week"
                        onClick={() => onNavigate('PREV')}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Next week"
                        onClick={() => onNavigate('NEXT')}
                    >
                        <ChevronRight />
                    </Button>
                </ButtonGroup>
            </div>
            <span className="text-base font-semibold tracking-tight">{label}</span>
        </div>
    )
}


export function DriverShiftsCalendar({
    driverId,
    emptyMessage = 'No shifts found for the selected period.',
}: DriverShiftsCalendarProps) {
    const router = useRouter()
    const slug = useOrgSlug()
    const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
    const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 0 }))
    const [events, setEvents] = useState<CalendarShift[]>([])
    const [drivers, setDrivers] = useState<Record<string, ListDriverDto>>({})
    // Bumped whenever an external actor (e.g. a completed optimisation run) signals
    // that shifts changed, forcing the fetch effect below to re-run.
    const [refreshTick, setRefreshTick] = useState(0)

    const onRangeChange = (range: Date[] | { start: Date; end: Date }) => {
        if (Array.isArray(range)) {
            setStartDate(range[0])
            setEndDate(range[range.length - 1])
        } else {
            setStartDate(range.start)
            setEndDate(range.end)
        }
    }

    useEffect(() => {
        const fetchEvents = async () => {
            // One indexed query over vrp_optimization. Empty shifts are ordinary
            // rows here, so there is no second source to dedupe against.
            const shifts = await getShiftsByDates(
                startDate.toISOString(),
                endDate.toISOString(),
                driverId,
            )
            setEvents(shifts)

            const driverIds = new Set(
                shifts.map((s) => s.driver_id).filter((id): id is string => !!id),
            )

            if (driverIds.size > 0) {
                try {
                    const fetchedDrivers = await getDriversByIds(Array.from(driverIds));
                    const driversMap = fetchedDrivers.reduce((acc: Record<string, ListDriverDto>, d) => {
                        acc[d.id] = d;
                        return acc;
                    }, {} as Record<string, ListDriverDto>);
                    setDrivers(driversMap);
                } catch (e) {
                    console.error('Failed to fetch drivers', e);
                }
            } else {
                setDrivers({})
            }
        }
        fetchEvents()
    }, [driverId, startDate, endDate, refreshTick])

    // The Optimise-routes button lives in a separate client island and cannot
    // reach this component's state, so it broadcasts a window event on completion.
    // router.refresh() alone won't help — this calendar fetches its data client-side.
    useEffect(() => {
        const handler = () => setRefreshTick((t) => t + 1)
        window.addEventListener(SHIFTS_REFRESH_EVENT, handler)
        return () => window.removeEventListener(SHIFTS_REFRESH_EVENT, handler)
    }, [])

    const locales = {
        'en-US': enUS,
    }


    const localizer = dateFnsLocalizer({
        format,
        parse,
        startOfWeek,
        getDay,
        locales,
    })


    const eventStyleGetter = (_event: CalendarShift) => {
        return {
            style: {
                backgroundColor: 'white',
                borderTop: '4px solid #3b82f6',
                borderRight: '1px solid #e5e7eb',
                borderBottom: '1px solid #e5e7eb',
                borderLeft: '1px solid #e5e7eb',
                color: 'black',
            }
        };
    };

    const CustomEvent = ({ event }: { event: CalendarShift }) => {
        const { start, end } = getShiftStartEnd(event);
        const hours = differenceInHours(end, start);
        const driverAvatar = event.driver_id
            ? (drivers[event.driver_id]?.avatar_url ?? undefined)
            : undefined;

        return (
            <div className="flex flex-col h-full p-1 gap-1 text-black">
                <div className="text-xs font-semibold">
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                </div>
                <div className="flex items-center text-xs text-gray-600">
                    <Clock className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{hours} hours</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                    <Package className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{event.stop_count} packages</span>
                </div>
                <div className="mt-auto pt-2">
                    <Avatar className="w-6 h-6 border bg-white">
                        <AvatarImage src={driverAvatar} />
                    </Avatar>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <ShadcnBigCalendar
                localizer={localizer}
                startAccessor={(event) => getShiftStartEnd(event).start}
                endAccessor={(event) => getShiftStartEnd(event).end}
                events={events}
                onRangeChange={onRangeChange}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => {
                    // The detail page is keyed on the route; a shift that has not
                    // been planned yet has none, so there is nothing to open.
                    if (event.route_id) {
                        router.push(`/orgs/${slug}/dashboard/driver-shifts/${event.route_id}`);
                    }
                }}
                components={{
                    event: CustomEvent,
                    toolbar: CalendarToolbar,
                }}
                defaultView="week"
                views={['week']}
            />

            {events.length === 0 && (
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            )}
        </div>
    )
}
