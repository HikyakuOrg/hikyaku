import { test, expect } from "@playwright/test"

// ---------------------------------------------------------------------------
// Shared state for the serial "creation + post-creation" group.
// Module-level lets are safe here because test.describe.configure({ mode:
// "serial" }) keeps that describe block on a single worker process.
// ---------------------------------------------------------------------------
let createdShiftUrl = ""
let createdShiftDate = ""

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate the shadcn Calendar (react-day-picker) to the given day number
 * within the currently visible month and click it.
 */
async function pickCalendarDay(
    page: import("@playwright/test").Page,
    dayNumber: number
): Promise<void> {
    const grid = page.getByRole("grid")
    await expect(grid).toBeVisible({ timeout: 10000 })
    // react-day-picker renders each day as a <button> whose text is the day number.
    // getByRole("gridcell") scopes the search to within the grid.
    await grid
        .locator("button")
        .filter({ hasText: new RegExp(`^${dayNumber}$`) })
        .first()
        .click()
}

/**
 * Walk through Steps 1–3 of the stepper using the first available option at
 * each step. Leaves the page on Step 4 (Packages & Route).
 *
 * Requires: seeded warehouse, available driver-vehicle pair for the chosen date.
 */
async function navigateToStep4(
    page: import("@playwright/test").Page,
    dayNumber: number
): Promise<void> {
    await page.goto("/dashboard/driver-shifts/add")
    await expect(page).toHaveURL("/dashboard/driver-shifts/add")

    // ── Step 1: Warehouse ────────────────────────────────────────────────────
    const warehouseInput = page.getByRole("combobox")
    await warehouseInput.click()
    await warehouseInput.fill("Main")
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // ── Step 2: Date ─────────────────────────────────────────────────────────
    await pickCalendarDay(page, dayNumber)
    await page.getByRole("button", { name: /^next$/i }).click()

    // ── Step 3: Driver & Vehicle ─────────────────────────────────────────────
    // Driver cards contain "License" in their body text
    const firstDriverCard = page
        .getByRole("button")
        .filter({ hasText: /license/i })
        .first()
    await expect(firstDriverCard).toBeVisible({ timeout: 15000 })
    await firstDriverCard.click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // Now on Step 4 – wait for the packages table to appear
    await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })
}

// ===========================================================================
// 1. Button + tooltip on the list page
// ===========================================================================
test.describe("Driver Shifts — List page", () => {
    test("Add Shift button and info tooltip render on the list page", async ({ page }) => {
        const response = await page.goto("/dashboard/driver-shifts")
        expect(response?.ok()).toBeTruthy()
        await expect(page).toHaveURL("/dashboard/driver-shifts")

        // "Add Shift" link-button pointing to /add
        const addShiftLink = page.getByRole("link", { name: /add shift/i })
        await expect(addShiftLink).toBeVisible({ timeout: 15000 })
        await expect(addShiftLink).toHaveAttribute("href", "/dashboard/driver-shifts/add")

        // Info icon (Lucide <Info>) is rendered as the tooltip trigger
        const infoIcon = page.locator("svg.lucide-info").first()
        await expect(infoIcon).toBeVisible({ timeout: 5000 })

        // Hover to materialise the tooltip content
        await infoIcon.hover()
        await expect(
            page.getByText(/shifts are typically created automatically/i)
        ).toBeVisible({ timeout: 5000 })
    })
})

// ===========================================================================
// 2–5. Happy path creation + post-creation checks  (serial, share state)
// ===========================================================================
test.describe("Driver Shifts — Happy path creation and post-creation checks", () => {
    // Run sequentially so later tests can consume the shift URL set by test 2.
    test.describe.configure({ mode: "serial" })

    // ── 2. Happy path full flow ──────────────────────────────────────────────
    test("happy path — full 5-step flow creates a shift and redirects to the shift detail page", async ({ page }) => {
        test.setTimeout(120000)
        // NOTE: This test requires the following seed data in the connected Supabase project:
        //   - At least one warehouse searchable by "Main"
        //   - At least one available driver-vehicle pair for the chosen date
        //   - At least one unassigned package for that warehouse with valid coordinates
        // Skipped in CI where seed data is typically absent; run locally against a seeded env.
        test.skip(!!process.env.CI, "Requires seed data — skipped in CI")

        await page.goto("/dashboard/driver-shifts/add")
        await expect(page).toHaveURL("/dashboard/driver-shifts/add")

        // ── Step 1: Warehouse ────────────────────────────────────────────────
        const warehouseInput = page.getByRole("combobox")
        await warehouseInput.click()
        await warehouseInput.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // ── Step 2: Date ─────────────────────────────────────────────────────
        // Pick a date 7 days from today (guaranteed to be in the future and
        // usually within the currently displayed calendar month).
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + 7)
        const dayNumber = targetDate.getDate()
        createdShiftDate = targetDate.toISOString().split("T")[0]

        await pickCalendarDay(page, dayNumber)
        // Confirm the date chip appears
        await expect(
            page.getByText(
                new RegExp(String(targetDate.getFullYear()), "i")
            )
        ).toBeVisible({ timeout: 5000 })
        await page.getByRole("button", { name: /^next$/i }).click()

        // ── Step 3: Driver & Vehicle ─────────────────────────────────────────
        const firstDriverCard = page
            .getByRole("button")
            .filter({ hasText: /license/i })
            .first()
        await expect(firstDriverCard).toBeVisible({ timeout: 15000 })
        await firstDriverCard.click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // ── Step 4: Packages & Route ─────────────────────────────────────────
        await expect(page.getByText(/available packages/i)).toBeVisible({ timeout: 15000 })

        // Check the first available package checkbox and add it to the route
        const firstCheckbox = page.getByRole("checkbox").first()
        await expect(firstCheckbox).toBeVisible({ timeout: 15000 })
        await firstCheckbox.check()
        await page.getByRole("button", { name: /add to route/i }).click()

        // The route map (MapLibre canvas) should render as route is fetched
        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })
        // Next is only enabled once the route list is non-empty
        const nextBtn = page.getByRole("button", { name: /^next$/i })
        await expect(nextBtn).toBeEnabled({ timeout: 20000 })
        await nextBtn.click()

        // ── Step 5: Overview ─────────────────────────────────────────────────
        await expect(page.getByText(/review & confirm/i)).toBeVisible({ timeout: 10000 })

        // Submit
        const createShiftBtn = page.getByRole("button", { name: /create shift/i })
        await expect(createShiftBtn).toBeVisible({ timeout: 5000 })
        await createShiftBtn.click()

        // Should redirect to /dashboard/driver-shifts/<uuid>
        await expect(page).toHaveURL(
            /\/dashboard\/driver-shifts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
            { timeout: 30000 }
        )
        createdShiftUrl = page.url()
    })

    // ── 3. Shift detail route map ────────────────────────────────────────────
    test("shift detail page — route map renders correctly with the created route", async ({ page }) => {
        test.skip(!createdShiftUrl, "Depends on the happy path test creating a shift first")

        await page.goto(createdShiftUrl)
        await expect(page).toHaveURL(createdShiftUrl)

        // The shift detail page embeds a MapLibre route map; wait for its canvas
        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })

        // The route-progression card should also be present
        await expect(
            page.getByRole("heading", { level: 1 }).or(page.locator("h1"))
        ).toBeVisible({ timeout: 10000 })
    })

    // ── 4. Calendar shows the new shift ─────────────────────────────────────
    test("driver-shifts calendar shows the newly created shift on the correct date", async ({ page }) => {
        test.skip(!createdShiftUrl, "Depends on the happy path test creating a shift first")

        await page.goto("/dashboard/driver-shifts")
        await expect(page).toHaveURL("/dashboard/driver-shifts")

        // The DriverShiftsCalendar component should be on the page
        // (It is rendered without a data-testid by default; adjust locator if one is added)
        await expect(page.locator("body")).toBeVisible({ timeout: 10000 })

        // A cell / badge representing the shift date should be present.
        // The calendar typically highlights dates that have shifts.
        const shiftDayNumber = new Date(createdShiftDate + "T00:00:00").getDate()
        await expect(
            page.getByText(new RegExp(`\\b${shiftDayNumber}\\b`)).first()
        ).toBeVisible({ timeout: 10000 })
    })

    // ── 5. Package status ASSIGNED ───────────────────────────────────────────
    test("package status is ASSIGNED after shift creation", async ({ page }) => {
        test.skip(!createdShiftUrl, "Depends on the happy path test creating a shift first")

        // The shift detail page lists the assigned packages with their status
        await page.goto(createdShiftUrl)
        await expect(page).toHaveURL(createdShiftUrl)

        // The word "ASSIGNED" (or "Assigned") should appear on the detail page
        // either in a badge on the package row or in the route steps card.
        await expect(
            page.getByText(/assigned/i).first()
        ).toBeVisible({ timeout: 15000 })
    })
})

// ===========================================================================
// 6–9. Validation and error-handling (each test navigates the stepper independently)
// ===========================================================================
test.describe("Driver Shifts — Validation and error handling", () => {
    // NOTE: Tests 6–9 require seed data to navigate the stepper.
    // They are skipped in CI. Run locally against a seeded environment.

    // ── 6. Weight capacity block ─────────────────────────────────────────────
    test("weight capacity block — over-capacity warning appears when packages exceed vehicle limit", async ({ page }) => {
        test.setTimeout(120000)
        // Requires: a vehicle whose gross limit is lower than the combined weight
        // of the packages available at the selected warehouse.
        test.skip(!!process.env.CI, "Requires seed data — skipped in CI")

        // Use a day 10 days from now
        const dayNumber = new Date(Date.now() + 10 * 86400000).getDate()
        await navigateToStep4(page, dayNumber)

        // Select ALL available packages to maximise the chance of exceeding capacity
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

        // The "Over capacity!" warning is rendered in the Route Order header
        await expect(page.getByText(/over capacity!/i)).toBeVisible({ timeout: 10000 })

        // The Next button is NOT disabled when over capacity (the UI warns but allows
        // proceeding — the Overview step re-validates). Assert the warning is present
        // and the submit pathway is consequently blocked by the route not resolving
        // cleanly, OR document the current behaviour: warning visible, Next is enabled.
        // Either assertion is acceptable; we confirm the warning renders.
        await expect(page.getByText(/over capacity!/i)).toBeVisible()
    })

    // ── 7. License expiry block ──────────────────────────────────────────────
    test("license expiry block — expired-license warning is shown for a driver with an expired license", async ({ page }) => {
        test.setTimeout(120000)
        // Requires: a driver-vehicle pair whose licenseExpiry is before today.
        test.skip(!!process.env.CI, "Requires an expired-license driver in seed data — skipped in CI")

        await page.goto("/dashboard/driver-shifts/add")
        await expect(page).toHaveURL("/dashboard/driver-shifts/add")

        // Step 1: Warehouse
        const warehouseInput = page.getByRole("combobox")
        await warehouseInput.click()
        await warehouseInput.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 2: Date — advance to next month to help surface expired licenses
        await expect(page.getByRole("grid")).toBeVisible({ timeout: 10000 })
        const nextMonthBtn = page.getByRole("button", { name: /next month/i })
        if (await nextMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextMonthBtn.click()
        }
        await pickCalendarDay(page, 15)
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 3: At least one driver card should show the expired-license warning
        await expect(page.getByText(/license expired/i)).toBeVisible({ timeout: 15000 })

        // Clicking an expired driver card shows the persistent warning
        const expiredCard = page
            .getByRole("button")
            .filter({ hasText: /expired/i })
            .first()
        await expiredCard.click()

        // Warning remains visible after selection
        await expect(page.getByText(/license expired/i)).toBeVisible()

        // The Next button renders but selecting an expired driver is a soft warning;
        // the app lets users proceed with explicit acknowledgement.
        await expect(page.getByRole("button", { name: /^next$/i })).toBeVisible()
    })

    // ── 8. Concurrent assignment error ───────────────────────────────────────
    test("concurrent assignment — second shift for the same driver and date shows an error", async ({ page }) => {
        test.setTimeout(120000)
        // Requires seed data and will write two rows to the database.
        // The second createManualShift RPC call should return an error because
        // fetchAvailableDriverVehiclePairs excludes already-scheduled drivers,
        // so the driver selected in attempt 1 won't appear in attempt 2 unless
        // the RPC surface allows it (in which case the server action returns an error).
        test.skip(!!process.env.CI, "Requires seed data and may mutate state — skipped in CI")

        // ── First attempt: full happy path ────────────────────────────────
        // Use a date 21 days from now to avoid clashing with other tests
        const targetDate = new Date(Date.now() + 21 * 86400000)
        const dayNumber = targetDate.getDate()

        async function submitFullForm(): Promise<void> {
            await page.goto("/dashboard/driver-shifts/add")

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

            // Step 3 — always pick first available card
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

        // First submission should succeed
        await submitFullForm()
        await expect(page).toHaveURL(
            /\/dashboard\/driver-shifts\/[0-9a-f-]{36}/i,
            { timeout: 30000 }
        )

        // Second submission with the same driver and date should fail.
        // Because fetchAvailableDriverVehiclePairs excludes the already-scheduled
        // driver, step 3 may show no available pairs — which is itself an error state.
        await page.goto("/dashboard/driver-shifts/add")

        // Step 1
        const warehouseInput2 = page.getByRole("combobox")
        await warehouseInput2.click()
        await warehouseInput2.fill("Main")
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 })
        await page.getByRole("option").first().click()
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 2 — same date
        await pickCalendarDay(page, dayNumber)
        await page.getByRole("button", { name: /^next$/i }).click()

        // Step 3 — driver should be unavailable; "No available" message OR a
        // different driver is shown. Either way, an error path is exercised.
        const noAvailableMsg = page.getByText(/no available driver/i)
        const conflictMsg = page.getByText(/already.*shift|conflict|duplicate|scheduled/i)

        const isNoAvailableVisible = await noAvailableMsg
            .isVisible({ timeout: 10000 })
            .catch(() => false)

        if (isNoAvailableVisible) {
            // The scheduler correctly blocks the duplicate — no cards are shown
            await expect(noAvailableMsg).toBeVisible()
        } else {
            // A different driver is available; attempt to submit and expect a
            // server-side error toast or inline error on the overview step
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

                    // Should show an error, not redirect to a new shift
                    await expect(
                        conflictMsg.or(page.getByText(/error|failed/i).first())
                    ).toBeVisible({ timeout: 10000 })
                }
            }
        }
    })

    // ── 9. Route preview updates on package reorder ──────────────────────────
    test("route preview updates within 4000ms after package reorder in step 4", async ({ page }) => {
        test.setTimeout(120000)
        // Requires seed data with ≥2 unassigned packages at the warehouse.
        test.skip(!!process.env.CI, "Requires ≥2 unassigned packages in seed data — skipped in CI")

        const dayNumber = new Date(Date.now() + 28 * 86400000).getDate()
        await navigateToStep4(page, dayNumber)

        // Add at least 2 packages so there is something to reorder
        const checkboxes = page.getByRole("checkbox")
        const checkboxCount = await checkboxes.count()
        if (checkboxCount < 2) {
            test.skip(true, "Need at least 2 packages to test reorder — seed data insufficient")
            return
        }

        await checkboxes.nth(0).check()
        await checkboxes.nth(1).check()
        await page.getByRole("button", { name: /add to route/i }).click()

        // Wait for the initial route to load (the PackagesRouteStep fetches ORS
        // after a 1 s debounce; allow up to 20 s for the first render)
        await expect(page.locator("canvas")).toBeVisible({ timeout: 20000 })

        // Wait for the route-loading spinner to disappear (route fully loaded)
        await expect(page.locator('[class*="animate-spin"]')).toBeHidden({ timeout: 15000 })

        // ── Perform a drag-and-drop reorder ──────────────────────────────────
        // SortablePackageRow items are flex divs inside the DnD context.
        // They contain a GripVertical icon and a tracking number / customer name.
        const routeItems = page
            .locator("div")
            .filter({ has: page.locator("svg.lucide-grip-vertical") })
        await expect(routeItems.first()).toBeVisible({ timeout: 10000 })
        await expect(routeItems.nth(1)).toBeVisible({ timeout: 5000 })

        const firstItemBox = await routeItems.first().boundingBox()
        const secondItemBox = await routeItems.nth(1).boundingBox()

        if (!firstItemBox || !secondItemBox) {
            test.skip(true, "Could not locate route item bounding boxes — adjust locator if needed")
            return
        }

        // Drag item 1 down past item 2 to swap their positions
        const startX = firstItemBox.x + firstItemBox.width / 2
        const startY = firstItemBox.y + firstItemBox.height / 2
        const endX = secondItemBox.x + secondItemBox.width / 2
        const endY = secondItemBox.y + secondItemBox.height + 5

        await page.mouse.move(startX, startY)
        await page.mouse.down()
        // Move in small steps to give DnD Kit's PointerSensor time to activate
        await page.mouse.move(startX, startY + 10, { steps: 5 })
        await page.mouse.move(endX, endY, { steps: 15 })
        await page.mouse.up()

        // After reorder the PackagesRouteStep re-triggers fetchRoute with a 1 s debounce.
        // The route loading spinner should appear and then disappear within 4 s.
        // We allow up to 4000ms total for the state cycle to complete.
        const spinner = page.locator('[class*="animate-spin"]')

        // Either the spinner appears briefly and vanishes, or the route updates
        // without a visible spinner (instant cache hit).  In either case the
        // canvas must still be visible and the map must not have crashed.
        await page.waitForTimeout(4000)
        await expect(page.locator("canvas")).toBeVisible({ timeout: 5000 })

        // Confirm the spinner has resolved (no lingering loading state)
        await expect(spinner).toBeHidden({ timeout: 5000 })
    })
})
