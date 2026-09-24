import { test, expect, type Page, type Response } from "@playwright/test";
import { d } from "./helpers/org-url";

/** A VIN the decoder resolves to a real make/model/year/type, used across specs in this file. */
const VALID_VIN = "1G6DG5EY8B0199944";

test.describe("Fleet Vehicles Add Flow", () => {
    test("Valid and invalid VIN autofill", async ({ page }) => {
        test.setTimeout(120000);

        // Navigate to Add Vehicle page directly (assuming user is already authenticated via storageState)
        await page.goto(d('/fleet/vehicles/add'));

        // Should navigate to /dashboard/fleet/vehicles/add
        await expect(page).toHaveURL(d('/fleet/vehicles/add'));

        const vinInput = page.getByLabel(/vin/i);

        // Valid VIN test
        await vinInput.pressSequentially(VALID_VIN);
        // Make, Model, Year should be autofilled (wait for server action to complete)
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });
        await expect(page.locator("#model")).toHaveValue("CTS", { timeout: 10000 });
        await expect(page.locator("#year")).toHaveValue("2011", { timeout: 10000 });

        
        await page.reload();

        // Invalid VIN test
        await vinInput.pressSequentially("JTNAB0AEX0A002410", { delay: 30 });
        // Make, Model, Year should NOT be autofilled
        await expect(page.locator("#make")).not.toHaveValue("Cadillac", { timeout: 90000 });
        await expect(page.locator("#model")).not.toHaveValue("CTS", { timeout: 90000 });
        await expect(page.locator("#year")).not.toHaveValue("2011", { timeout: 90000 });
    });

    test("fills gross limits from the upper bound of the GVWR class", async ({ page }) => {
        test.setTimeout(120000);

        await page.goto(d('/fleet/vehicles/add'));

        // A 2020 Ford Transit, GVWR "Class 2H: 9,001 - 10,000 lb (4,082 - 4,536 kg)".
        await page.getByLabel(/vin/i).pressSequentially("1FTBR3X89LKA12345");
        await expect(page.locator("#make")).toHaveValue("Ford", { timeout: 30000 });
        await expect(page.locator("#model")).toHaveValue("Transit");
        await expect(page.locator("#year")).toHaveValue("2020");
        await expect(page.locator("#gross")).toHaveValue("4536");
    });
});

test.describe("Fleet Vehicles Skills", () => {
    test("creates a skill inline from the Capabilities picker and it persists on the vehicle", async ({ page }) => {
        test.setTimeout(120000);
        // Needs an existing warehouse to complete the form — not guaranteed in CI.
        test.skip(!!process.env.CI, "Requires a seeded warehouse — skipped in CI");

        await page.goto(d('/fleet/vehicles/add'));

        // Valid VIN autofills make/model/year/type, so only plate, warehouse and
        // skills are left to fill in.
        await page.getByLabel(/vin/i).pressSequentially(VALID_VIN);
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });

        const plate = `SKL-${Date.now()}`;
        await page.getByLabel(/registration plate/i).fill(plate);

        await page.getByText("Select warehouse").click();
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 });
        await page.getByRole("option").first().click();

        const skillName = `E2E Skill ${Date.now()}`;
        const skillsPicker = page.getByTestId("vehicle-skills-picker");
        await skillsPicker.click();
        await skillsPicker.locator("input").fill(skillName);
        const createButton = page.getByTestId("vehicle-skills-picker-create");
        await expect(createButton).toBeVisible({ timeout: 10000 });
        await createButton.click();
        await expect(createButton).toHaveCount(0, { timeout: 15000 });
        await expect(skillsPicker.getByText(skillName)).toBeVisible({ timeout: 15000 });
        // Close the picker's popup so it cannot overlay the submit button below.
        await page.keyboard.press("Escape");

        // This VIN decodes with no GVWR, so gross limits stays at 0, which
        // fails the form's `positive()` check and silently blocks submission.
        await page.locator("#gross").fill("1500");

        const [vehicleInsertResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes("/rest/v1/vehicles") && res.request().method() === "POST"),
            page.getByRole("button", { name: /save vehicle/i }).click(),
        ]);
        const createdVehicle = await vehicleInsertResponse.json();

        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });

        // Reopen the vehicle's edit form directly and confirm the skill assignment
        // survived the round trip through `setVehicleSkills`.
        await page.goto(d(`/fleet/vehicles/${createdVehicle.id}/edit`));
        await expect(page.getByTestId("vehicle-skills-picker").getByText(skillName)).toBeVisible({ timeout: 15000 });
    });

    test("keeps an existing skill picked from the list when Escape closes the picker", async ({ page }) => {
        test.setTimeout(120000);
        test.skip(!!process.env.CI, "Requires a seeded warehouse, so skipped in CI");

        await page.goto(d('/fleet/vehicles/add'));

        await page.getByLabel(/vin/i).pressSequentially(VALID_VIN);
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });
        await page.getByLabel(/registration plate/i).fill(`ESC-${Date.now()}`);

        await page.getByText("Select warehouse").click();
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 });
        await page.getByRole("option").first().click();

        // Create the skill first so an option from this org's catalog is
        // guaranteed, then drop its chip and pick it again from the list.
        const skillName = `E2E Skill ${Date.now()}`;
        const skillsPicker = page.getByTestId("vehicle-skills-picker");
        const skillsInput = skillsPicker.locator("input");
        await skillsPicker.click();
        await skillsInput.fill(skillName);
        const createButton = page.getByTestId("vehicle-skills-picker-create");
        await expect(createButton).toBeVisible({ timeout: 10000 });
        await createButton.click();
        const chip = skillsPicker.locator('[data-slot="combobox-chip"]', { hasText: skillName });
        await expect(chip).toBeVisible({ timeout: 15000 });
        await chip.getByRole("button", { name: "Clear selection" }).click();
        await expect(chip).toHaveCount(0);

        await skillsInput.fill(skillName);
        await page.getByRole("option", { name: skillName, exact: true }).click();

        // The first Escape closes the list; the second lands on a closed picker,
        // which is where Base UI used to clear every selected chip.
        await page.keyboard.press("Escape");
        await page.keyboard.press("Escape");
        await expect(skillsPicker.getByText(skillName, { exact: true })).toBeVisible();

        await page.locator("#gross").fill("1500");

        const [vehicleInsertResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes("/rest/v1/vehicles") && res.request().method() === "POST"),
            page.getByRole("button", { name: /save vehicle/i }).click(),
        ]);
        const createdVehicle = await vehicleInsertResponse.json();
        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });

        await page.goto(d(`/fleet/vehicles/${createdVehicle.id}/edit`));
        await expect(
            page.getByTestId("vehicle-skills-picker").getByText(skillName, { exact: true })
        ).toBeVisible({ timeout: 15000 });
    });
});

test.describe("Fleet Vehicles saves are all or nothing", () => {
    /** Fill every required field plus one freshly created skill; returns the plate. */
    async function fillAddForm(page: Page) {
        await page.goto(d('/fleet/vehicles/add'));
        await page.getByLabel(/vin/i).pressSequentially(VALID_VIN);
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });

        const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const plate = `RBK-${suffix}`;
        await page.getByLabel(/registration plate/i).fill(plate);

        await page.getByText("Select warehouse").click();
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 });
        await page.getByRole("option").first().click();

        const skillName = `E2E Skill ${suffix}`;
        const skillsPicker = page.getByTestId("vehicle-skills-picker");
        await skillsPicker.click();
        await skillsPicker.locator("input").fill(skillName);
        const createButton = page.getByTestId("vehicle-skills-picker-create");
        await expect(createButton).toBeVisible({ timeout: 10000 });
        await createButton.click();
        await expect(skillsPicker.getByText(skillName)).toBeVisible({ timeout: 15000 });
        await page.keyboard.press("Escape");

        await page.locator("#gross").fill("1500");
        return { plate, skillName };
    }

    /** Reject the next vehicle_skills write the way the composite org FK does. */
    async function failNextSkillWrite(page: Page) {
        let failed = false;
        await page.route("**/rest/v1/vehicle_skills*", async (route) => {
            if (failed || route.request().method() !== "POST") return route.fallback();
            failed = true;
            await route.fulfill({
                status: 409,
                contentType: "application/json",
                body: JSON.stringify({
                    code: "23503",
                    message: 'insert or update on table "vehicle_skills" violates foreign key constraint "vehicle_skills_skill_org_fkey"',
                    details: null,
                    hint: null,
                }),
            });
        });
    }

    const isVehicleWrite = (method: string) => (res: Response) =>
        res.url().includes("/rest/v1/vehicles") && res.request().method() === method;

    test("discards the vehicle when its skills fail, so resubmitting adds exactly one", async ({ page }) => {
        test.setTimeout(120000);
        test.skip(!!process.env.CI, "Requires a seeded warehouse, so skipped in CI");

        const { skillName } = await fillAddForm(page);
        await failNextSkillWrite(page);

        const saveButton = page.getByRole("button", { name: /save vehicle/i });
        const [, discard] = await Promise.all([
            page.waitForResponse(isVehicleWrite("POST")),
            page.waitForResponse(isVehicleWrite("DELETE")),
            saveButton.click(),
        ]);
        expect(await discard.json()).toHaveLength(1);
        await expect(page.getByText("Couldn't save the vehicle's skills, so it was not added.")).toBeVisible();
        await expect(page.getByText(/vehicle_skills_skill_org_fkey/)).toBeVisible();
        await expect(page).toHaveURL(d('/fleet/vehicles/add'));

        // Same form, same plate: a fresh insert must go through, which it could
        // not if the first row were still holding the unique plate.
        const [retryInsert] = await Promise.all([
            page.waitForResponse(isVehicleWrite("POST")),
            saveButton.click(),
        ]);
        expect(retryInsert.status()).toBe(201);
        const createdVehicle = await retryInsert.json();
        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });

        await page.goto(d(`/fleet/vehicles/${createdVehicle.id}/edit`));
        await expect(page.getByTestId("vehicle-skills-picker").getByText(skillName)).toBeVisible({ timeout: 15000 });
    });

    test("finishes the stranded vehicle on retry when it cannot be discarded", async ({ page }) => {
        test.setTimeout(120000);
        test.skip(!!process.env.CI, "Requires a seeded warehouse, so skipped in CI");

        const { skillName } = await fillAddForm(page);
        await failNextSkillWrite(page);
        // A role with vehicles.add but not vehicles.delete: RLS deletes nothing.
        await page.route("**/rest/v1/vehicles*", async (route) => {
            if (route.request().method() !== "DELETE") return route.fallback();
            await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        });

        const saveButton = page.getByRole("button", { name: /save vehicle/i });
        const [insert] = await Promise.all([
            page.waitForResponse(isVehicleWrite("POST")),
            saveButton.click(),
        ]);
        const strandedVehicle = await insert.json();
        await expect(page.getByText(/saving again will finish it/i)).toBeVisible({ timeout: 15000 });

        let insertedAgain = false;
        page.on("request", (req) => {
            if (req.url().includes("/rest/v1/vehicles") && req.method() === "POST") insertedAgain = true;
        });
        const [update] = await Promise.all([
            page.waitForResponse(isVehicleWrite("PATCH")),
            saveButton.click(),
        ]);
        expect(update.url()).toContain(strandedVehicle.id);
        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });
        expect(insertedAgain).toBe(false);

        await page.goto(d(`/fleet/vehicles/${strandedVehicle.id}/edit`));
        await expect(page.getByTestId("vehicle-skills-picker").getByText(skillName)).toBeVisible({ timeout: 15000 });
    });
    test("puts an edited vehicle's fields back when its skills fail", async ({ page }) => {
        test.setTimeout(120000);
        test.skip(!!process.env.CI, "Requires a seeded warehouse, so skipped in CI");

        await fillAddForm(page);
        const [insert] = await Promise.all([
            page.waitForResponse(isVehicleWrite("POST")),
            page.getByRole("button", { name: /save vehicle/i }).click(),
        ]);
        const vehicle = await insert.json();
        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });

        await page.goto(d(`/fleet/vehicles/${vehicle.id}/edit`));
        await expect(page.locator("#gross")).toHaveValue("1500", { timeout: 15000 });
        await page.locator("#gross").fill("2500");

        // Add a second skill so the save has a skill insert to fail on.
        const skillsPicker = page.getByTestId("vehicle-skills-picker");
        await skillsPicker.click();
        await skillsPicker.locator("input").fill(`E2E Extra ${Date.now()}`);
        const createButton = page.getByTestId("vehicle-skills-picker-create");
        await expect(createButton).toBeVisible({ timeout: 10000 });
        await createButton.click();
        await expect(createButton).toHaveCount(0, { timeout: 15000 });
        await page.keyboard.press("Escape");
        await failNextSkillWrite(page);

        const patches: string[] = [];
        page.on("request", (req) => {
            if (req.url().includes("/rest/v1/vehicles") && req.method() === "PATCH") patches.push(req.postData() ?? "");
        });
        await page.getByRole("button", { name: /update vehicle/i }).click();
        await expect(page.getByText(/vehicle_skills_skill_org_fkey/)).toBeVisible({ timeout: 15000 });
        await expect.poll(() => patches.length).toBe(2);
        expect(JSON.parse(patches[0]).vehicle_gross_limits).toBe(2500);
        expect(JSON.parse(patches[1]).vehicle_gross_limits).toBe(1500);

        await page.reload();
        await expect(page.locator("#gross")).toHaveValue("1500", { timeout: 15000 });
    });
});
