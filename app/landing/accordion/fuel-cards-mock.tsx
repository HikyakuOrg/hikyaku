"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

const MOCK_CARDS = [
    { last4: "4242", status: "active",   currency: "USD", limit: "$150.00",  interval: "Daily",   issued: "Jun 1, 2026" },
    { last4: "5555", status: "active",   currency: "USD", limit: "$200.00",  interval: "Daily",   issued: "May 28, 2026" },
    { last4: "1234", status: "inactive", currency: "USD", limit: "No limit", interval: "—",       issued: "May 20, 2026" },
]

const MOCK_TRANSACTIONS = [
    { date: "Jun 2, 2026, 09:14 AM", merchant: "BP Service Station", location: "Brisbane, AU", category: "Fuel", type: "capture", amount: "$67.50" },
    { date: "Jun 1, 2026, 03:41 PM", merchant: "Shell Express",       location: "Sydney, AU",   category: "Fuel", type: "capture", amount: "$89.20" },
    { date: "May 31, 2026, 08:55 AM", merchant: "Caltex Woolworths",  location: "Perth, AU",    category: "Fuel", type: "capture", amount: "$54.80" },
]

function StatusBadge({ status }: { status: string }) {
    if (status === "active")   return <Badge variant="default">Active</Badge>
    if (status === "inactive") return <Badge variant="secondary">Frozen</Badge>
    return <Badge variant="destructive">Canceled</Badge>
}

export function FuelCardsMock() {
    const [tab, setTab] = useState("cards")

    return (
        <div className="space-y-4">
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="cards">Cards ({MOCK_CARDS.length})</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions ({MOCK_TRANSACTIONS.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="cards" className="mt-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Card</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Spend limit</TableHead>
                                    <TableHead>Issued</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MOCK_CARDS.map((card) => (
                                    <TableRow key={card.last4}>
                                        <TableCell className="font-mono">•••• {card.last4}</TableCell>
                                        <TableCell><StatusBadge status={card.status} /></TableCell>
                                        <TableCell>{card.limit}</TableCell>
                                        <TableCell>{card.issued}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                {card.status === "active" && (
                                                    <Button size="sm" variant="outline" disabled>Freeze</Button>
                                                )}
                                                {card.status === "inactive" && (
                                                    <Button size="sm" variant="outline" disabled>Unfreeze</Button>
                                                )}
                                                {card.status !== "canceled" && (
                                                    <Button size="sm" variant="destructive" disabled>Cancel</Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="mt-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Merchant</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MOCK_TRANSACTIONS.map((txn, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="whitespace-nowrap text-sm">{txn.date}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{txn.merchant}</div>
                                            <div className="text-xs text-muted-foreground">{txn.location}</div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{txn.category}</TableCell>
                                        <TableCell>
                                            {txn.type === "refund"
                                                ? <Badge variant="secondary">Refund</Badge>
                                                : <Badge variant="outline">Capture</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {txn.type === "refund" && <span className="text-green-600">+</span>}
                                            {txn.amount}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
