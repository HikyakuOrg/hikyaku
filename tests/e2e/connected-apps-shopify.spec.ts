import { expect, test } from "@playwright/test"
import { d } from "./helpers/org-url"

test.describe("Connected Apps — Shopify", () => {
    test("asks for the shop domain before opening the Shopify login", async ({ page }) => {
        // Capture the hand-off instead of letting it open a real Shopify tab.
        await page.addInitScript(() => {
            const opened: string[] = []
            ;(window as unknown as { __opened: string[] }).__opened = opened
            window.open = (url?: string | URL) => {
                opened.push(String(url))
                return null
            }
        })
        await page.goto(d("/user/connected-apps"))

        // The official row, not a Shopify grant listed under "Other apps".
        await page.getByRole("button", { name: /^Shopify Turn paid Shopify orders/ }).click()
        const sheet = page.getByRole("dialog")
        await expect(sheet.getByRole("heading", { name: "Shopify" })).toBeVisible()

        const field = sheet.getByLabel("Shop domain")
        const connect = sheet.getByRole("button", { name: "Connect Shopify" })

        await connect.click()
        await expect(sheet.getByText("Enter your shop domain.")).toBeVisible()

        await field.fill("not a shop")
        await connect.click()
        await expect(sheet.getByText("Enter a valid myshopify.com domain.")).toBeVisible()

        await field.fill("https://admin.shopify.com/store/My-Store")
        await connect.click()
        await expect(sheet.getByText(/valid myshopify\.com/)).toHaveCount(0)

        const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)
        expect(opened).toEqual(["https://shopify.hikyaku.org/auth/login?shop=my-store.myshopify.com"])
    })
})
