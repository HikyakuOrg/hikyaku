import { faker } from "@faker-js/faker"
import { expect, test, type Page } from "@playwright/test"

import { d } from "./helpers/org-url"
import { uniqueSignupEmail } from "./helpers/test-data"

async function pickOption(page: Page, placeholder: string, option: string) {
    await page
        .getByRole("combobox")
        .filter({ has: page.getByText(placeholder, { exact: true }) })
        .click()
    await page.getByRole("option", { name: option, exact: true }).click()
}

async function fillMember(page: Page, role: string) {
    // Addressed to the Resend inbound domain so the invitation email lands
    // in an inbox we control rather than a stranger's.
    const email = uniqueSignupEmail("member")

    await page.goto(d("/fleet/team-members/add"))
    await page.locator("#displayName").fill(`E2E ${role} ${Date.now()}`)
    await page.locator("#email").fill(email)
    // Supabase auth phones are unique, so a fixed number collides with earlier runs.
    await page.locator("#phone").fill(`04${faker.string.numeric(8)}`)
    await pickOption(page, "Select role", role)

    return email
}

async function submitAndCleanUp(page: Page, email: string) {
    await page.getByRole("button", { name: "Add Team Member" }).click()

    // Asserting on the toast text surfaces the API's error message on failure,
    // e.g. the "Missing X-Organisation-Slug header" this flow used to hit.
    await expect(page.locator("[data-sonner-toast]").first()).toHaveText(
        "Team member added successfully",
        { timeout: 20_000 },
    )
    await expect(page).toHaveURL(d("/fleet/team-members"), { timeout: 30_000 })

    await page.getByTestId("team-members-search-input").fill(email)
    const row = page.getByRole("row").filter({ hasText: email })
    await expect(row).toBeVisible({ timeout: 15_000 })
    await expect(row.getByText("Invitation pending")).toBeVisible()

    // Remove the member again so repeated runs don't grow the team list.
    await row.getByRole("checkbox", { name: "Select row" }).click()
    await page.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByText("1 member(s) removed")).toBeVisible({ timeout: 15_000 })
}

test.describe("Fleet Team Members: add member", () => {
    // Creating a member sends a Supabase invite, and the test deletes it again.
    test.setTimeout(90_000)

    test("adds a Dispatcher and lists them as pending", async ({ page }) => {
        const email = await fillMember(page, "Dispatcher")
        await submitAndCleanUp(page, email)
    })

    test("adds a Driver with licence details and lists them as pending", async ({ page }) => {
        test.fixme(
            true,
            "hikyaku-api inserts the drivers row without organisation_id, which is NOT NULL",
        )

        const email = await fillMember(page, "Driver")

        await expect(page.getByText("Driver Licensing Details")).toBeVisible()
        await page.locator("#drivingLicense").fill("E2E123456")
        await pickOption(page, "Select country", "Australia")
        await pickOption(page, "Select", "No")

        await submitAndCleanUp(page, email)
    })
})
