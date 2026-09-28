import { expect, test } from "@playwright/test"

import { CUSTOMER_ADDRESS_FIXTURES, randomCustomer } from "./helpers/test-data"
import { d } from "./helpers/org-url"

test.describe("Customer create", () => {
    for (const fixture of CUSTOMER_ADDRESS_FIXTURES) {
        test(`happy path: create customer at ${fixture.address}, ${fixture.suburb}`, async ({ page }) => {
            const customer = randomCustomer(fixture)

            await page.goto(d('/customers'))
            await expect(page).toHaveURL(/\/dashboard\/customers/)

            await page.getByRole("link", { name: /add customer/i }).click()
            await expect(page).toHaveURL(/\/dashboard\/customers\/add$/)

            await page.locator("#customer-name").fill(customer.name)
            await page.locator("#customer-phone").fill(customer.phone)

            // Picking a Pelias suggestion fills suburb, state, country, postcode and coordinates.
            await page.locator("#customer-address").fill(
                `${customer.address}, ${customer.suburb}`
            )

            const suggestion = page
                .getByRole("option")
                .filter({ hasText: new RegExp(customer.suburb, "i") })
                .first()
            await suggestion.click({ timeout: 15_000 })

            await page.getByRole("button", { name: /create customer/i }).click()

            // The service area dialog shows when no area covers the address. Continue past it.
            const createAnyway = page.getByRole("button", { name: /create anyway/i })
            if (await createAnyway.isVisible().catch(() => false)) {
                await createAnyway.click()
            }

            await expect(page).toHaveURL(/\/dashboard\/customers\/[0-9a-f-]{36}/i, {
                timeout: 20_000,
            })

            await page.goto(d('/customers'))
            await expect(page.getByRole("cell", { name: customer.name })).toBeVisible({
                timeout: 10_000,
            })
        })
    }
})
