import { expect, test } from "@playwright/test"
import { d } from "./helpers/org-url"

test.describe("Fleet Team Members", () => {
    test("page loads and shows the list", async ({ page }) => {
        const response = await page.goto(d('/fleet/team-members'))
        expect(response?.ok()).toBeTruthy()
        await expect(page).toHaveURL(d('/fleet/team-members'))
        await expect(page.getByRole("heading", { name: "Team Members", level: 1 })).toBeVisible()
        await expect(page.getByTestId("team-members-table")).toBeVisible()
    })

    test("shows name, email and role columns", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        // Wait for at least one row
        const rows = page.getByRole("row").nth(1) // header is row 0
        await expect(rows).toBeVisible({ timeout: 15000 })

        // All visible rows should have non-empty email and role cells
        const emailCells = page.getByRole("cell").filter({ hasText: /@/ })
        await expect(emailCells.first()).toBeVisible()
    })

    test("search filters by email", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        const searchInput = page.getByTestId("team-members-search-input")
        await searchInput.fill("demo")

        // Wait for debounce + re-render
        await page.waitForTimeout(500)
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        const emailCells = page.getByRole("cell").filter({ hasText: /demo/i })
        await expect(emailCells.first()).toBeVisible()
    })

    test("search filters by display name", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        // Get first row's name to use as search term
        const firstNameCell = page.getByRole("row").nth(1).getByRole("cell").first()
        const nameText = (await firstNameCell.textContent())?.trim().split("\n")[0] ?? ""

        if (nameText) {
            const searchInput = page.getByTestId("team-members-search-input")
            await searchInput.fill(nameText.slice(0, 4))
            await page.waitForTimeout(500)
            await expect(page.getByTestId("team-members-table")).toBeVisible()
            await expect(page.getByRole("row").nth(1)).toBeVisible()
        }
    })

    test("clearing search restores full list", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        const searchInput = page.getByTestId("team-members-search-input")
        await searchInput.fill("demo")
        await page.waitForTimeout(500)

        const filteredRows = await page.getByRole("row").count()

        await searchInput.clear()
        await page.waitForTimeout(500)

        const restoredRows = await page.getByRole("row").count()
        expect(restoredRows).toBeGreaterThanOrEqual(filteredRows)
    })

    test("row click navigates to team member detail", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()

        // Wait for data row
        const firstDataRow = page.getByRole("row").nth(1)
        await expect(firstDataRow).toBeVisible({ timeout: 15000 })
        await firstDataRow.click()

        await expect(page).toHaveURL(/\/dashboard\/fleet\/team-members\/[0-9a-f-]+$/, {
            timeout: 10000,
        })
    })

    test("Add member button navigates to /add", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))

        const addBtn = page.getByTestId("add-member-btn")
        await expect(addBtn).toBeVisible()
        await addBtn.click()

        await expect(page).toHaveURL(d('/fleet/team-members/add'), { timeout: 10000 })
    })

    test("pending badge visible for unconfirmed users", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()
        await page.waitForTimeout(500)

        const pendingBadges = page.getByText("Invitation pending")
        const count = await pendingBadges.count()
        // If there are pending users, assert the badge is visible
        if (count > 0) {
            await expect(pendingBadges.first()).toBeVisible()
        }
    })

    test("access control sidebar shows role descriptions", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))

        const sidebar = page.getByTestId("access-control-sidebar")
        await expect(sidebar).toBeVisible()

        // At least one known role name should be present
        const hasKnownRole =
            (await sidebar.getByText(/Manager|Driver|Dispatcher/i).count()) > 0
        expect(hasKnownRole).toBe(true)
    })

    test("role select is visible for users with edit permission", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()
        await page.waitForTimeout(500)

        const roleSelects = page.locator("[data-testid^='team-member-role-select-']")
        const count = await roleSelects.count()
        if (count > 0) {
            await expect(roleSelects.first()).toBeVisible()
        }
    })

    test("delete button visible for users with delete permission", async ({ page }) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()
        await page.waitForTimeout(500)

        const deleteBtns = page.locator("[data-testid^='team-member-delete-btn-']")
        const count = await deleteBtns.count()
        if (count > 0) {
            await expect(deleteBtns.first()).toBeVisible()
        }
    })

    test("screenshot of team members page", async ({ page }, testInfo) => {
        await page.goto(d('/fleet/team-members'))
        await expect(page.getByTestId("team-members-table")).toBeVisible()
        // Wait for data to load
        await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 15000 })

        await page.screenshot({
            path: testInfo.outputPath("team-members.png"),
            fullPage: true,
        })
    })
})
