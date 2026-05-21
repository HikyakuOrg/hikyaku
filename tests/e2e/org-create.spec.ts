import { expect, test } from "@playwright/test"

import { uniqueOrgName } from "./helpers/test-data"

test.describe("Organisation create — happy path + duplicate fail", () => {
    test.describe.configure({ mode: "serial" })

    let orgName = ""

    test("create new org via sidebar dropdown", async ({ page }) => {
        orgName = uniqueOrgName()

        await page.goto("/dashboard")

        // The org switcher is the first SidebarMenuButton in the sidebar header.
        // It exposes the current org name and a "menu" haspopup. Open it.
        const trigger = page.locator('[aria-haspopup="menu"]').first()
        await expect(trigger).toBeVisible()
        await trigger.click()

        const addItem = page.getByRole("menuitem", { name: /new organisation/i })
        await expect(addItem).toBeVisible()
        await addItem.click()

        await expect(page).toHaveURL(/\/dashboard\/new$/)

        await page.locator("#org-name").fill(orgName)
        await page.getByRole("button", { name: /create organization/i }).click()

        // Cross-subdomain redirect to <slug>.lvh.me:3000/dashboard
        await expect(page).toHaveURL(/^https?:\/\/[a-z0-9-]+\.lvh\.me:3000\/dashboard\/?$/i, {
            timeout: 20_000,
        })

        // Reopen the org switcher on the new tenant and verify the new org appears
        await page.locator('[aria-haspopup="menu"]').first().click()
        const newOrgItem = page.getByRole("menuitem", { name: orgName })
        await expect(newOrgItem).toBeVisible()

        // Clicking the (already-current) org should keep us on the same tenant.
        // To prove the URL still points at this slug, capture it before close.
        const currentUrl = page.url()
        await newOrgItem.click()
        await expect(page).toHaveURL(currentUrl)
    })

    test("duplicate org from same user fails", async ({ page }) => {
        test.skip(!orgName, "Depends on previous test creating an org name")

        // Start from the apex (lvh.me:3000) so the org switcher loads against the
        // user's full org list and we hit the same /dashboard/new server action.
        await page.goto("/dashboard")

        await page.locator('[aria-haspopup="menu"]').first().click()
        await page.getByRole("menuitem", { name: /new organisation/i }).click()
        await expect(page).toHaveURL(/\/dashboard\/new$/)

        await page.locator("#org-name").fill(orgName)
        await page.getByRole("button", { name: /create organization/i }).click()

        // The createOrganisation server action returns a string error on failure,
        // which the page renders as a <p class="text-destructive"> near the input.
        const errorParagraph = page.locator("p.text-destructive")
        await expect(errorParagraph).toBeVisible({ timeout: 10_000 })
        await expect(errorParagraph).toHaveText(/duplicate|already|unique|exist/i)

        // URL must NOT have redirected to a tenant subdomain
        await expect(page).toHaveURL(/\/dashboard\/new$/)

        // Open the switcher and assert there's exactly one menu item with `orgName`
        // (a duplicate would show two entries; an insert-failure shows one).
        await page.locator('[aria-haspopup="menu"]').first().click()
        const matches = page.getByRole("menuitem", { name: orgName })
        await expect(matches).toHaveCount(1)
    })
})
