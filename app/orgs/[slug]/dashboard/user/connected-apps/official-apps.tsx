import type { ComponentType, SVGProps } from "react"

export type OfficialAppId = "n8n" | "shopify"

/**
 * An integration we build and publish ourselves. Every one of these talks to
 * hikyaku through the OAuth 2.1 server, and the flow always starts inside the
 * other product (n8n's "Connect my account", the Shopify admin), so hikyaku can
 * only point the user there and then show the resulting grant.
 */
export interface OfficialApp {
    id: OfficialAppId
    name: string
    /** One line for the directory row. */
    tagline: string
    description: string
    features: string[]
    /** Shown in the detail sheet until the app is connected. */
    setupSteps: string[]
    setupUrl?: string
    availability: "available" | "coming-soon"
    logo: ComponentType<SVGProps<SVGSVGElement>>
    /** Brand colours for the logo tile. */
    logoClassName: string
}

export const OFFICIAL_APPS: OfficialApp[] = [
    {
        id: "n8n",
        name: "n8n",
        tagline: "Automate workflows from delivery status changes",
        description:
            "Install the hikyaku community node in your n8n instance to trigger workflows the moment a package's status changes, and look up customers and packages from any workflow or AI agent.",
        features: [
            "Start a workflow when a package's delivery status changes",
            "Look up customer and package details inside a workflow",
            "Give an n8n AI Agent tools to answer tracking questions",
        ],
        setupSteps: [
            "In n8n, open Settings, then Community Nodes, and install n8n-nodes-hikyaku.",
            "Add any hikyaku node to a workflow and create a Hikyaku OAuth2 API credential.",
            "Click Connect, sign in to hikyaku and approve access. The app then shows here as connected.",
        ],
        setupUrl: "https://hikyaku.org/docs/plugins/n8n",
        availability: "available",
        logo: N8nLogo,
        logoClassName: "bg-[#EA4B71] text-white",
    },
    {
        id: "shopify",
        name: "Shopify",
        tagline: "Turn paid Shopify orders into hikyaku packages",
        description:
            "The Hikyaku Connect app for Shopify creates packages in hikyaku as soon as an order is paid, so your store's orders flow straight into dispatch.",
        features: [
            "Create a package for every paid order",
            "Carry the customer's name, address and contact details across",
        ],
        setupSteps: [
            "Install Hikyaku Connect in your Shopify admin.",
            "Open the app and click Connect your Hikyaku account.",
            "Sign in to hikyaku and approve access. The app then shows here as connected.",
        ],
        availability: "coming-soon",
        logo: ShopifyLogo,
        logoClassName: "bg-[#95BF47] text-white",
    },
]

// Brand marks from Simple Icons (CC0).

function N8nLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632" />
        </svg>
    )
}

function ShopifyLogo(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" />
        </svg>
    )
}
