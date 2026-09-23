import { expect, test, type Page } from "@playwright/test";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function slugOf(page: Page): string {
    const match = new URL(page.url()).pathname.match(/^\/orgs\/([^/]+)\/dashboard/);
    if (!match) throw new Error(`Not on an org dashboard: ${page.url()}`);
    return match[1];
}

/** Ids of the warehouses listed on one organisation's warehouse page. */
async function listedWarehouseIds(page: Page, slug: string): Promise<string[]> {
    await page.goto(`/orgs/${slug}/dashboard/service/warehouse`);
    await expect(page.getByRole("heading", { name: "Warehouses", exact: true })).toBeVisible();

    const hrefs = await page
        .locator(`a[href^="/orgs/${slug}/dashboard/service/warehouse/"]`)
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));

    return hrefs.flatMap((href) => href.match(UUID) ?? []);
}

test("a member of two organisations sees only the open organisation's warehouses", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/orgs");
    await expect(page).toHaveURL(/\/orgs\/[^/]+\/dashboard/, { timeout: 15_000 });
    const firstSlug = slugOf(page);

    // Find a second organisation through the switcher. The spec only means
    // something for a user in two organisations, so it skips otherwise.
    const switcher = page.locator('[data-sidebar="header"] [data-sidebar="menu-button"]');
    let secondSlug: string | null = null;
    await switcher.click();
    const labels = (await page.getByRole("menuitem").allInnerTexts()).map((label) => label.trim());
    await page.keyboard.press("Escape");

    for (const label of labels) {
        if (label === "New organisation") continue;
        await switcher.click();
        await page.getByRole("menuitem", { name: label, exact: true }).click();
        await page
            .waitForURL((url) => !url.pathname.startsWith(`/orgs/${firstSlug}/`), { timeout: 5_000 })
            .catch(() => {});
        if (slugOf(page) !== firstSlug) {
            secondSlug = slugOf(page);
            break;
        }
    }
    test.skip(!secondSlug, "The test user belongs to only one organisation.");

    const first = await listedWarehouseIds(page, firstSlug);
    const second = await listedWarehouseIds(page, secondSlug!);

    expect(first.filter((id) => second.includes(id))).toEqual([]);
});
