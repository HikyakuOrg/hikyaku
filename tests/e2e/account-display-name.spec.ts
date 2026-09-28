import { expect, test } from "@playwright/test"
import { faker } from "@faker-js/faker"
import { d } from "./helpers/org-url"

test.describe("Account: change display name", () => {
    test("updating display name updates the sidebar nav-user text", async ({ page }) => {
        await page.goto(d('/user/account'))
        await expect(page).toHaveURL(d('/user/account'))

        const displayNameInput = page.locator("#display-name")
        await expect(displayNameInput).toBeVisible()

        // Wait for getUser() to fill the field before reading it ('' with no metadata).
        await page.waitForTimeout(500)
        const originalName = (await displayNameInput.inputValue()) ?? ""

        const newName = `${faker.person.firstName()}-${Date.now()}`

        try {
            await displayNameInput.fill(newName)
            await page.getByRole("button", { name: /^save$/i }).click()

            await expect(page.getByText(/account updated/i)).toBeVisible({ timeout: 10_000 })
            await expect(displayNameInput).toHaveValue(newName)

            // NavUser updates on onAuthStateChange. It has no testid, so check the
            // sidebar footer text.
            const sidebarFooter = page.locator('[data-slot="sidebar-footer"]')
            await expect(sidebarFooter).toContainText(newName, { timeout: 10_000 })
        } finally {
            // Set the name back. Every spec shares this user.
            await displayNameInput.fill(originalName)
            await page.getByRole("button", { name: /^save$/i }).click()
            await expect(page.getByText(/account updated/i)).toBeVisible({ timeout: 10_000 })
        }
    })
})
