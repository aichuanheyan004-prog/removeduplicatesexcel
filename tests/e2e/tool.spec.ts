import { expect, test } from "@playwright/test";

test("sample workbook can be analyzed and exported", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Remove Duplicates Excel" })).toBeVisible();
  await page.getByRole("button", { name: /Load sample workbook/ }).click();
  await expect(page.getByText("Duplicate preview ready")).toBeVisible();
  await expect(page.getByText("Duplicate groups", { exact: true })).toBeVisible();
  await page.getByLabel("Ignore leading and trailing spaces").check();
  await page.getByLabel("Ignore uppercase and lowercase").check();
  await page.getByLabel("Keep last").check();
  await expect(page.getByText(/Rows to remove/)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export cleaned file/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/remove-duplicates-excel-sample-deduped-\d{8}-\d{6}\.xlsx/);
  await expect(page.getByText(/Export verified by reparsing/)).toBeVisible();
});

test("second spreadsheet comparison runs in the browser", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Load sample workbook/ }).click();
  await expect(page.getByText("Duplicate preview ready")).toBeVisible();
  await page.locator("#comparison-file").setInputFiles("tests/fixtures/sample.csv");
  await expect(page.getByText("Comparison preview ready")).toBeVisible();
  await expect(page.getByText("Rows checked in second file")).toBeVisible();
});

test("corrupted workbook shows a recoverable error and reset clears state", async ({ page }) => {
  await page.goto("/");
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: "broken.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("this is not a valid workbook")
  });
  await expect(page.getByText("File not processed")).toBeVisible();
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.getByText("Choose an XLSX workbook or UTF-8 CSV to start.")).toBeVisible();
});

test("indexable routes and 404 render without horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/how-to-remove-duplicates-in-excel/", "/privacy/", "/terms/", "/missing-page"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  }
});
