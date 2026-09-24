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

/** Tracking numbers on the first page of one organisation's Packages list. */
async function listedTrackingNumbers(page: Page, slug: string): Promise<string[]> {
    await page.goto(`/orgs/${slug}/dashboard/packages`);
    await expect(page.getByRole("heading", { name: "Packages", exact: true })).toBeVisible();
    const firstCells = page.locator("tbody tr td:first-child");
    await expect(firstCells.first()).toBeVisible({ timeout: 15_000 });
    return (await firstCells.allInnerTexts()).map((text) => text.trim()).filter(Boolean);
}

/** Emails on the first page of one organisation's Team Members list. */
async function listedMemberEmails(page: Page, slug: string): Promise<string[]> {
    await page.goto(`/orgs/${slug}/dashboard/fleet/team-members`);
    const table = page.getByTestId("team-members-table");
    const emailCells = table.getByRole("cell").filter({ hasText: /@/ });
    await expect(emailCells.first()).toBeVisible({ timeout: 15_000 });
    return (await emailCells.allInnerTexts()).map((text) => text.trim());
}

/**
 * Slugs of the organisation /orgs lands on and of a second one found through
 * the switcher. These specs only mean something for a user in two
 * organisations, so they skip otherwise.
 */
async function twoOrganisations(page: Page): Promise<[string, string]> {
    await page.goto("/orgs");
    await expect(page).toHaveURL(/\/orgs\/[^/]+\/dashboard/, { timeout: 15_000 });
    const firstSlug = slugOf(page);

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
            .waitForURL((url) => !url.pathname.startsWith(`/orgs/${firstSlug}/`), { timeout: 30_000 })
            .catch(() => {});
        if (slugOf(page) !== firstSlug) {
            secondSlug = slugOf(page);
            break;
        }
    }
    test.skip(!secondSlug, "The test user belongs to only one organisation.");
    return [firstSlug, secondSlug!];
}

test("a member of two organisations sees only the open organisation's warehouses", async ({ page }) => {
    test.setTimeout(120_000);
    const [firstSlug, secondSlug] = await twoOrganisations(page);

    const first = await listedWarehouseIds(page, firstSlug);
    const second = await listedWarehouseIds(page, secondSlug);

    expect(first.filter((id) => second.includes(id))).toEqual([]);
});

test("a member of two organisations sees only the open organisation's packages", async ({ page }) => {
    test.setTimeout(120_000);
    const [firstSlug, secondSlug] = await twoOrganisations(page);

    const first = await listedTrackingNumbers(page, firstSlug);
    const second = await listedTrackingNumbers(page, secondSlug);

    expect(first.filter((trackingNumber) => second.includes(trackingNumber))).toEqual([]);
});

test("a member of two organisations is listed once in each organisation's team", async ({ page }) => {
    test.setTimeout(120_000);
    const [firstSlug, secondSlug] = await twoOrganisations(page);

    for (const slug of [firstSlug, secondSlug]) {
        const emails = await listedMemberEmails(page, slug);
        expect(emails.filter((email, i) => emails.indexOf(email) !== i)).toEqual([]);
    }
});
