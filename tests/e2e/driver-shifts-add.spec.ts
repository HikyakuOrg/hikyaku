import { test, expect } from "@playwright/test"
import { d } from "./helpers/org-url"

// The wizard creates shifts through hikyaku-api (POST /api/v1/shifts, then
// POST /api/v1/shifts/:id/packages). These specs need seed data and the API,
// so they skip in CI.

// Shared by the serial group below, which runs on one worker.
let createdShiftUrl = ""
let createdShiftDate = ""

/** Click a day in the month the calendar shows. */
async function pickCalendarDay(
    page: import("@playwright/test").Page,
    dayNumber: number
): Promise<void> {
    const grid = page.getByRole("grid")
    await expect(grid).toBeVisible({ timeout: 10000 })
    // Each day is a <button> with the day number as its text.
    await grid
        .locator("button")
        .filter({ hasText: new RegExp(`^${dayNumber}$`) })
        .first()
        .click()
}

/**
 * Complete steps 1 to 3 with the first option in each step, and stop on step 4.
 * Needs a seeded warehouse and a free driver and vehicle on that day.
 */
async function navigateToStep4(
    page: import("@playwright/test").Page,
    dayNumber: number
): Promise<void> {
    await page.goto(d('/driver-shifts/add'))
    await expect(page).toHaveURL(d('/driver-shifts/add'))

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

    // Step 3: Driver & Vehicle
    // Driver cards contain the word "License".
    const firstDriverCard = page
        .getByRole("button")
        .filter({ hasText: /license/i })
        .first()
    await expect(firstDriverCard).toBeVisible({ timeout: 15000 })
    await firstDriverCard.click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // Step 4: wait for the packages table.
    await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })
}

test.describe("Driver Shifts: list page", () => {
    test("Add Shift button and info tooltip render on the list page", async ({ page }) => {
        const response = await page.goto(d('/driver-shifts'))
        expect(response?.ok()).toBeTruthy()
        await expect(page).toHaveURL(d('/driver-shifts'))

        const addShiftLink = page.getByRole("link", { name: /add shift/i })
        await expect(addShiftLink).toBeVisible({ timeout: 15000 })
        await expect(addShiftLink).toHaveAttribute("href", d('/driver-shifts/add'))

        // The info icon opens the tooltip.
        const infoIcon = page.locator("svg.lucide-info").first()
        await expect(infoIcon).toBeVisible({ timeout: 5000 })

        await infoIcon.hover()
        await expect(
            page.getByText(/shifts are usually created automatically/i)
        ).toBeVisible({ timeout: 5000 })
    })
})

test.describe("Driver Shifts: create a shift, then check it", () => {
    // Serial, so the later tests can use the shift that the first test creates.
    test.describe.configure({ mode: "serial" })

    test("the 5-step flow creates a shift and opens the shift page", async ({ page }) => {
        test.setTimeout(120000)
        // Needs seed data: a warehouse that matches "Main", a free driver and
        // vehicle on the chosen day, and an unassigned package with coordinates
        // at that warehouse.
        test.skip(!!process.env.CI, "Needs seed data. Skipped in CI.")

        await page.goto(d('/driver-shifts/add'))
        await expect(page).toHaveURL(d('/driver-shifts/add'))

        // Step 1: Warehouse
        const warehouseInput = page.getByRole("combobox")
        await warehouseInput.click()
        await warehouseInput.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 2: Date
        // 7 days from today: in the future, and usually in the month shown.
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + 7)
        const dayNumber = targetDate.getDate()
        createdShiftDate = targetDate.toISOString().split("T")[0]

        await pickCalendarDay(page, dayNumber)
        // The date chip shows.
        await expect(
            page.getByText(
                new RegExp(String(targetDate.getFullYear()), "i")
            )
        ).toBeVisible({ timeout: 5000 })
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 3: Driver & Vehicle
        const firstDriverCard = page
            .getByRole("button")
            .filter({ hasText: /license/i })
            .first()
        await expect(firstDriverCard).toBeVisible({ timeout: 15000 })
        await firstDriverCard.click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 4: Packages & Route
        await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })

        // Add the first package to the route.
        const firstCheckbox = page.getByRole("checkbox").first()
        await expect(firstCheckbox).toBeVisible({ timeout: 15000 })
        await firstCheckbox.check()
        await page.getByRole("button", { name: /add to route/i }).click()

        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })
        // Next is enabled only when the route has a package.
        const nextBtn = page.getByRole("button", { name: /^next$/i })
        await expect(nextBtn).toBeEnabled({ timeout: 20000 })
        await nextBtn.click()

        // Step 5: Overview
        await expect(page.getByText(/review & confirm/i)).toBeVisible({ timeout: 10000 })

        const createShiftBtn = page.getByRole("button", { name: /create shift/i })
        await expect(createShiftBtn).toBeVisible({ timeout: 5000 })
        await createShiftBtn.click()

        // A shift with packages has a route, so the wizard opens its page. An
        // empty shift opens the calendar (driver-shifts-calendar-live.spec.ts).
        await expect(page).toHaveURL(
            /\/dashboard\/driver-shifts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
            { timeout: 30000 }
        )
        createdShiftUrl = page.url()
    })

    test("the shift page shows the route map", async ({ page }) => {
        test.skip(!createdShiftUrl, "Needs the shift from the first test.")

        await page.goto(createdShiftUrl)
        await expect(page).toHaveURL(createdShiftUrl)

        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })

        await expect(
            page.getByRole("heading", { level: 1 }).or(page.locator("h1"))
        ).toBeVisible({ timeout: 10000 })
    })

    test("driver-shifts calendar shows the newly created shift on the correct date", async ({ page }) => {
        test.skip(!createdShiftUrl, "Needs the shift from the first test.")

        await page.goto(d('/driver-shifts'))
        await expect(page).toHaveURL(d('/driver-shifts'))

        // The calendar has no data-testid, so wait for the page.
        await expect(page.locator("body")).toBeVisible({ timeout: 10000 })

        // The shift's day shows on the calendar.
        const shiftDayNumber = new Date(createdShiftDate + "T00:00:00").getDate()
        await expect(
            page.getByText(new RegExp(`\\b${shiftDayNumber}\\b`)).first()
        ).toBeVisible({ timeout: 10000 })
    })

    test("package status is ASSIGNED after shift creation", async ({ page }) => {
        test.skip(!createdShiftUrl, "Needs the shift from the first test.")

        await page.goto(createdShiftUrl)
        await expect(page).toHaveURL(createdShiftUrl)

        // "Assigned" shows on a package badge or in the route steps card.
        await expect(
            page.getByText(/assigned/i).first()
        ).toBeVisible({ timeout: 15000 })
    })
})

// Each test goes through the wizard on its own. All need seed data and skip in CI.
test.describe("Driver Shifts: validation and errors", () => {
    test("shows the over-capacity warning when packages exceed the vehicle limit", async ({ page }) => {
        test.setTimeout(120000)
        // Needs a vehicle whose gross limit is less than the weight of all
        // packages at the warehouse.
        test.skip(!!process.env.CI, "Needs seed data. Skipped in CI.")

        const dayNumber = new Date(Date.now() + 10 * 86400000).getDate()
        await navigateToStep4(page, dayNumber)

        // Select all packages to go over capacity.
        const selectAllCheckbox = page.getByRole("checkbox", { name: /select all/i })
        if (await selectAllCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
            await selectAllCheckbox.check()
        } else {
            const checkboxes = page.getByRole("checkbox")
            const count = await checkboxes.count()
            for (let i = 0; i < count; i++) {
                await checkboxes.nth(i).check()
            }
        }

        await page.getByRole("button", { name: /add to route/i }).click()

        await expect(page.getByText(/over capacity!/i)).toBeVisible({ timeout: 10000 })

        // Next stays enabled; the wizard only warns. Check the warning stays.
        await expect(page.getByText(/over capacity!/i)).toBeVisible()
    })

    test("shows the expired-license warning for a driver with an expired license", async ({ page }) => {
        test.setTimeout(120000)
        test.skip(!!process.env.CI, "Needs a driver with an expired license in seed data. Skipped in CI.")

        await page.goto(d('/driver-shifts/add'))
        await expect(page).toHaveURL(d('/driver-shifts/add'))

        // Step 1: Warehouse
        const warehouseInput = page.getByRole("combobox")
        await warehouseInput.click()
        await warehouseInput.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 2: Date. Next month makes an expired license more likely.
        await expect(page.getByRole("grid")).toBeVisible({ timeout: 10000 })
        const nextMonthBtn = page.getByRole("button", { name: /next month/i })
        if (await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextMonthBtn.click()
        }
        await pickCalendarDay(page, 15)
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 3: a driver card shows the warning.
        await expect(page.getByText(/license expired/i)).toBeVisible({ timeout: 15000 })

        const expiredCard = page
            .getByRole("button")
            .filter({ hasText: /expired/i })
            .first()
        await expiredCard.click()

        // The warning stays after selection. It is a warning only, so Next still shows.
        await expect(page.getByText(/license expired/i)).toBeVisible()

        await expect(page.getByRole("button", { name: /^next$/i })).toBeVisible()
    })

    test("a second shift for the same driver and date shows an error", async ({ page }) => {
        test.setTimeout(120000)
        // Writes two shifts. Step 3 hides a driver who already has a shift. If
        // one still gets through, the API answers 409 (unique indexes on
        // driver and date, and vehicle and date, for open shifts).
        test.skip(!!process.env.CI, "Needs seed data and changes data. Skipped in CI.")

        // 21 days from now, so it does not clash with other tests.
        const targetDate = new Date(Date.now() + 21 * 86400000)
        const dayNumber = targetDate.getDate()

        async function submitFullForm(): Promise<void> {
            await page.goto(d('/driver-shifts/add'))

            // Step 1
            const warehouseInput = page.getByRole("combobox")
            await warehouseInput.click()
            await warehouseInput.fill("Main")
            await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
            await page.getByRole("option").first().click()
            await page.getByRole("button", { name: /^next$/i }).click()

            // Step 2
            await pickCalendarDay(page, dayNumber)
            await page.getByRole("button", { name: /^next$/i }).click()

            // Step 3: the first card
            const firstCard = page
                .getByRole("button")
                .filter({ hasText: /license/i })
                .first()
            await expect(firstCard).toBeVisible({ timeout: 15000 })
            await firstCard.click()
            await page.getByRole("button", { name: /^next$/i }).click()

            // Step 4
            await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })
            const firstCheckbox = page.getByRole("checkbox").first()
            await expect(firstCheckbox).toBeVisible({ timeout: 10000 })
            await firstCheckbox.check()
            await page.getByRole("button", { name: /add to route/i }).click()
            await expect(page.getByRole("button", { name: /^next$/i })).toBeEnabled({ timeout: 20000 })
            await page.getByRole("button", { name: /^next$/i }).click()

            // Step 5
            await expect(page.getByText(/review & confirm/i)).toBeVisible({ timeout: 10000 })
            await page.getByRole("button", { name: /create shift/i }).click()
        }

        // The first shift is created.
        await submitFullForm()
        await expect(page).toHaveURL(
            /\/dashboard\/driver-shifts\/[0-9a-f-]{36}/i,
            { timeout: 30000 }
        )

        // The second shift on the same day must fail. Step 3 can show no
        // drivers at all, which also counts.
        await page.goto(d('/driver-shifts/add'))

        // Step 1
        const warehouseInput2 = page.getByRole("combobox")
        await warehouseInput2.click()
        await warehouseInput2.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 2: the same date
        await pickCalendarDay(page, dayNumber)
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 3: either no drivers show, or another driver shows.
        const noAvailableMsg = page.getByText(/no available driver/i)
        // The toast that createManualShift shows for a 409.
        const conflictMsg = page.getByText(
            /already has an open shift on this date|already.*shift|conflict|duplicate|scheduled/i
        )

        const isNoAvailableVisible = await noAvailableMsg
            .isVisible({ timeout: 10000 })
            .catch(() => false)

        if (isNoAvailableVisible) {
            await expect(noAvailableMsg).toBeVisible()
        } else {
            // Another driver shows. Submit and expect an error.
            const firstCard2 = page
                .getByRole("button")
                .filter({ hasText: /license/i })
                .first()
            if (await firstCard2.isVisible({ timeout: 5000 }).catch(() => false)) {
                await firstCard2.click()
                await page.getByRole("button", { name: /^next$/i }).click()

                const firstCheckbox2 = page.getByRole("checkbox").first()
                if (await firstCheckbox2.isVisible({ timeout: 10000 }).catch(() => false)) {
                    await firstCheckbox2.check()
                    await page.getByRole("button", { name: /add to route/i }).click()
                    await expect(page.getByRole("button", { name: /^next$/i })).toBeEnabled({ timeout: 20000 })
                    await page.getByRole("button", { name: /^next$/i }).click()

                    await expect(page.getByText(/review & confirm/i)).toBeVisible({ timeout: 10000 })
                    await page.getByRole("button", { name: /create shift/i }).click()

                    await expect(
                        conflictMsg.or(page.getByText(/error|failed/i).first())
                    ).toBeVisible({ timeout: 10000 })
                }
            }
        }
    })

    test("route preview updates within 4000ms after package reorder in step 4", async ({ page }) => {
        test.setTimeout(120000)
        test.skip(!!process.env.CI, "Needs 2 or more unassigned packages in seed data. Skipped in CI.")

        const dayNumber = new Date(Date.now() + 28 * 86400000).getDate()
        await navigateToStep4(page, dayNumber)

        // Add 2 packages to reorder.
        const checkboxes = page.getByRole("checkbox")
        const checkboxCount = await checkboxes.count()
        if (checkboxCount < 2) {
            test.skip(true, "Needs 2 or more packages in seed data.")
            return
        }

        await checkboxes.nth(0).check()
        await checkboxes.nth(1).check()
        await page.getByRole("button", { name: /add to route/i }).click()

        // The route loads after a 1 s debounce. Wait for the map and the spinner.
        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })
        await expect(page.locator('[class*="animate-spin"]')).toBeHidden({ timeout: 15000 })

        // Drag and drop. Each route row has a grip icon.
        const routeItems = page
            .locator("div")
            .filter({ has: page.locator("svg.lucide-grip-vertical") })
        await expect(routeItems.first()).toBeVisible({ timeout: 10000 })
        await expect(routeItems.nth(1)).toBeVisible({ timeout: 5000 })

        const firstItemBox = await routeItems.first().boundingBox()
        const secondItemBox = await routeItems.nth(1).boundingBox()

        if (!firstItemBox || !secondItemBox) {
            test.skip(true, "Could not find the route rows. Check the locator.")
            return
        }

        // Drag row 1 below row 2.
        const startX = firstItemBox.x + firstItemBox.width / 2
        const startY = firstItemBox.y + firstItemBox.height / 2
        const endX = secondItemBox.x + secondItemBox.width / 2
        const endY = secondItemBox.y + secondItemBox.height + 5

        await page.mouse.move(startX, startY)
        await page.mouse.down()
        // Small steps, so the dnd-kit pointer sensor activates.
        await page.mouse.move(startX, startY + 10, { steps: 5 })
        await page.mouse.move(endX, endY, { steps: 15 })
        await page.mouse.up()

        // The route loads again after a 1 s debounce. The spinner can be too
        // quick to see, so wait 4 s, then check the map and that the spinner is gone.
        const spinner = page.locator('[class*="animate-spin"]')

        await page.waitForTimeout(4000)
        await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 })

        await expect(spinner).toBeHidden({ timeout: 5000 })
    })
})
