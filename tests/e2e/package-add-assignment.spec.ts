import { test, expect, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * The add-package wizard now posts to POST /api/v1/packages, which creates the
 * package and assigns it to a shift in the same request, then reports the
 * outcome in the success panel. These specs cover that panel.
 *
 * Like the other API-backed specs, they run against a seeded environment with
 * hikyaku-api reachable, and skip in CI where neither is true.
 */

const SEED_HINT =
    "Requires seed data and a reachable hikyaku-api — skipped in CI"

/**
 * Fill steps 1–3 of the add-package wizard and stop on the Overview step.
 *
 * `warehouseSearch` picks which warehouse the package is dispatched from, which
 * is what decides whether there is a shift with room for it.
 */
async function fillWizardToOverview(page: Page, warehouseSearch: string): Promise<void> {
    await page.goto(d("/packages/add"))
    await expect(page).toHaveURL(d("/packages/add"))

    // ── Step 1: Package info ─────────────────────────────────────────────────
    await page.locator("#stepper-form-weight").fill("2.5")
    await page.getByPlaceholder("Length").fill("30")
    await page.getByPlaceholder("Width").fill("20")
    await page.getByPlaceholder("Height").fill("15")
    await page.getByRole("button", { name: /^next$/i }).click()

    // ── Step 2: Sender and receiver ──────────────────────────────────────────
    // Two identical comboboxes: sender first, receiver second.
    const customerInputs = page.getByPlaceholder(/search customers by name/i)
    await expect(customerInputs.first()).toBeVisible({ timeout: 15000 })

    for (const index of [0, 1]) {
        const input = customerInputs.nth(index)
        await input.click()
        await input.fill("a")
        const option = page.getByRole("option").first()
        await expect(option).toBeVisible({ timeout: 15000 })
        await option.click()
    }

    await page.getByRole("button", { name: /^next$/i }).click()

    // ── Step 3: Logistics assignment ─────────────────────────────────────────
    const warehouseInput = page.getByPlaceholder(/search warehouse by name or address/i)
    await warehouseInput.click()
    await warehouseInput.fill(warehouseSearch)
    const warehouseOption = page.getByRole("option").first()
    await expect(warehouseOption).toBeVisible({ timeout: 15000 })
    await warehouseOption.click()
    await page.getByRole("button", { name: /^next$/i }).click()

    // ── Step 4: Overview ─────────────────────────────────────────────────────
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible({
        timeout: 10000,
    })
}

test.describe("Package add — assignment outcome", () => {
    test("success panel reports which shift the package landed on", async ({ page }) => {
        test.setTimeout(120000)
        // NOTE: requires at least one customer, one warehouse searchable by
        // "Main", and a driver/vehicle pair free at that warehouse today — the
        // last one is what lets assignment succeed rather than defer.
        test.skip(!!process.env.CI, SEED_HINT)

        await fillWizardToOverview(page, "Main")
        await page.getByRole("button", { name: /^submit$/i }).click()

        // The panel replaces the form; the API generates the tracking number, so
        // it is read back from the response rather than echoed from the form.
        await expect(page.getByRole("heading", { name: /package added/i })).toBeVisible({
            timeout: 30000,
        })
        await expect(page.getByText(/tracking number/i)).toBeVisible()

        // Assignment either succeeded or was deferred — both are valid outcomes
        // of a 201, and both must render as prose rather than an enum.
        const assigned = page.getByText(/(assigned to .+'s shift|a new shift was opened for)/i)
        const queued = page.getByText(/queued — not on a shift yet/i)
        await expect(assigned.or(queued)).toBeVisible({ timeout: 10000 })

        if (await assigned.isVisible().catch(() => false)) {
            // Stop index is rendered one-based, and the ETA is the planner's, not
            // the customer deadline.
            await expect(page.getByText(/^Stop \d+$/)).toBeVisible()
            await expect(page.getByText(/^ETA \d{2}:\d{2}$/)).toBeVisible()
        } else {
            // A deferred package always carries a reason.
            await expect(
                page.getByText(
                    /(every shift running today is already full|no driver and van are free|allowance is used up|no map location|before the promised time)/i
                )
            ).toBeVisible()
        }

        // Whatever the outcome, the label is printable — the package exists.
        await expect(page.getByRole("button", { name: /print label/i })).toBeEnabled()
    })

    test("a warehouse with no spare capacity shows the package as queued", async ({ page }) => {
        test.setTimeout(120000)
        // Needs a warehouse deliberately saturated in seed data: every
        // driver/vehicle pair already on an open shift, and those shifts full.
        // Name it here so the spec can find it; without one there is no way to
        // force the deferred branch from the UI.
        const saturated = process.env.PLAYWRIGHT_SATURATED_WAREHOUSE
        test.skip(!saturated, "Set PLAYWRIGHT_SATURATED_WAREHOUSE to run this")
        test.skip(!!process.env.CI, SEED_HINT)

        await fillWizardToOverview(page, saturated as string)
        await page.getByRole("button", { name: /^submit$/i }).click()

        await expect(page.getByRole("heading", { name: /package added/i })).toBeVisible({
            timeout: 30000,
        })
        await expect(page.getByText(/queued — not on a shift yet/i)).toBeVisible()
        await expect(
            page.getByText(/(every shift running today is already full|no driver and van are free)/i)
        ).toBeVisible()

        // Queued is not an error: the package was still created and can still be
        // labelled and handled.
        await expect(page.getByRole("button", { name: /print label/i })).toBeEnabled()
    })
})
