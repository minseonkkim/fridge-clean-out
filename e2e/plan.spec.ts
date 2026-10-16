import { expect, test, type Page } from "@playwright/test";

async function addBulk(page: Page, text: string, count: number) {
  await page.goto("/fridge");
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("식단 플랜", () => {
  test("빈 냉장고면 만들 요리가 없다고 안내한다", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByRole("region", { name: "요약" })).toContainText(
      "지금 재료로 만들 수 있는 요리가 없어요",
    );
  });

  test("재료를 넣으면 며칠치 식단과 요약이 나오고, 급한 재료를 쓰는 요리가 먼저다", async ({
    page,
  }) => {
    await addBulk(page, "숙주 200g, 계란 10, 두부 1, 김치 500g, 돼지고기 300g, 대파 2", 6);
    await page.goto("/plan");

    const summary = page.getByRole("region", { name: "요약" });
    await expect(summary).toContainText(/\d일 동안 \d+끼 가능/);

    // 숙주는 D-2로 가장 급하다. 기한(모레) 전에 쓰이고, 버려질 재료가 없어야 한다.
    const firstTwoDays = page
      .getByRole("listitem")
      .filter({ hasText: /^(오늘|내일)/ })
      .filter({ hasText: "숙주" });
    await expect(firstTwoDays.first()).toBeVisible();
    await expect(page.getByRole("region", { name: "버려질 위험 재료" })).toHaveCount(0);
  });

  test("기한 안에 못 먹는 재료는 버려질 위험으로 알린다", async ({ page }) => {
    // 콩나물 1kg은 기한(3일) 안에 다 못 쓴다
    await addBulk(page, "콩나물 1kg", 1);
    await page.goto("/plan");
    await expect(page.getByRole("region", { name: "버려질 위험 재료" })).toContainText("콩나물");
  });

  test("기간과 끼니를 바꾸면 다시 계산한다", async ({ page }) => {
    await addBulk(page, "계란 30, 대파 3, 두부 2, 김치 800g, 돼지고기 600g, 양파 3", 6);
    await page.goto("/plan");
    const summary = page.getByRole("region", { name: "요약" });
    const before = await summary.textContent();

    await page.getByRole("radio", { name: "3끼" }).click();
    await expect(summary).not.toHaveText(before ?? "");
  });

  test("재료를 다 쓰면 플랜이 바로 바뀐다", async ({ page }) => {
    await addBulk(page, "숙주 200g, 계란 10", 2);
    await page.goto("/plan");
    await expect(page.getByText("숙주 D-2").first()).toBeVisible();

    await page.goto("/fridge");
    await page.getByRole("button", { name: /숙주/ }).click();
    await page.getByRole("dialog", { name: "숙주" }).getByRole("button", { name: /버림/ }).click();

    await page.goto("/plan");
    await expect(page.getByText("숙주 D-2")).toHaveCount(0);
  });
});
