import { expect, test, type Locator, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/** Opening a row waits for the server render, which often takes over 5s in dev. */
const NAVIGATION_TIMEOUT = 45000

/** Upload a fixed polygon, like the add and delete specs, so the area has known coordinates. */
const SERVICE_AREA_GEOJSON = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [144.94, -37.81],
                    [144.95, -37.81],
                    [144.95, -37.8],
                    [144.94, -37.8],
                    [144.94, -37.81],
                ]],
            },
            properties: {
                name: "Coverage Boundary",
            },
        },
    ],
}

async function createServiceArea(page: Page, name: string) {
    await page.goto(d('/service/areas/add'))

    await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="service-area-map-container"] canvas') as HTMLCanvasElement | null
        return Boolean(canvas && canvas.width > 0 && canvas.height > 0)
    })

    await page.getByTestId("service-area-name-input").fill(name)
    await page.getByTestId("service-area-upload-input").setInputFiles({
        name: "coverage-boundary.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify(SERVICE_AREA_GEOJSON)),
    })

    const submitButton = page.getByTestId("service-area-submit-button")
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    await expect(page.getByTestId("service-area-last-submission")).toContainText(name)
}

/** The new area can be on any page of the list. Go forward until the row shows. */
async function openListPageContaining(page: Page, name: string): Promise<boolean> {
    const table = page.getByTestId("service-areas-table")
    await expect(table.or(page.getByTestId("service-areas-empty"))).toBeVisible()

    const nextButton = table.getByRole("button", { name: "Next" })

    // Bounded, so a stuck pager fails the test instead of hanging it.
    for (let visitedPages = 0; visitedPages < 50; visitedPages += 1) {
        if (await page.getByRole("cell", { name, exact: true }).count() > 0) {
            return true
        }

        if (await nextButton.isDisabled()) {
            return false
        }

        await nextButton.click()
    }

    throw new Error(`Paged through 50 pages of service areas without reaching the end looking for "${name}".`)
}

/**
 * Wait for a driver table to load and return its state. Skeleton rows have no
 * text, so a first row alone does not mean the table loaded.
 */
async function waitForDriverTable(scope: Locator): Promise<"loaded" | "empty"> {
    const noResults = scope.getByRole("cell", { name: "No results." })
    const firstNameCell = scope.locator("tbody tr").first().locator("td").nth(1)

    await expect
        .poll(async () => {
            if (await noResults.count() > 0) {
                return "empty"
            }

            const name = (await firstNameCell.textContent().catch(() => "")) ?? ""
            return name.trim().length > 0 ? "loaded" : "loading"
        }, {
            timeout: 20000,
            message: "The driver table never finished loading.",
        })
        .not.toBe("loading")

    return await noResults.count() > 0 ? "empty" : "loaded"
}

/** The detach button has the driver's name, so it also finds the row. */
function detachButton(page: Page, driverName: string) {
    return page.getByRole("button", { name: `Detach ${driverName}`, exact: true })
}

test.describe("Service Area Drivers", () => {
    test("attaches drivers, keeps them across a reload, then detaches one", async ({ page }) => {
        test.setTimeout(180000)

        const serviceAreaName = `Coverage Area ${Date.now()}`
        await createServiceArea(page, serviceAreaName)

        // A row opens this detail page, not the edit page.
        await page.goto(d('/service/areas'))
        expect(await openListPageContaining(page, serviceAreaName)).toBe(true)

        const listRow = page.getByTestId("service-areas-table").locator("tr", { hasText: serviceAreaName })
        // Click the name cell. The checkbox and delete button stop row clicks.
        await listRow.locator("td").nth(1).click()

        await expect(page).toHaveURL(/\/service\/areas\/[0-9a-f-]{36}$/, { timeout: NAVIGATION_TIMEOUT })
        await expect(page.getByTestId("service-area-detail-name")).toHaveText(serviceAreaName)

        // A new area has no drivers, so the empty panel shows.
        await expect(page.getByTestId("service-area-drivers-empty")).toBeVisible({ timeout: 15000 })
        await expect(page.getByTestId("service-area-floater-note")).toContainText("floater")

        // Attach
        await page.getByTestId("attach-drivers-button").click()

        const sheet = page.getByTestId("attach-drivers-sheet")
        await expect(sheet).toBeVisible()

        const pickerState = await waitForDriverTable(sheet)
        test.skip(pickerState === "empty", "Requires at least one driver in the test organisation")

        const pickerRows = sheet.locator("tbody tr")
        const attachCount = Math.min(await pickerRows.count(), 2)
        const attachedNames: string[] = []

        for (let index = 0; index < attachCount; index += 1) {
            const row = pickerRows.nth(index)
            const name = ((await row.locator("td").nth(1).textContent()) ?? "").trim()
            attachedNames.push(name)
            await row.getByRole("checkbox").click()
        }

        await expect(page.getByTestId("attach-drivers-selection-count"))
            .toContainText(`${attachedNames.length} selected`)

        await page.getByTestId("attach-drivers-confirm").click()

        // The sheet closes only after the write succeeds. A failed write keeps it
        // open with an error toast.
        await expect(sheet).toHaveCount(0, { timeout: 20000 })

        for (const name of attachedNames) {
            await expect(detachButton(page, name)).toBeVisible()
        }
        await expect(page.getByTestId("service-area-drivers-empty")).toHaveCount(0)

        // Still attached after a fresh read
        await page.reload()

        for (const name of attachedNames) {
            await expect(detachButton(page, name)).toBeVisible({ timeout: 20000 })
        }

        // The picker does not list drivers who already cover this area.
        await page.getByTestId("attach-drivers-button").click()
        await expect(sheet).toBeVisible()
        await waitForDriverTable(sheet)

        for (const name of attachedNames) {
            await expect(sheet.locator("tbody tr", { hasText: name })).toHaveCount(0)
        }

        await page.keyboard.press("Escape")
        await expect(sheet).toHaveCount(0)

        // Detach
        const [detachedName, ...stillAttachedNames] = attachedNames

        await detachButton(page, detachedName).click()

        await expect(page.getByTestId("service-area-detach-confirmation-title")).toContainText(detachedName)
        // Detach does not move stops that already exist.
        await expect(page.getByTestId("service-area-detach-confirmation-description"))
            .toContainText("does not move work that already exists")

        await page.getByTestId("service-area-detach-confirmation-ok").click()
        await expect(page.getByTestId("service-area-detach-confirmation-title")).toHaveCount(0)

        await expect(detachButton(page, detachedName)).toHaveCount(0)

        // Still gone after a reload, so the row was deleted.
        await page.reload()
        await expect(page.getByTestId("service-area-drivers")).toBeVisible({ timeout: 20000 })

        for (const name of stillAttachedNames) {
            await expect(detachButton(page, name)).toBeVisible({ timeout: 20000 })
        }

        if (stillAttachedNames.length === 0) {
            // With no drivers left, the empty panel shows again.
            await expect(page.getByTestId("service-area-drivers-empty")).toBeVisible({ timeout: 20000 })
        }

        await expect(detachButton(page, detachedName)).toHaveCount(0)

        // Cleanup
        // Best effort, so runs do not leave areas behind. The soft delete keeps
        // the remaining driver links, as designed.
        await page.goto(d('/service/areas'))
        if (await openListPageContaining(page, serviceAreaName)) {
            await page.getByTestId("service-areas-table")
                .locator("tr", { hasText: serviceAreaName })
                .getByRole("checkbox")
                .click()
            await page.getByTestId("service-areas-delete-selected").click()
            await page.getByTestId("service-area-delete-confirmation-ok").click()
            await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)
        }
    })
})
