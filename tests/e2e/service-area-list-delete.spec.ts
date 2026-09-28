import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/** Upload a fixed polygon, like the add spec, so the area has known coordinates. */
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
                name: "List Boundary",
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
        name: "list-boundary.geojson",
        mimeType: "application/geo+json",
        buffer: Buffer.from(JSON.stringify(SERVICE_AREA_GEOJSON)),
    })

    const submitButton = page.getByTestId("service-area-submit-button")
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    await expect(page.getByTestId("service-area-last-submission")).toContainText(name)
}

/**
 * The new area can be on any page of the list. Go forward until the row shows.
 * Returns false when no page has it.
 */
async function openListPageContaining(page: Page, name: string): Promise<boolean> {
    const table = page.getByTestId("service-areas-table")
    const emptyPanel = page.getByTestId("service-areas-empty")

    // With no areas left, the empty state replaces the list. The area is not listed.
    await expect(table.or(emptyPanel)).toBeVisible()

    if (await emptyPanel.count() > 0) {
        return false
    }

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

test.describe("Service Area List And Delete", () => {
    test("lists a new area, focuses it from the row, then deletes it", async ({ page }) => {
        const serviceAreaName = `List Delete Area ${Date.now()}`

        await createServiceArea(page, serviceAreaName)

        await page.goto(d('/service/areas'))

        // The list shows the area wherever the map is.
        expect(await openListPageContaining(page, serviceAreaName)).toBe(true)

        // The map opens on the whole organisation, so the new area is in view.
        await expect(page.getByTestId("service-areas-map-summary")).toContainText(serviceAreaName)

        // Clicking the row selects it and moves the map to it. It does not open a page.
        const row = page.getByTestId("service-areas-table").locator("tr", { hasText: serviceAreaName })
        await row.getByRole("checkbox").click()
        await expect(row).toHaveAttribute("data-state", "selected")

        // One delete button above the list deletes the ticked rows.
        await page.getByTestId("service-areas-delete-selected").click()

        // The confirmation names the area, because the user may not see it on the map.
        await expect(page.getByTestId("service-area-delete-confirmation-title")).toContainText(serviceAreaName)
        await expect(page.getByTestId("service-area-delete-confirmation-description")).toContainText(serviceAreaName)

        await page.getByTestId("service-area-delete-confirmation-ok").click()

        await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)

        // Gone from the map
        await expect(page.getByTestId("service-areas-map-summary")).not.toContainText(serviceAreaName)

        // and from every page of the list.
        await expect(page.getByRole("cell", { name: serviceAreaName, exact: true })).toHaveCount(0)
        expect(await openListPageContaining(page, serviceAreaName)).toBe(false)

        // Still gone after a reload, so the row was deleted.
        await page.reload()
        expect(await openListPageContaining(page, serviceAreaName)).toBe(false)
    })

    test("keeps several rows ticked at once", async ({ page }) => {
        // Creates and deletes two areas.
        test.setTimeout(120_000)

        // One timestamp, so the names sort next to each other in the list.
        const stamp = Date.now()
        const names = [`Multi Select Area ${stamp} A`, `Multi Select Area ${stamp} B`]

        for (const name of names) {
            await createServiceArea(page, name)
        }

        await page.goto(d('/service/areas'))

        const table = page.getByTestId("service-areas-table")
        const rowFor = (name: string) => table.locator("tr", { hasText: name })

        for (const name of names) {
            expect(await openListPageContaining(page, name)).toBe(true)
            await rowFor(name).getByRole("checkbox").click()
            await expect(rowFor(name)).toHaveAttribute("data-state", "selected")
        }

        // Ticking the second must not untick the first. They can be on different
        // pages, so go back until the first shows.
        const previousButton = table.getByRole("button", { name: "Previous" })
        for (let steps = 0; await rowFor(names[0]).count() === 0 && steps < 50; steps += 1) {
            await previousButton.click()
        }
        await expect(rowFor(names[0])).toHaveAttribute("data-state", "selected")

        // One delete removes both, even across pages.
        const deleteSelected = page.getByTestId("service-areas-delete-selected")
        await expect(deleteSelected).toHaveText(/\(2\)/)
        await deleteSelected.click()

        await expect(page.getByTestId("service-area-delete-confirmation-title")).toContainText("2 service areas")
        for (const name of names) {
            await expect(page.getByTestId("service-area-delete-confirmation-list")).toContainText(name)
        }

        await page.getByTestId("service-area-delete-confirmation-ok").click()
        await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)
        await expect(deleteSelected).toBeDisabled()

        await page.reload()
        for (const name of names) {
            expect(await openListPageContaining(page, name)).toBe(false)
        }
    })
})
