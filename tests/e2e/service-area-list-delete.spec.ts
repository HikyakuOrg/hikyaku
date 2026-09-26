import { expect, test, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * The same GeoJSON upload the add spec uses. Uploading a fixed polygon rather
 * than drawing one keeps the created area at known coordinates, so the map on
 * the list page has something predictable to draw.
 */
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
 * The list shows every area in the organisation, so an area created by this run
 * can sit on any page of it. Walk forward until the row shows up. Returns false
 * when it is on none of them, which is what the post-delete assertion wants.
 */
async function openListPageContaining(page: Page, name: string): Promise<boolean> {
    const table = page.getByTestId("service-areas-table")
    const emptyPanel = page.getByTestId("service-areas-empty")

    // Deleting the last area in an organisation replaces the whole explorer with
    // the empty state, which is also an answer to "is this area listed".
    await expect(table.or(emptyPanel)).toBeVisible()

    if (await emptyPanel.count() > 0) {
        return false
    }

    const nextButton = table.getByRole("button", { name: "Next" })

    // Bounded rather than while(true): a pager that stops advancing should fail
    // the test, not hang it.
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

        // The list is the point of this page: an area is reachable from it
        // whether or not the map happens to be panned over the area.
        expect(await openListPageContaining(page, serviceAreaName)).toBe(true)

        // The map opens fitted to the whole organisation, so a newly drawn area
        // is inside the first viewport it fetches.
        await expect(page.getByTestId("service-areas-map-summary")).toContainText(serviceAreaName)

        // Picking the row is what focuses the map on that area, so the row has to
        // register as selected rather than navigate away.
        const row = page.getByTestId("service-areas-table").locator("tr", { hasText: serviceAreaName })
        await row.getByRole("checkbox").click()
        await expect(row).toHaveAttribute("data-state", "selected")

        await page.getByRole("button", { name: `Delete ${serviceAreaName}` }).click()

        // Naming the area in the confirmation is the whole safeguard: the row was
        // reached by paging a list, not by looking at the polygon.
        await expect(page.getByTestId("service-area-delete-confirmation-title")).toContainText(serviceAreaName)
        await expect(page.getByTestId("service-area-delete-confirmation-description")).toContainText(serviceAreaName)

        await page.getByTestId("service-area-delete-confirmation-ok").click()

        await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)

        // Gone from the map, which re-reads its viewport after the delete...
        await expect(page.getByTestId("service-areas-map-summary")).not.toContainText(serviceAreaName)

        // ...and gone from every page of the list, not just the one on screen.
        await expect(page.getByRole("cell", { name: serviceAreaName, exact: true })).toHaveCount(0)
        expect(await openListPageContaining(page, serviceAreaName)).toBe(false)

        // And still gone after a fresh server read, which is what proves the row
        // was actually retired rather than only dropped from local state.
        await page.reload()
        expect(await openListPageContaining(page, serviceAreaName)).toBe(false)
    })

    test("keeps several rows ticked at once", async ({ page }) => {
        // Two areas to create and two to delete, each a round trip.
        test.setTimeout(120_000)

        // One shared stamp so the two names sort next to each other, and the
        // list, which is ordered by name, walks forward from the first to the
        // second.
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

        // Ticking the second must not untick the first. The two can straddle a
        // page break, so step back until the first is listed again.
        const previousButton = table.getByRole("button", { name: "Previous" })
        for (let steps = 0; await rowFor(names[0]).count() === 0 && steps < 50; steps += 1) {
            await previousButton.click()
        }
        await expect(rowFor(names[0])).toHaveAttribute("data-state", "selected")

        await page.goto(d('/service/areas'))

        for (const name of names) {
            expect(await openListPageContaining(page, name)).toBe(true)
            await page.getByRole("button", { name: `Delete ${name}` }).click()
            await page.getByTestId("service-area-delete-confirmation-ok").click()
            await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)
        }
    })
})
