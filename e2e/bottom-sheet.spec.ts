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

  test("키보드가 올라와도 등록 버튼이 보이는 영역 안에 있다 (iOS처럼 레이아웃이 줄지 않는 경우)", async ({
    page,
  }) => {
    // 보이는 영역(visualViewport)을 흉내 내 키보드 300px가 올라온 상황을 만든다
    await page.addInitScript(() => {
      const fake = new EventTarget() as EventTarget & { height: number; offsetTop: number };
      fake.height = window.innerHeight;
      fake.offsetTop = 0;
      Object.defineProperty(window, "visualViewport", { value: fake, configurable: true });
      (window as unknown as { __keyboard: (h: number) => void }).__keyboard = (h) => {
        fake.height = window.innerHeight - h;
        fake.dispatchEvent(new Event("resize"));
      };
    });
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("combobox", { name: "이름" }).fill("돼지고기");
    await page.evaluate(() =>
      (window as unknown as { __keyboard: (h: number) => void }).__keyboard(300),
    );

    const visibleBottom = page.viewportSize()!.height - 300;
    const button = sheet.getByRole("button", { name: "냉장고에 넣기", exact: true });
    const box = (await button.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(visibleBottom);
    expect(box.y).toBeGreaterThan(0);

    // 키보드가 내려가면 원래 자리로
    await page.evaluate(() =>
      (window as unknown as { __keyboard: (h: number) => void }).__keyboard(0),
    );
    const after = (await button.boundingBox())!;
    expect(after.y + after.height).toBeGreaterThan(visibleBottom);
  });
});
