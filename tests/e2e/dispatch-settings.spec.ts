import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * Settings > Dispatch. It replaces the ASSIGNMENT_MODE, LOAD_SPREAD_ENABLED and
 * SERVICE_AREA_MATCHING environment variables in hikyaku-api.
 *
 * Only load spreading is saved, and it is always set back. Other specs use this
 * organisation, and load spreading does not change who can get a package.
 */

/** Long enough for the dev server to compile a page on first visit. */
const NAVIGATION_TIMEOUT = 45000

const SETTING_NAMES = [
    "Assign new packages automatically",
    "Spread packages across vans",
    "Match packages to service areas",
]

/**
 * The previous page stays mounted but hidden, so a test id can match two
 * elements. Use only the visible one.
 */
function visible(page: Page, testId: string) {
    return page.getByTestId(testId).filter({ visible: true })
}

async function openDispatchSettings(page: Page) {
    await page.goto(d("/user/dispatch"))
    await expect(visible(page, "dispatch-settings")).toBeVisible({ timeout: NAVIGATION_TIMEOUT })
}

/** Sets load spreading to `on` and saves, unless it already is. */
async function saveLoadSpread(page: Page, on: boolean) {
    await openDispatchSettings(page)
    const checkbox = visible(page, "dispatch-settings-load-spread")
    if ((await checkbox.isChecked()) === on) return

    await checkbox.click()
    await visible(page, "dispatch-settings-save").click()
    // Check the toast. The button is also disabled while saving.
    await expect(page.getByText("Dispatch settings saved.", { exact: false })).toBeVisible()
}

test.describe("Settings: dispatch", () => {
    // A first compile in dev can take most of the default 30 s.
    test.describe.configure({ timeout: 120_000 })

    test("is reachable from the settings side navigation", async ({ page }) => {
        await page.goto(d("/user/account"))

        const nav = page.locator("aside")
        await nav.getByRole("link", { name: "Dispatch" }).click()

        await expect(page).toHaveURL(d("/user/dispatch"), { timeout: NAVIGATION_TIMEOUT })
        await expect(nav.getByRole("link", { name: "Dispatch" })).toHaveAttribute("aria-current", "page")
        await expect(page.getByRole("heading", { name: "Dispatch", exact: true })).toBeVisible()
    })

    test("shows each setting as a checkbox named by its title", async ({ page }) => {
        await openDispatchSettings(page)

        for (const name of SETTING_NAMES) {
            await expect(page.getByRole("checkbox", { name, exact: true })).toBeVisible()
        }
        // Nothing to save until something changes.
        await expect(visible(page, "dispatch-settings-save")).toBeDisabled()
    })

    test("Reset puts back an unsaved change", async ({ page }) => {
        await openDispatchSettings(page)
        const checkbox = visible(page, "dispatch-settings-load-spread")
        const before = await checkbox.isChecked()

        await checkbox.click()
        await expect(checkbox).toBeChecked({ checked: !before })
        await expect(visible(page, "dispatch-settings-save")).toBeEnabled()

        await page.getByRole("button", { name: "Reset" }).click()

        await expect(checkbox).toBeChecked({ checked: before })
        await expect(visible(page, "dispatch-settings-save")).toBeDisabled()
    })

    test("saves a change for the organisation and keeps it across a reload", async ({ page }) => {
        await openDispatchSettings(page)
        const original = await visible(page, "dispatch-settings-load-spread").isChecked()

        try {
            await saveLoadSpread(page, !original)

            await page.reload()
            await expect(visible(page, "dispatch-settings-load-spread")).toBeChecked({
                checked: !original,
                timeout: NAVIGATION_TIMEOUT,
            })
        } finally {
            await saveLoadSpread(page, original)
        }

        await page.reload()
        await expect(visible(page, "dispatch-settings-load-spread")).toBeChecked({
            checked: original,
            timeout: NAVIGATION_TIMEOUT,
        })
    })
})
