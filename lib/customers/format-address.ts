export interface CustomerAddressLike {
    customer_address: string
    customer_unit?: string | null
    customer_suburb: string
    customer_state: string
    customer_postcode: string
}

/**
 * Address lines for display: the unit (if any), the street, then
 * "suburb, STATE postcode". Blank fields are left out.
 */
export function formatAddressLines(address: CustomerAddressLike): string[] {
    const lines: string[] = []

    const unit = address.customer_unit?.trim()
    if (unit) lines.push(unit)

    if (address.customer_address) lines.push(address.customer_address)

    const region = [address.customer_suburb, address.customer_state].filter(Boolean).join(", ")
    const regionLine = [region, address.customer_postcode].filter(Boolean).join(" ")
    if (regionLine) lines.push(regionLine)

    return lines
}
