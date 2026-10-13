import { expect, test } from "@playwright/test"
import { d } from "./helpers/org-url"

test.describe("Service rates: other currencies", () => {
    test("adds, validates and removes amounts in other currencies", async ({ page }) => {
        await page.goto(d("/service-rates"))
        await page.getByRole("button", { name: "New Service" }).click()
        const dialog = page.getByRole("dialog")
        await expect(dialog.getByRole("heading", { name: "New Service" })).toBeVisible()

        await dialog.getByLabel("Name").fill("Currency check")
        await dialog.getByLabel("Amount", { exact: true }).fill("5")
        await expect(dialog.getByLabel("Description")).toBeVisible()

        const others = dialog.getByRole("group", { name: "Other currencies" })
        await others.getByRole("button", { name: "Add currency" }).click()
        await others.getByRole("button", { name: "Add currency" }).click()
        await expect(others.getByRole("combobox")).toHaveCount(2)

        // Empty rows block the save.
        await dialog.getByRole("button", { name: "Create service" }).click()
        await expect(others.getByText("Pick a currency")).toHaveCount(2)

        // The main currency is never offered.
        const main = (await dialog.getByText(/^Charged in [A-Z]{3}\./).textContent())!.slice(11, 14)
        const first = others.getByRole("combobox").first()
        await first.click()
        await first.pressSequentially(main)
        await expect(page.getByRole("option", { name: main, exact: true })).toHaveCount(0)

        const other = main === "EUR" ? "GBP" : "EUR"
        await first.fill("")
        await first.pressSequentially(other)
        await page.getByRole("option", { name: other, exact: true }).click()
        await others.getByLabel(`Amount in ${other}`).fill("4.5")

        // A currency already listed isn't offered in the next row.
        const second = others.getByRole("combobox").nth(1)
        await second.click()
        await page.keyboard.type(other)
        await expect(page.getByRole("option", { name: other, exact: true })).toHaveCount(0)
        await page.keyboard.press("Escape")

        await others.getByRole("button", { name: "Remove currency" }).nth(1).click()
        await expect(others.getByRole("combobox")).toHaveCount(1)
        await expect(others.getByText("Pick a currency")).toHaveCount(0)
    })
})
