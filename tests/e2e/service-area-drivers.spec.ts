import { expect, test, type Locator, type Page } from "@playwright/test"
import { d } from "./helpers/org-url"

/**
 * The same GeoJSON upload the add and delete specs use. Uploading a fixed
 * polygon rather than drawing one keeps the created area at known coordinates.
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

/**
 * The list shows every area in the organisation, so an area created by this run
 * can sit on any page of it. Walk forward until the row shows up.
 */
async function openListPageContaining(page: Page, name: string): Promise<boolean> {
    const table = page.getByTestId("service-areas-table")
    await expect(table.or(page.getByTestId("service-areas-empty"))).toBeVisible()

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

/**
 * Wait for a driver table to settle, and say what it settled on.
 *
 * The table renders skeleton rows while loading, which have the same shape as
 * real ones and no text, so "is there a first row" is not the question. This
 * distinguishes the three states the picker can be in.
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

/** The detach control carries the driver's name, so it doubles as the row probe. */
function detachButton(page: Page, driverName: string) {
    return page.getByRole("button", { name: `Detach ${driverName}`, exact: true })
}

test.describe("Service Area Drivers", () => {
    test("attaches drivers, keeps them across a reload, then detaches one", async ({ page }) => {
        test.setTimeout(180000)

        const serviceAreaName = `Coverage Area ${Date.now()}`
        await createServiceArea(page, serviceAreaName)

        // Opening a row from the list is part of what this covers: the row-open
        // action was repointed from the edit route to this detail page.
        await page.goto(d('/service/areas'))
        expect(await openListPageContaining(page, serviceAreaName)).toBe(true)

        const listRow = page.getByTestId("service-areas-table").locator("tr", { hasText: serviceAreaName })
        // The name cell rather than the row: the checkbox and the delete button
        // both stop the click from reaching the row handler.
        await listRow.locator("td").nth(1).click()

        await expect(page).toHaveURL(/\/service\/areas\/[0-9a-f-]{36}$/)
        await expect(page.getByTestId("service-area-detail-name")).toHaveText(serviceAreaName)

        // A brand new area is covered by nobody, which is a normal state with a
        // real consequence, so it gets a real panel rather than a blank table.
        await expect(page.getByTestId("service-area-drivers-empty")).toBeVisible({ timeout: 15000 })
        await expect(page.getByTestId("service-area-floater-note")).toContainText("floater")

        // ── Attach ───────────────────────────────────────────────────────────
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

        // The sheet closes only after the write resolves, so its disappearance is
        // already an assertion that the insert was not merely fired and forgotten:
        // a refused write leaves it open with an error toast.
        await expect(sheet).toHaveCount(0, { timeout: 20000 })

        for (const name of attachedNames) {
            await expect(detachButton(page, name)).toBeVisible()
        }
        await expect(page.getByTestId("service-area-drivers-empty")).toHaveCount(0)

        // ── Still attached after a fresh read ────────────────────────────────
        await page.reload()

        for (const name of attachedNames) {
            await expect(detachButton(page, name)).toBeVisible({ timeout: 20000 })
        }

        // Attaching the same driver twice is not offered in the first place: the
        // picker excludes whoever already covers this area.
        await page.getByTestId("attach-drivers-button").click()
        await expect(sheet).toBeVisible()
        await waitForDriverTable(sheet)

        for (const name of attachedNames) {
            await expect(sheet.locator("tbody tr", { hasText: name })).toHaveCount(0)
        }

        await page.keyboard.press("Escape")
        await expect(sheet).toHaveCount(0)

        // ── Detach ───────────────────────────────────────────────────────────
        const [detachedName, ...stillAttachedNames] = attachedNames

        await detachButton(page, detachedName).click()

        await expect(page.getByTestId("service-area-detach-confirmation-title")).toContainText(detachedName)
        // The one thing a dispatcher must not assume about detach: it is not a
        // re-route, and today's stops stay where they are.
        await expect(page.getByTestId("service-area-detach-confirmation-description"))
            .toContainText("does not move work that already exists")

        await page.getByTestId("service-area-detach-confirmation-ok").click()
        await expect(page.getByTestId("service-area-detach-confirmation-title")).toHaveCount(0)

        await expect(detachButton(page, detachedName)).toHaveCount(0)

        // And still gone after a fresh read, which is what proves the link row
        // was deleted rather than only dropped from local state.
        await page.reload()
        await expect(page.getByTestId("service-area-drivers")).toBeVisible({ timeout: 20000 })

        for (const name of stillAttachedNames) {
            await expect(detachButton(page, name)).toBeVisible({ timeout: 20000 })
        }

        if (stillAttachedNames.length === 0) {
            // Detaching the last driver puts the area back in the state it
            // started in, floater note and all.
            await expect(page.getByTestId("service-area-drivers-empty")).toBeVisible({ timeout: 20000 })
        }

        await expect(detachButton(page, detachedName)).toHaveCount(0)

        // ── Cleanup ──────────────────────────────────────────────────────────
        // Best effort, so repeated runs do not pile up areas. Retiring the area
        // keeps its remaining coverage rows, which is the documented behaviour of
        // the soft delete rather than something this spec needs to undo.
        await page.goto(d('/service/areas'))
        if (await openListPageContaining(page, serviceAreaName)) {
            await page.getByRole("button", { name: `Delete ${serviceAreaName}`, exact: true }).click()
            await page.getByTestId("service-area-delete-confirmation-ok").click()
            await expect(page.getByTestId("service-area-delete-confirmation-title")).toHaveCount(0)
        }
    })
})
