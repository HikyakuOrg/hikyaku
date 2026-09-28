import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * Driving limit profiles: create (with unit conversion), assign to a driver,
 * and set the organisation default.
 *
 * Each test deletes its profiles. Profiles given to a driver or set as the
 * default have no limits, so a shared organisation's planning never changes.
 */

/** Long enough for the dev server to compile a page on first visit. */
const NAVIGATION_TIMEOUT = 45000

/**
 * The previous page stays mounted but hidden, so a test id can match two
 * elements. Use only the visible one.
 */
function visible(page: Page, testId: string) {
    return page.getByTestId(testId).filter({ visible: true })
}

function profileRow(page: Page, name: string) {
    return visible(page, "driving-limit-profiles-table").locator("tbody tr", { hasText: name })
}

async function createBlankProfile(page: Page, name: string) {
    await page.goto(d("/fleet/driving-limits/add"))
    await visible(page, "driving-limit-name-input").fill(name)
    // An empty profile is allowed, and a note explains it.
    await expect(visible(page, "driving-limit-all-blank-note")).toBeVisible()
    await visible(page, "driving-limit-submit").click()
    await expect(page).toHaveURL(d("/fleet/driving-limits"), { timeout: NAVIGATION_TIMEOUT })
    await expect(profileRow(page, name)).toBeVisible()
}

async function deleteProfile(page: Page, name: string) {
    await page.goto(d("/fleet/driving-limits"))
    const row = profileRow(page, name)
    await expect(row).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
    await row.getByRole("button", { name: `Delete ${name}` }).click()
    await page.getByTestId("driving-limit-delete-confirm").click()
    await expect(row).toHaveCount(0)
}

async function chooseOption(page: Page, triggerTestId: string, optionName: string) {
    await visible(page, triggerTestId).click()
    await page.getByRole("option", { name: optionName, exact: true }).click()
}

/**
 * Open the first team member who is a driver. The list does not show this, so
 * open each member until the driving limits card shows a picker.
 */
async function openFirstDriver(page: Page): Promise<boolean> {
    await page.goto(d("/fleet/team-members"))
    // Skeleton rows have no email.
    const memberRows = () => visible(page, "team-members-table").locator("tbody tr", { hasText: /@/ })
    await expect(memberRows().first()).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
    const memberCount = Math.min(await memberRows().count(), 10)

    for (let index = 0; index < memberCount; index += 1) {
        if (index > 0) {
            await page.goto(d("/fleet/team-members"))
            await expect(memberRows().nth(index)).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
        }

        await memberRows().nth(index).getByRole("cell").filter({ hasText: /@/ }).first().click()
        await expect(page).toHaveURL(/\/fleet\/team-members\/[0-9a-f-]{36}$/, { timeout: NAVIGATION_TIMEOUT })

        const picker = visible(page, "driver-driving-limit-select")
        const notDriver = visible(page, "driver-driving-limits-not-driver")
        await expect(picker.or(notDriver)).toBeVisible({ timeout: NAVIGATION_TIMEOUT })

        if (await picker.isVisible()) {
            return true
        }
    }

    return false
}

test.describe("Driving limit profiles", () => {
    test.describe.configure({ timeout: 180000 })

    test("creates a profile from a template and round-trips hours and kilometres", async ({ page }) => {
        const name = `Metro Round Trip ${Date.now()}`

        await page.goto(d("/fleet/driving-limits"))
        await page.getByRole("link", { name: "Add Profile" }).click()
        await expect(page).toHaveURL(d("/fleet/driving-limits/add"), { timeout: NAVIGATION_TIMEOUT })

        // A template only fills the form.
        await visible(page, "driving-limit-template-standard-metro").click()
        await expect(visible(page, "driving-limit-name-input")).toHaveValue("Standard metro")
        await expect(visible(page, "driving-limit-input-working")).toHaveValue("10")
        await expect(visible(page, "driving-limit-input-driving")).toHaveValue("8")
        await expect(visible(page, "driving-limit-input-distance")).toHaveValue("250")
        await expect(visible(page, "driving-limit-input-stops")).toHaveValue("40")

        // Then change it: a new name, fractions, and one limit cleared.
        await visible(page, "driving-limit-name-input").fill(name)
        await visible(page, "driving-limit-input-working").fill("9.75")
        await visible(page, "driving-limit-input-distance").fill("212.345")
        await page.getByRole("button", { name: "Remove the driving time limit" }).filter({ visible: true }).click()
        await expect(visible(page, "driving-limit-input-driving")).toHaveValue("")
        await expect(visible(page, "driving-limit-status-driving")).toContainText("No limit on driving time")

        // Zero is not "no limit". The stop limit note shows before saving.
        await visible(page, "driving-limit-input-stops").fill("0")
        await expect(visible(page, "driving-limit-status-stops")).toContainText("Leave the field blank for no limit")
        await visible(page, "driving-limit-input-stops").fill("46")
        await expect(visible(page, "driving-limit-status-stops")).toContainText("At most 45")
        await expect(visible(page, "driving-limit-submit")).toBeDisabled()
        await visible(page, "driving-limit-input-stops").fill("38")

        await visible(page, "driving-limit-submit").click()
        await expect(page).toHaveURL(d("/fleet/driving-limits"), { timeout: NAVIGATION_TIMEOUT })

        const row = profileRow(page, name)
        await expect(row).toBeVisible()
        await expect(row).toContainText("9.75 h")
        await expect(row).toContainText("No limit")
        await expect(row).toContainText("212.3 km")
        await expect(row).toContainText("38 stops")

        // Saved as seconds and metres, shown as typed.
        await row.getByRole("cell").first().click()
        await expect(page).toHaveURL(/\/fleet\/driving-limits\/[0-9a-f-]{36}$/, { timeout: NAVIGATION_TIMEOUT })
        const profileUrl = page.url()
        await expect(visible(page, "driving-limit-profile-title")).toHaveText(name)
        await expect(visible(page, "driving-limit-input-working")).toHaveValue("9.75")
        await expect(visible(page, "driving-limit-input-driving")).toHaveValue("")
        await expect(visible(page, "driving-limit-input-distance")).toHaveValue("212.345")
        await expect(visible(page, "driving-limit-input-stops")).toHaveValue("38")

        // Saving with no changes changes nothing.
        await visible(page, "driving-limit-submit").click()
        await expect(page).toHaveURL(d("/fleet/driving-limits"), { timeout: NAVIGATION_TIMEOUT })
        await page.goto(profileUrl)
        await expect(visible(page, "driving-limit-input-working")).toHaveValue("9.75")
        await expect(visible(page, "driving-limit-input-driving")).toHaveValue("")
        await expect(visible(page, "driving-limit-input-distance")).toHaveValue("212.345")
        await expect(visible(page, "driving-limit-input-stops")).toHaveValue("38")

        await deleteProfile(page, name)
    })

    test("points a driver at a profile and back to none", async ({ page }) => {
        test.setTimeout(300000)
        const name = `Assign Test ${Date.now()}`
        await createBlankProfile(page, name)

        try {
            const foundDriver = await openFirstDriver(page)
            test.skip(!foundDriver, "Requires at least one driver in the test organisation")

            const driverUrl = page.url()
            await chooseOption(page, "driver-driving-limit-select", name)
            await expect(page.getByText(`This driver is now planned within "${name}".`)).toBeVisible()
            await expect(visible(page, "driver-driving-limit-select")).toContainText(name)

            // Still assigned after a reload.
            await page.goto(driverUrl)
            await expect(visible(page, "driver-driving-limit-select")).toContainText(name, { timeout: NAVIGATION_TIMEOUT })

            await chooseOption(page, "driver-driving-limit-select", "No profile of their own")
            await expect(visible(page, "driver-driving-limit-select")).toContainText("No profile of their own")

            await page.goto(driverUrl)
            await expect(visible(page, "driver-driving-limit-select"))
                .toContainText("No profile of their own", { timeout: NAVIGATION_TIMEOUT })
        } finally {
            await deleteProfile(page, name)
        }
    })

    test("sets and clears the organisation default", async ({ page }) => {
        // `authenticated` has no UPDATE grant on this column yet, so PostgREST
        // returns 42501. Remove this when the grant is added.
        test.fixme(true, "organisations.default_driving_limit_profile_id is not yet updatable by authenticated users")

        const name = `Default Test ${Date.now()}`
        await createBlankProfile(page, name)

        try {
            await page.goto(d("/user/driving-limits"))
            await chooseOption(page, "organisation-driving-limit-select", name)
            await visible(page, "organisation-driving-limit-save").click()
            // Check the toast. The button is also disabled while saving.
            await expect(page.getByText(`Drivers without a profile of their own now follow "${name}".`)).toBeVisible()

            await page.reload()
            await expect(visible(page, "organisation-driving-limit-select")).toContainText(name)

            // The profiles list marks it too.
            await page.goto(d("/fleet/driving-limits"))
            await expect(profileRow(page, name).getByTestId("driving-limit-default-badge")).toBeVisible()

            await page.goto(d("/user/driving-limits"))
            await chooseOption(page, "organisation-driving-limit-select", "No default")
            await visible(page, "organisation-driving-limit-save").click()
            await expect(page.getByText("The organisation has no default.", { exact: false })).toBeVisible()

            await page.reload()
            await expect(visible(page, "organisation-driving-limit-select")).toContainText("No default")
        } finally {
            await deleteProfile(page, name)
        }
    })
})
