import { expect, test } from "./fixtures";

test.describe("바텀 시트", () => {
  test("손잡이를 아래로 끌어내리면 닫히고, 조금만 끌면 제자리로 돌아온다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await expect(sheet).toBeVisible();
    const handle = sheet.locator("[data-sheet-handle]");
    const box = (await handle.boundingBox())!;
    const x = box.x + 40;
    const y = box.y + box.height / 2;

    // 조금만 끌면 닫히지 않는다
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect(sheet).toBeVisible();

    // 충분히 끌어내리면 닫힌다
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 200, { steps: 10 });
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });
});
