import { expect, test } from "@playwright/test"

import { uniqueOrgName } from "./helpers/test-data"
import { signUpAndConfirm } from "./helpers/signup-flow"

/**
 * Two fresh users in two isolated browser contexts both attempt to create an
 * organisation with the same name. The second insert must fail at the DB level.
 *
 * Runs under the `chrome-unauthed` Playwright project (no shared storageState).
 */
test.describe("Organisation create — duplicate from another user fails", () => {
    test("user B cannot reuse user A's org name", async ({ browser }) => {
        test.setTimeout(180_000)

        const orgName = uniqueOrgName()

        // --- User A: sign up, confirm email, create the org ---
        const contextA = await browser.newContext()
        const pageA = await contextA.newPage()

        await signUpAndConfirm(pageA, { displayName: "User A" })

        await pageA.locator("#org-name").fill(orgName)
        await pageA.getByRole("button", { name: /create organization/i }).click()
        await expect(pageA).toHaveURL(/\/orgs\/[a-z0-9-]+\/dashboard\/?$/, {
            timeout: 20_000,
        })

        await contextA.close()

        // --- User B: brand-new context (no cookies from A) ---
        const contextB = await browser.newContext()
        const pageB = await contextB.newPage()

        await signUpAndConfirm(pageB, { displayName: "User B" })

        await pageB.locator("#org-name").fill(orgName)
        await pageB.getByRole("button", { name: /create organization/i }).click()

        const errorParagraph = pageB.locator("p.text-destructive")
        await expect(errorParagraph).toBeVisible({ timeout: 10_000 })
        await expect(errorParagraph).toHaveText(/duplicate|already|unique|exist/i)

        // URL must NOT have redirected to the org dashboard
        await expect(pageB).toHaveURL(/\/orgs\/new$/)

        await contextB.close()
    })
})
