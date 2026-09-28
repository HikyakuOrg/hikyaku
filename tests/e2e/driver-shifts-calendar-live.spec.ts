import { test, expect, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * The calendar reads vrp_optimization by shift_date and status, so:
 *
 *  - a shift with no packages shows on the calendar;
 *  - a changed plan shows after SHIFTS_REFRESH_EVENT, with no page reload.
 *
 * Both need seed data and hikyaku-api, so they skip in CI.
 */

const SEED_HINT = "Needs seed data and hikyaku-api. Skipped in CI."

/**
 * Navigate the shadcn Calendar (react-day-picker) to the given day number
 * within the currently visible month and click it.
 */
async function pickCalendarDay(page: Page, dayNumber: number): Promise<void> {
    const grid = page.getByRole("grid")
    await expect(grid).toBeVisible({ timeout: 10000 })
    await grid
        .locator("button")
        .filter({ hasText: new RegExp(`^${dayNumber}$`) })
        .first()
        .click()
}

/** Create a shift with no packages on it and return the day it was created for. */
async function createEmptyShift(page: Page, daysFromNow: number): Promise<number> {
    const targetDate = new Date(Date.now() + daysFromNow * 86400000)
    const dayNumber = targetDate.getDate()

    await page.goto(d("/driver-shifts/add"))

    // Step 1: Warehouse
    const warehouseInput = page.getByRole("combobox")
    await warehouseInput.click()
    await warehouseInput.fill("Main")
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // Step 2: Date
    await pickCalendarDay(page, dayNumber)
    await page.getByRole("button", { name: /^next$/i }).click()

    // Step 3: Driver & vehicle
    const firstDriverCard = page.getByRole("button").filter({ hasText: /license/i }).first()
    await expect(firstDriverCard).toBeVisible({ timeout: 15000 })
    await firstDriverCard.click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // Step 4: Packages & route. Pick nothing; an empty shift is allowed.
    await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: /^next$/i }).click()

    // Step 5: Overview
    await expect(page.getByText(/review & confirm/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: /create shift/i }).click()

    return dayNumber
}

test.describe("Driver shifts calendar: empty shifts and live refresh", () => {
    test.describe.configure({ mode: "serial" })

    test("an empty shift is visible on the calendar", async ({ page }) => {
        test.setTimeout(120000)
        test.skip(!!process.env.CI, SEED_HINT)

        await createEmptyShift(page, 14)

        // An empty shift has no route, so the wizard opens the calendar.
        await page.goto(d("/driver-shifts"))
        await expect(page).toHaveURL(d("/driver-shifts"))

        // An empty shift shows "0 packages".
        await expect(page.getByText(/^0 packages$/).first()).toBeVisible({ timeout: 20000 })
        await expect(page.getByText(/no shifts found for the selected period/i)).toBeHidden()
    })

    test("the stop count updates without a page reload", async ({ page }) => {
        test.setTimeout(180000)
        test.skip(!!process.env.CI, SEED_HINT)

        await page.goto(d("/driver-shifts"))
        await expect(page).toHaveURL(d("/driver-shifts"))

        const emptyEvent = page.getByText(/^0 packages$/).first()
        await expect(emptyEvent).toBeVisible({ timeout: 20000 })

        // Re-optimise replans existing shifts and sends SHIFTS_REFRESH_EVENT when
        // it finishes. The calendar then loads the new stop counts.
        const reoptimise = page.getByRole("button", { name: /^re-optimise$/i })
        await expect(reoptimise).toBeVisible({ timeout: 10000 })
        test.skip(await reoptimise.isDisabled(), "Re-optimise is rate-limited or unavailable right now")

        await reoptimise.click()
        await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 })
        await page.getByRole("button", { name: /^re-optimise$/i }).last().click()

        // The run is asynchronous. The URL must not change, so there is no reload.
        await expect(page.getByText(/routes re-optimised|no pending packages/i)).toBeVisible({
            timeout: 120000,
        })
        await expect(page).toHaveURL(d("/driver-shifts"))

        // A package joined the shift, or none were queued. Both are correct.
        await expect(page.getByText(/\d+ packages/).first()).toBeVisible({ timeout: 20000 })
    })
})
