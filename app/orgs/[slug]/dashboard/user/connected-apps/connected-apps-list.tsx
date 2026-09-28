"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { format, parseISO } from "date-fns"
import {
    ArrowSquareOutIcon,
    CaretRightIcon,
    CheckCircleIcon,
    CheckIcon,
    PlugsConnectedIcon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { revokeConnectedApp, type ConnectedApp } from "@/lib/actions/oauth"
import { cn } from "@/lib/utils"
import { OFFICIAL_APPS, type OfficialApp, type OfficialAppId } from "./official-apps"

// Same wording as the consent screen (app/oauth/consent/page.tsx).
const SCOPE_LABELS: Record<string, string> = {
    openid: "Verify your identity",
    email: "View your email address",
    profile: "View your basic profile info",
    phone: "View your phone number",
}

type AppStatus = "connected" | "not-connected" | "coming-soon"

const SHOP_DOMAIN_FORM_ID = "shop-domain-form"

type Selection = { kind: "official"; id: OfficialAppId } | { kind: "other"; clientId: string }

export function ConnectedAppsList({
    slug,
    officialGrants,
    otherApps,
}: {
    slug: string
    officialGrants: Partial<Record<OfficialAppId, ConnectedApp>>
    otherApps: ConnectedApp[]
}) {
    const [selection, setSelection] = useState<Selection | null>(null)
    const [pendingRevoke, setPendingRevoke] = useState<ConnectedApp | null>(null)
    const [isRevoking, startRevoking] = useTransition()

    // Read from props each render, so a revoke updates the open sheet.
    const selectedOfficial =
        selection?.kind === "official" ? OFFICIAL_APPS.find((app) => app.id === selection.id) : undefined
    const selectedOther =
        selection?.kind === "other" ? otherApps.find((app) => app.clientId === selection.clientId) : undefined

    function confirmRevoke() {
        if (!pendingRevoke) return
        const app = pendingRevoke

        startRevoking(async () => {
            const error = await revokeConnectedApp(slug, app.clientId)
            if (error) {
                toast.error(error)
                return
            }
            setPendingRevoke(null)
            toast.success(`Revoked access for ${app.name}.`)
        })
    }

    return (
        <>
            <section className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Apps by hikyaku</h3>
                <Card className="gap-0 divide-y py-0">
                    {OFFICIAL_APPS.map((app) => (
                        <AppRow
                            key={app.id}
                            logo={<OfficialLogo app={app} />}
                            name={app.name}
                            description={app.tagline}
                            status={officialStatus(app, officialGrants[app.id])}
                            onSelect={() => setSelection({ kind: "official", id: app.id })}
                        />
                    ))}
                </Card>
            </section>

            {otherApps.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Other apps</h3>
                    <Card className="gap-0 divide-y py-0">
                        {otherApps.map((app) => (
                            <AppRow
                                key={app.clientId}
                                logo={<GrantLogo app={app} />}
                                name={app.name}
                                description={app.uri ?? `Authorised ${formatGrantedAt(app.grantedAt)}`}
                                status="connected"
                                onSelect={() => setSelection({ kind: "other", clientId: app.clientId })}
                            />
                        ))}
                    </Card>
                </section>
            )}

            <Sheet
                open={Boolean(selectedOfficial || selectedOther)}
                onOpenChange={(open) => {
                    if (!open) setSelection(null)
                }}
            >
                <SheetContent className="w-full data-[side=right]:sm:max-w-md">
                    {selectedOfficial && (
                        <OfficialAppDetails
                            app={selectedOfficial}
                            grant={officialGrants[selectedOfficial.id]}
                            onRevoke={setPendingRevoke}
                        />
                    )}
                    {selectedOther && <OtherAppDetails app={selectedOther} onRevoke={setPendingRevoke} />}
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={pendingRevoke !== null}
                onOpenChange={(open) => {
                    if (!open && !isRevoking) setPendingRevoke(null)
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke access for {pendingRevoke?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingRevoke?.name} will be signed out everywhere. It needs your
                            approval again to access your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={isRevoking}
                            onClick={confirmRevoke}
                        >
                            {isRevoking ? "Revoking…" : "Revoke access"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

function officialStatus(app: OfficialApp, grant: ConnectedApp | undefined): AppStatus {
    if (grant) return "connected"
    return app.availability === "coming-soon" ? "coming-soon" : "not-connected"
}

function formatGrantedAt(grantedAt: string) {
    return format(parseISO(grantedAt), "d MMM yyyy, h:mm a")
}

function AppRow({
    logo,
    name,
    description,
    status,
    onSelect,
}: {
    logo: ReactNode
    name: string
    description: string
    status: AppStatus
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-center gap-4 px-4 py-4 text-start outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 sm:px-6"
        >
            {logo}
            <div className="min-w-0 flex-1">
                <p className="font-medium">{name}</p>
                <p className="truncate text-sm text-muted-foreground">{description}</p>
            </div>
            <StatusBadge status={status} />
            <CaretRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
    )
}

function StatusBadge({ status }: { status: AppStatus }) {
    if (status === "connected") {
        return (
            <Badge className="h-6 border-emerald-500/30 bg-emerald-500/10 px-2.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircleIcon weight="fill" data-icon="inline-start" />
                Connected
            </Badge>
        )
    }
    if (status === "coming-soon") {
        return (
            <Badge variant="secondary" className="h-6 px-2.5">
                Coming soon
            </Badge>
        )
    }
    return (
        <Badge variant="outline" className="h-6 px-2.5 text-muted-foreground">
            Not connected
        </Badge>
    )
}

function OfficialLogo({ app, size = "default" }: { app: OfficialApp; size?: "default" | "lg" }) {
    const Logo = app.logo
    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-center rounded-lg",
                size === "lg" ? "size-12" : "size-10",
                app.logoClassName,
            )}
        >
            <Logo className={size === "lg" ? "size-7" : "size-6"} />
        </div>
    )
}

function GrantLogo({ app, size = "default" }: { app: ConnectedApp; size?: "default" | "lg" }) {
    const boxClassName = size === "lg" ? "size-12" : "size-10"
    if (app.logoUri) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- Arbitrary third-party client logo; not an allowlistable host for next/image.
            <img
                src={app.logoUri}
                alt=""
                referrerPolicy="no-referrer"
                className={cn("shrink-0 rounded-lg object-contain", boxClassName)}
            />
        )
    }
    return (
        <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted", boxClassName)}>
            <PlugsConnectedIcon className="size-5 text-muted-foreground" />
        </div>
    )
}

function OfficialAppDetails({
    app,
    grant,
    onRevoke,
}: {
    app: OfficialApp
    grant: ConnectedApp | undefined
    onRevoke: (app: ConnectedApp) => void
}) {
    const status = officialStatus(app, grant)

    return (
        <>
            <SheetHeader className="gap-3 border-b p-6">
                <OfficialLogo app={app} size="lg" />
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <SheetTitle className="text-lg font-semibold">{app.name}</SheetTitle>
                        <StatusBadge status={status} />
                    </div>
                    <SheetDescription>{app.tagline}</SheetDescription>
                </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6">
                <p className="text-sm text-muted-foreground">{app.description}</p>

                <DetailSection title="What you can do">
                    <ul className="space-y-2">
                        {app.features.map((feature) => (
                            <li key={feature} className="flex gap-2 text-sm">
                                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </DetailSection>

                {grant ? (
                    <GrantAccess grant={grant} />
                ) : (
                    <DetailSection title="How to connect">
                        <ol className="space-y-3">
                            {app.setupSteps.map((step, index) => (
                                <li key={step} className="flex gap-3 text-sm">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                        {index + 1}
                                    </span>
                                    <span className="text-muted-foreground">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </DetailSection>
                )}

                {!grant && app.shopLoginUrl && <ShopDomainForm loginUrl={app.shopLoginUrl} />}
            </div>

            <SheetFooter className="border-t p-6">
                {grant && (
                    <Button variant="destructive" onClick={() => onRevoke(grant)}>
                        Revoke access
                    </Button>
                )}
                {!grant && app.shopLoginUrl ? (
                    <Button type="submit" form={SHOP_DOMAIN_FORM_ID}>
                        Connect {app.name}
                        <ArrowSquareOutIcon data-icon="inline-end" />
                    </Button>
                ) : app.setupUrl ? (
                    <a
                        href={app.setupUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={buttonVariants({ variant: grant ? "outline" : "default" })}
                    >
                        {grant ? "View setup guide" : `Connect ${app.name}`}
                        <ArrowSquareOutIcon data-icon="inline-end" />
                    </a>
                ) : (
                    !grant && <Button disabled>Coming soon</Button>
                )}
            </SheetFooter>
        </>
    )
}

/** Asks for the shop domain, then opens the Shopify app login. The submit button is in the sheet footer. */
function ShopDomainForm({ loginUrl }: { loginUrl: string }) {
    const [shop, setShop] = useState("")
    const [error, setError] = useState<string | null>(null)

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const domain = normaliseShopDomain(shop)
        if (!domain) {
            setError(shop.trim() ? "Enter a valid myshopify.com domain." : "Enter your shop domain.")
            return
        }
        setError(null)
        const url = new URL(loginUrl)
        url.searchParams.set("shop", domain)
        window.open(url, "_blank", "noopener,noreferrer")
    }

    return (
        <form id={SHOP_DOMAIN_FORM_ID} onSubmit={handleSubmit} noValidate>
            <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="shop-domain">Shop domain</FieldLabel>
                <Input
                    id="shop-domain"
                    name="shop"
                    value={shop}
                    onChange={(event) => {
                        setShop(event.target.value)
                        if (error) setError(null)
                    }}
                    placeholder="my-shop-domain.myshopify.com"
                    autoComplete="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                />
                {error ? (
                    <FieldError>{error}</FieldError>
                ) : (
                    <FieldDescription>
                        Find it in your Shopify admin under Settings, then Domains.
                    </FieldDescription>
                )}
            </Field>
        </form>
    )
}

/**
 * Accepts a store name, a URL or an admin.shopify.com/store/<name> address.
 * Returns the myshopify.com domain, or null.
 */
function normaliseShopDomain(input: string): string | null {
    const value = input.trim().toLowerCase().replace(/^https?:\/\//, "")
    const adminStore = value.match(/^admin\.shopify\.com\/store\/([^/?#]+)/)
    const host = adminStore ? adminStore[1] : value.replace(/[/?#].*$/, "")
    const domain = host.includes(".") ? host : `${host}.myshopify.com`
    return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain) ? domain : null
}

function OtherAppDetails({ app, onRevoke }: { app: ConnectedApp; onRevoke: (app: ConnectedApp) => void }) {
    return (
        <>
            <SheetHeader className="gap-3 border-b p-6">
                <GrantLogo app={app} size="lg" />
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <SheetTitle className="text-lg font-semibold">{app.name}</SheetTitle>
                        <StatusBadge status="connected" />
                    </div>
                    {app.uri ? (
                        <SheetDescription
                            render={
                                <a
                                    href={app.uri}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="break-all underline underline-offset-4 hover:text-foreground"
                                />
                            }
                        >
                            {app.uri}
                        </SheetDescription>
                    ) : (
                        <SheetDescription>A third-party app with access to your account.</SheetDescription>
                    )}
                </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6">
                <GrantAccess grant={app} />
            </div>

            <SheetFooter className="border-t p-6">
                <Button variant="destructive" onClick={() => onRevoke(app)}>
                    Revoke access
                </Button>
            </SheetFooter>
        </>
    )
}

function GrantAccess({ grant }: { grant: ConnectedApp }) {
    return (
        <DetailSection title="Access">
            <p className="text-sm text-muted-foreground">Authorised {formatGrantedAt(grant.grantedAt)}</p>
            {grant.scopes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                    {grant.scopes.map((scope) => (
                        <li key={scope} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="shrink-0">
                                {scope}
                            </Badge>
                            {SCOPE_LABELS[scope] ?? scope}
                        </li>
                    ))}
                </ul>
            )}
        </DetailSection>
    )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h4 className="text-sm font-medium">{title}</h4>
            {children}
        </section>
    )
}
