import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

// Adds checkout shipping fields to the packages rows Supabase returns, so the
// detail page renders them without a real storefront order.
async function withShipping(page: Page, fields: Record<string, unknown>) {
    await page.route(/\/rest\/v1\/packages\?/, async (route) => {
        const response = await route.fetch()
        const body = await response.json()
        const patch = (row: Record<string, unknown>) => ({ ...row, ...fields })
        // The body changes size and is no longer compressed.
        const headers = { ...response.headers() }
        delete headers["content-length"]
        delete headers["content-encoding"]
        await route.fulfill({
            status: response.status(),
            headers,
            json: Array.isArray(body) ? body.map(patch) : patch(body),
        })
    })
}

async function openFirstPackage(page: Page) {
    await page.goto(d("/packages"))
    const firstRow = page.getByRole("row").nth(1)
    await expect(firstRow).toBeVisible({ timeout: 20_000 })
    const trackingNumber = (await firstRow.getByRole("cell").filter({ hasText: /^[0-9A-Za-z]{12,}$/ }).first().textContent())!.trim()
    await page.goto(d(`/packages/${trackingNumber}`))
}

test.describe("Package detail: order shipping", () => {
    test("shows the checkout rate and the price after discounts", async ({ page }) => {
        await withShipping(page, {
            shipping_service_id: "prod_test",
            shipping_service_name: "Same-day delivery",
            shipping_price_minor: 1250,
            shipping_discounted_price_minor: 1000,
            shipping_currency: "AUD",
            shipping_rate_path: "live",
        })
        await openFirstPackage(page)

        const card = page.getByTestId("order-shipping")
        await expect(card.getByRole("heading", { name: "Order Shipping" })).toBeVisible({ timeout: 20_000 })
        await expect(card.getByText("Same-day delivery")).toBeVisible()
        await expect(card.getByText(/^A?\$10\.00$/)).toBeVisible()
        await expect(card.getByText(/12\.50 before discounts/)).toBeVisible()
    })

    test("hides the card for packages not from a checkout rate", async ({ page }) => {
        await withShipping(page, {
            shipping_service_id: null,
            shipping_service_name: null,
            shipping_price_minor: null,
            shipping_discounted_price_minor: null,
            shipping_currency: null,
            shipping_rate_path: null,
        })
        await openFirstPackage(page)

        await expect(page.getByRole("heading", { name: "Tracking Timeline" })).toBeVisible({ timeout: 20_000 })
        await expect(page.getByTestId("order-shipping")).toHaveCount(0)
    })
})
