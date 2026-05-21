import { faker } from "@faker-js/faker"

export function uniqueOrgName(prefix = "Test-Org"): string {
    return `${prefix}-${Date.now()}`
}

export function uniqueSignupEmail(localPrefix = "signup"): string {
    const domain = process.env.RESEND_INBOUND_DOMAIN
    if (!domain) {
        throw new Error("RESEND_INBOUND_DOMAIN not set — required by tests/e2e/helpers/test-data.ts")
    }
    return `${localPrefix}-${Date.now()}-${faker.string.alphanumeric({ length: 6, casing: "lower" })}@${domain}`
}

export type CustomerAddress = {
    address: string
    suburb: string
    state: string
    postcode: string
}

export const CUSTOMER_ADDRESS_FIXTURES: CustomerAddress[] = [
    { address: "2 S Wharf Dr", suburb: "Docklands", state: "VIC", postcode: "3008" },
    { address: "37 Amess St", suburb: "Carlton North", state: "VIC", postcode: "3054" },
    { address: "33 Cardigan Pl", suburb: "Albert Park", state: "VIC", postcode: "3206" },
    { address: "15 Waterfront Way", suburb: "Docklands", state: "VIC", postcode: "3008" },
    { address: "228 Roden St", suburb: "West Melbourne", state: "VIC", postcode: "3003" },
    { address: "650 Lonsdale St", suburb: "Melbourne", state: "VIC", postcode: "3000" },
]

export type RandomCustomer = CustomerAddress & {
    name: string
    phone: string
    country: string
}

export function randomCustomer(address?: CustomerAddress): RandomCustomer {
    const pick = address ?? faker.helpers.arrayElement(CUSTOMER_ADDRESS_FIXTURES)
    return {
        name: faker.person.fullName(),
        phone: "0412345678",
        country: "Australia",
        ...pick,
    }
}
