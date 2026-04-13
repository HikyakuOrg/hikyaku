"use client"

import ShadcnBigCalendar from '@/components/shadcn-big-calendar/shadcn-big-calendar'
import { format, parse, startOfWeek, endOfWeek, getDay, differenceInHours } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { dateFnsLocalizer } from 'react-big-calendar'
import { ChevronLeft, ChevronRight, Clock, Package } from 'lucide-react'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getDeliveryRoutesByDates, DeliveryRouteByDate } from '@/lib/supabase/db'
import { getDriversByIds } from '@/lib/supabase/supabase-rpc'


export function DriverShiftsCalendar() {
    const router = useRouter()
    const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
    const [endDate, setEndDate] = useState(endOfWeek(new Date(), { weekStartsOn: 0 }))
    const [events, setEvents] = useState<DeliveryRouteByDate[]>([])
    const [drivers, setDrivers] = useState<Record<string, any>>({})

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
            const data = await getDeliveryRoutesByDates(startDate.toISOString(), endDate.toISOString())
            if (!data) return;
            setEvents(data)

            const driverIds = new Set<string>();
            data.forEach(route => {
                route.package_assignment.forEach(p => {
                    if (p.driver_id) driverIds.add(p.driver_id);
                });
            });

            if (driverIds.size > 0) {
                try {
                    const fetchedDrivers = await getDriversByIds(Array.from(driverIds));
                    const driversMap = fetchedDrivers.reduce((acc: Record<string, any>, d: any) => {
                        acc[d.id] = d;
                        return acc;
                    }, {});
                    setDrivers(driversMap);
                } catch (e) {
                    console.error('Failed to fetch drivers', e);
                }
            }
        }
        fetchEvents()
    }, [startDate, endDate])

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


    const eventStyleGetter = (event: any) => {
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

    const getRouteStartEnd = (event: DeliveryRouteByDate) => {
        let start: Date | null = null;
        let end: Date | null = null;
        event.package_assignment.forEach(p => {
            if (p.scheduled_departure) {
                const d = new Date(p.scheduled_departure);
                if (!start || d < start) start = d;
            }
            if (p.scheduled_arrival) {
                const a = new Date(p.scheduled_arrival);
                if (!end || a > end) end = a;
            }
        });
        return { start, end };
    }

    const CustomEvent = ({ event }: { event: DeliveryRouteByDate }) => {
        const { start: depDate, end: arrDate } = getRouteStartEnd(event);
        
        if (!depDate || !arrDate) {
            return (
                <div></div>
            )
        }

        const hours = differenceInHours(arrDate, depDate);
        const startStr = format(depDate, 'HH:mm');
        const endStr = format(arrDate, 'HH:mm');

        const driverId = event.package_assignment[0]?.driver_id;
        const driverAvatar = driverId ? (drivers[driverId]?.avatarUrl || drivers[driverId]?.avatar_url) : null;

        return (
            <div className="flex flex-col h-full p-1 gap-1 text-black">
                <div className="text-xs font-semibold">{startStr} - {endStr}</div>
                <div className="flex items-center text-xs text-gray-600">
                    <Clock className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{hours} hours</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                    <Package className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{event.package_assignment.length} packages</span>
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
        <ShadcnBigCalendar
            localizer={localizer}
            startAccessor={(event) => getRouteStartEnd(event).start || new Date()}
            endAccessor={(event) => getRouteStartEnd(event).end || new Date()}
            events={events}
            onRangeChange={onRangeChange}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={(event) => {
                const routeId = event.route_id;
                if (routeId) {
                    router.push(`/dashboard/driver-shifts/${routeId}`);
                }
            }}
            components={{
                event: CustomEvent
            }}
            defaultView="week"
            views={['week']}
            messages={{
                previous: <ChevronLeft className="w-4 h-4" />,
                next: <ChevronRight className="w-4 h-4" />,
            }}
        />
    )
}