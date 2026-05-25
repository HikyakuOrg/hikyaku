import { expect, test } from "@playwright/test"

import { d } from "./helpers/org-url"

type WarehouseFixture = {
    name: string
    address: string
    suburb: string
}

const WAREHOUSE_FIXTURES: WarehouseFixture[] = [
    { name: "Patrick Terminals", address: "2 Phillipps Rd", suburb: "West Melbourne" },
    { name: "World Wide Warehouse", address: "19 Budd St", suburb: "Collingwood" },
    { name: "Preston Warehouse", address: "70 Raglan St", suburb: "Preston" },
]

test.describe("Warehouse add", () => {
    for (const fixture of WAREHOUSE_FIXTURES) {
        test(`happy path — add warehouse "${fixture.name}" at ${fixture.address}, ${fixture.suburb}`, async ({ page }) => {
            await page.goto(d('/service/warehouse/add'))
            await expect(page).toHaveURL(/\/dashboard\/service\/warehouse\/add$/)

            await page.locator("#warehouse-name").fill(fixture.name)
            await page.locator("#warehouse-address").fill(
                `${fixture.address}, ${fixture.suburb}`
            )

            const suggestion = page
                .getByRole("option")
                .filter({ hasText: new RegExp(fixture.suburb, "i") })
                .first()
            await suggestion.click({ timeout: 15_000 })

            await page.getByRole("button", { name: /add warehouse/i }).click()

            await expect(page).toHaveURL(/\/dashboard\/service\/warehouse\/[0-9a-f-]{36}/i, {
                timeout: 20_000,
            })
        })
    }
})
