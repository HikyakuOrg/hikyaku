import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * Settings > Dispatch, the per-organisation replacement for hikyaku-api's
 * ASSIGNMENT_MODE, LOAD_SPREAD_ENABLED and SERVICE_AREA_MATCHING environment
 * variables.
 *
 * Only load spreading is ever saved here, and it is always put back: this runs
 * against a shared organisation whose packages other specs create, and load
 * spreading is the one setting whose change can neither stop a package being
 * assigned nor change which drivers may take it.
 */

/**
 * Long enough for a route the dev server has not compiled yet, which is the
 * first navigation to each of these pages on a fresh server.
 */
const NAVIGATION_TIMEOUT = 45000

const SETTING_NAMES = [
    "Assign new packages automatically",
    "Spread packages across vans",
    "Match packages to service areas",
]

/**
 * A page this app navigated away from stays mounted but hidden, so a test id
 * can match both the live page and the previous one. Only the visible one is
 * ever the one under test.
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
    // The toast, not the button: the button is also disabled while the write
    // is still in flight.
    await expect(page.getByText("Dispatch settings saved.", { exact: false })).toBeVisible()
}

test.describe("Settings — dispatch", () => {
    // Every test here opens at least one route the dev server may not have
    // compiled yet, and the first compile alone can take most of the default
    // 30 s.
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
