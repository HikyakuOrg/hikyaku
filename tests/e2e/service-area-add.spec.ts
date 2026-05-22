import { expect, test } from "@playwright/test"
import { d } from "./helpers/org-url"

test.describe("Service Area Add Flow", () => {
    test("warns before replacing a drawn area with uploaded geojson", async ({ page }) => {
        const serviceAreaName = `Replacement Area ${Date.now()}`
        const response = await page.goto(d('/service/areas/add'))

        expect(response?.ok()).toBeTruthy()
        await expect(page).toHaveURL(d('/service/areas/add'))
        await page.waitForFunction(() => {
            const canvas = document.querySelector('[data-testid="service-area-map-container"] canvas') as HTMLCanvasElement | null
            return Boolean(canvas && canvas.width > 0 && canvas.height > 0)
        })

        const nameInput = page.getByTestId("service-area-name-input")
        await nameInput.fill(serviceAreaName)

        const mapContainer = page.getByTestId("service-area-map-container")
        await mapContainer.click({ position: { x: 120, y: 120 } })
        await mapContainer.click({ position: { x: 240, y: 120 } })
        await mapContainer.click({ position: { x: 240, y: 240 } })
        await mapContainer.dblclick({ position: { x: 120, y: 240 } })

        const geoJsonUploadInput = page.getByTestId("service-area-upload-input")
        await geoJsonUploadInput.setInputFiles({
            name: "replacement-boundary.geojson",
            mimeType: "application/geo+json",
            buffer: Buffer.from(JSON.stringify({
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
                            name: "Replacement Boundary",
                        },
                    },
                ],
            })),
        })

        await expect(page.getByText("Replace the current drawn area?")).toBeVisible()
        await expect(page.getByTestId("service-area-upload-confirmation-description")).toContainText("will remove the area you have already drawn")
        await page.getByTestId("service-area-upload-confirmation-ok").click()

        await expect(page.getByText("Replace the current drawn area?")).not.toBeVisible()
        await expect(page.getByRole("button", { name: "Draw Area" })).toBeDisabled()
        await expect(page.getByRole("button", { name: "Clear GeoJSON" })).toBeEnabled()
        await expect(page.getByTestId("service-area-submit-button")).toBeEnabled()

        await page.getByTestId("service-area-submit-button").click()
        await expect(page.getByTestId("service-area-last-submission")).toContainText(serviceAreaName)
    })

    test("uploads a geojson overlay and captures a screenshot", async ({ page }, testInfo) => {
        const serviceAreaName = `Test Service Area ${Date.now()}`
        const response = await page.goto(d('/service/areas/add'))

        expect(response?.ok()).toBeTruthy()
        await expect(page).toHaveURL(d('/service/areas/add'))
        await expect(
            page.getByRole("heading", { name: "Add Service Area", level: 1 })
        ).toBeVisible()

        const nameInput = page.getByTestId("service-area-name-input")
        await nameInput.fill(serviceAreaName)
        await expect(nameInput).toHaveValue(serviceAreaName)

        const mapContainer = page.getByTestId("service-area-map-container")
        await expect(mapContainer).toBeVisible()

        await page.waitForFunction(() => {
            const canvas = document.querySelector('[data-testid="service-area-map-container"] canvas') as HTMLCanvasElement | null
            return Boolean(canvas && canvas.width > 0 && canvas.height > 0)
        })

        const geoJsonUploadInput = page.getByTestId("service-area-upload-input")
        await geoJsonUploadInput.setInputFiles({
            name: "service-area-boundary.geojson",
            mimeType: "application/geo+json",
            buffer: Buffer.from(JSON.stringify({
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
                            name: "Test Boundary",
                        },
                    },
                ],
            })),
        })

        await expect(page.getByRole("button", { name: "Draw Area" })).toBeDisabled()
        await expect(page.getByRole("button", { name: "Clear GeoJSON" })).toBeEnabled()
        await expect(page.getByTestId("service-area-submit-button")).toBeEnabled()

        await page.getByTestId("service-area-submit-button").click()
        await expect(page.getByTestId("service-area-last-submission")).toContainText(serviceAreaName)

        await page.screenshot({
            path: testInfo.outputPath("service-area-add.png"),
            fullPage: true,
        })
    })
})