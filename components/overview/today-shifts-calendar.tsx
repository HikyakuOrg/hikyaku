"use client"

import ShadcnBigCalendar from '@/components/shadcn-big-calendar/shadcn-big-calendar'
import { format, parse, startOfWeek, endOfDay, startOfDay, getDay, differenceInHours } from 'date-fns'
import type { Locale } from 'date-fns'
import * as dateFnsLocales from 'date-fns/locale'
import { dateFnsLocalizer } from 'react-big-calendar'
import { Clock, Package, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useOrgSlug } from '@/lib/use-org'
import { getDeliveryRoutesByDates, DeliveryRouteByDate } from '@/lib/supabase/db'

function resolveLocale(): { tag: string; locale: Locale } {
    try {
        const il = new Intl.Locale(navigator.language)
        const key = il.region ? `${il.language}${il.region}` : il.language
        const locale =
            (dateFnsLocales as Record<string, Locale>)[key] ??
            (dateFnsLocales as Record<string, Locale>)[il.language] ??
            dateFnsLocales.enUS
        return { tag: il.baseName, locale }
    } catch {
        return { tag: 'en-US', locale: dateFnsLocales.enUS }
    }
}

const eventStyleGetter = () => ({
    style: {
        backgroundColor: 'white',
        borderTop: '4px solid #3b82f6',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        borderLeft: '1px solid #e5e7eb',
        color: 'black',
    }
})

function getRouteStartEnd(event: DeliveryRouteByDate) {
    let start: Date | null = null
    let end: Date | null = null
    event.package_assignment.forEach(p => {
        if (p.scheduled_departure) {
            const d = new Date(p.scheduled_departure)
            if (!start || d < start) start = d
        }
        if (p.scheduled_arrival) {
            const a = new Date(p.scheduled_arrival)
            if (!end || a > end) end = a
        }
    })
    return { start, end }
}

function CustomEvent({ event }: { event: DeliveryRouteByDate }) {
    const { start: depDate, end: arrDate } = getRouteStartEnd(event)

    if (!depDate || !arrDate) return <div />

    const hours = differenceInHours(arrDate, depDate)
    const startStr = format(depDate, 'HH:mm')
    const endStr = format(arrDate, 'HH:mm')

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
        </div>
    )
}

function makeLocalizer(tag: string, locale: Locale) {
    return dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { [tag]: locale } })
}

export function TodayShiftsCalendar() {
    const slug = useOrgSlug()
    const today = new Date()
    const [events, setEvents] = useState<DeliveryRouteByDate[]>([])
    const [loading, setLoading] = useState(true)
    const [localizer] = useState(() => {
        if (typeof navigator === 'undefined') return makeLocalizer('en-US', dateFnsLocales.enUS)
        const { tag, locale } = resolveLocale()
        return makeLocalizer(tag, locale)
    })

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            const data = await getDeliveryRoutesByDates(
                startOfDay(today).toISOString(),
                endOfDay(today).toISOString(),
            )

            if (!data) {
                setEvents([])
                setLoading(false)
                return
            }

            setEvents(data)
            setLoading(false)
        }
        fetchEvents()
    }, [])

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                        Today&apos;s Shifts
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                        {format(today, 'EEEE, MMM d')}
                    </span>
                </div>
                <Button variant="ghost" size="sm">
                    <Link href={`/orgs/${slug}/dashboard/driver-shifts`}>View all</Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                        Loading shifts…
                    </div>
                ) : events.length === 0 ? (
                    <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                        No shifts scheduled for today.
                    </div>
                ) : (
                    <div className="h-[400px] px-4 pb-4">
                        <ShadcnBigCalendar
                            localizer={localizer}
                            startAccessor={(event) => getRouteStartEnd(event).start || new Date()}
                            endAccessor={(event) => getRouteStartEnd(event).end || new Date()}
                            events={events}
                            eventPropGetter={eventStyleGetter}
                            components={{
                                event: (props) => <CustomEvent event={props.event} />,
                                toolbar: () => null,
                            }}
                            defaultView="day"
                            views={['day']}
                            date={today}
                            onNavigate={() => {}}
                            style={{ height: '100%' }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
