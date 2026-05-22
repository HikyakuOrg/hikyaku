import { expect, test } from "@playwright/test"
import { faker } from "@faker-js/faker"
import { d } from "./helpers/org-url"

test.describe("Account — change display name", () => {
    test("updating display name updates the sidebar nav-user text", async ({ page }) => {
        await page.goto(d('/user/account'))
        await expect(page).toHaveURL(d('/user/account'))

        const displayNameInput = page.locator("#display-name")
        await expect(displayNameInput).toBeVisible()

        // Allow the supabase.auth.getUser() effect to settle so the field is hydrated
        // before we capture the original value (it's '' for users without metadata).
        await page.waitForTimeout(500)
        const originalName = (await displayNameInput.inputValue()) ?? ""

        const newName = `${faker.person.firstName()}-${Date.now()}`

        try {
            await displayNameInput.fill(newName)
            await page.getByRole("button", { name: /^save$/i }).click()

            await expect(page.getByText(/account updated/i)).toBeVisible({ timeout: 10_000 })
            await expect(displayNameInput).toHaveValue(newName)

            // The sidebar NavUser listens to supabase.auth.onAuthStateChange and
            // updates the display-name span (components/ui/sidebar/nav-user.tsx).
            // We don't have a stable testid, so target the sidebar footer's
            // SidebarMenuButton and assert its visible text contains the new name.
            const sidebarFooter = page.locator('[data-slot="sidebar-footer"]')
            await expect(sidebarFooter).toContainText(newName, { timeout: 10_000 })
        } finally {
            // Restore — the global storageState user is shared across the suite,
            // so any leftover faker name would pollute future runs.
            await displayNameInput.fill(originalName)
            await page.getByRole("button", { name: /^save$/i }).click()
            await expect(page.getByText(/account updated/i)).toBeVisible({ timeout: 10_000 })
        }
    })
})
