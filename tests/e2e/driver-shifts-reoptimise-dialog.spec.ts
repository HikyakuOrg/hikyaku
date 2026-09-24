import { test, expect, type Locator, type Page } from "@playwright/test"

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function slugOf(page: Page): string {
    const match = new URL(page.url()).pathname.match(/^\/orgs\/([^/]+)\/dashboard/)
    if (!match) throw new Error(`Not on an org dashboard: ${page.url()}`)
    return match[1]
}

/** Slugs of every organisation the test user can open, via the sidebar switcher. */
async function organisationSlugs(page: Page): Promise<string[]> {
    await page.goto("/orgs")
    await expect(page).toHaveURL(/\/orgs\/[^/]+\/dashboard/, { timeout: 15_000 })
    const slugs = [slugOf(page)]

    const switcher = page.locator('[data-sidebar="header"] [data-sidebar="menu-button"]')
    await switcher.click()
    const labels = (await page.getByRole("menuitem").allInnerTexts()).map((label) => label.trim())
    await page.keyboard.press("Escape")

    for (const label of labels) {
        if (label === "New organisation") continue
        const before = slugOf(page)
        await switcher.click()
        await page.getByRole("menuitem", { name: label, exact: true }).click()
        await page
            .waitForURL((url) => !url.pathname.startsWith(`/orgs/${before}/`), { timeout: 30_000 })
            .catch(() => {})
        const slug = slugOf(page)
        if (!slugs.includes(slug)) slugs.push(slug)
    }
    return slugs
}

/**
 * Opens the re-optimise dialog on one organisation's driver shifts page and
 * returns its warehouse picker, or null when the picker is not shown (a single
 * warehouse) or the button is cooling down.
 */
async function openWarehousePicker(page: Page, slug: string): Promise<Locator | null> {
    await page.goto(`/orgs/${slug}/dashboard/driver-shifts`)
    const reoptimise = page.getByRole("button", { name: /^re-optimise$/i })
    await expect(reoptimise).toBeVisible({ timeout: 20_000 })
    // The button enables once warehouses and the latest run have loaded; a run
    // cooling down keeps it disabled.
    await expect(reoptimise).toBeEnabled({ timeout: 10_000 }).catch(() => {})
    if (await reoptimise.isDisabled()) return null

    await reoptimise.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    const trigger = dialog.getByRole("combobox")
    return (await trigger.count()) > 0 ? trigger : null
}

test("re-optimise dialog shows the selected warehouse by name, not its id", async ({ page }) => {
    test.setTimeout(180_000)

    let trigger: Locator | null = null
    for (const slug of await organisationSlugs(page)) {
        trigger = await openWarehousePicker(page, slug)
        if (trigger) break
    }
    test.skip(!trigger, "No organisation with several warehouses and Re-optimise available.")

    await expect(trigger!).not.toHaveText(/select warehouse/i)
    await expect(trigger!).not.toHaveText(UUID)
    const selectedName = (await trigger!.innerText()).trim()
    expect(selectedName.length).toBeGreaterThan(0)

    // The name in the trigger is one of the options on offer.
    await trigger!.click()
    await expect(page.getByRole("option", { name: selectedName, exact: true })).toBeVisible()
})
