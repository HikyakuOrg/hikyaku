import { expect, test } from "@playwright/test"

import { CUSTOMER_ADDRESS_FIXTURES, randomCustomer } from "./helpers/test-data"
import { d } from "./helpers/org-url"

test.describe("Customer create", () => {
    for (const fixture of CUSTOMER_ADDRESS_FIXTURES) {
        test(`happy path — create customer at ${fixture.address}, ${fixture.suburb}`, async ({ page }) => {
            const customer = randomCustomer(fixture)

            await page.goto(d('/customers'))
            await expect(page).toHaveURL(/\/dashboard\/customers/)

            await page.getByRole("link", { name: /add customer/i }).click()
            await expect(page).toHaveURL(/\/dashboard\/customers\/add$/)

            await page.locator("#customer-name").fill(customer.name)
            await page.locator("#customer-phone").fill(customer.phone)

            await page.getByRole("combobox").filter({ hasText: /select a country|country/i }).first().click()
            await page.getByRole("option", { name: customer.country }).click()

            await page.locator("#customer-address").fill(customer.address)
            await page.locator("#customer-suburb").fill(customer.suburb)
            await page.locator("#customer-state").fill(customer.state)
            await page.locator("#customer-postcode").fill(customer.postcode)

            await page.getByRole("button", { name: /create customer/i }).click()

            // Service-area dialog may appear if the address falls outside coverage —
            // dismiss it by proceeding anyway so the test is robust to seed data.
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
