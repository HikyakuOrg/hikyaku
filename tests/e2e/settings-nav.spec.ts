import { expect, test } from "@playwright/test"
import { d } from "./helpers/org-url"

test.describe("Settings — side navigation", () => {
    test("account page shows Settings layout with side nav", async ({ page }) => {
        await page.goto(d('/user/account'))

        await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
        const nav = page.locator("aside")
        await expect(nav.getByRole("link", { name: "Account" })).toHaveAttribute("aria-current", "page")
        await expect(nav.getByRole("link", { name: "Connected Apps" })).toBeVisible()
        await expect(page.locator("#display-name")).toBeVisible()
    })

    // Business Information is company-only. The test org is a company, so the
    // link is present; personal orgs get neither the link nor the page.
    test("side nav navigates to Business Information", async ({ page }) => {
        await page.goto(d('/user/account'))

        await page.getByRole("link", { name: "Business Information" }).click()
        await expect(page).toHaveURL(d('/user/business'))
        await expect(
            page.locator("aside").getByRole("link", { name: "Business Information" }),
        ).toHaveAttribute("aria-current", "page")
        await expect(
            page.getByRole("heading", { name: "Business Information" }),
        ).toBeVisible()
        // The account-type switcher is gone — type is fixed at org creation.
        await expect(page.getByRole("tab", { name: "Personal" })).toHaveCount(0)
        await expect(page.getByRole("tab", { name: "Company" })).toHaveCount(0)
    })

    test("/dashboard/user redirects to the account section", async ({ page }) => {
        await page.goto(d('/user'))
        await expect(page).toHaveURL(d('/user/account'))
    })
})
