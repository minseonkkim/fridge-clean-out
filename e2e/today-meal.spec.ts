import { expect, test } from "./fixtures";

test.describe("오늘의 한 끼", () => {
  test("냉장고 홈 상단에 식단의 오늘 첫 끼를 보여 주고, 재료 보기를 누르면 강조한다", async ({
    page,
  }) => {
    await page.goto("/fridge");
    await expect(page.getByRole("region", { name: "오늘의 한 끼" })).toHaveCount(0);

    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill("김치 500g, 돼지고기 150g, 두부 1모");
    await sheet.getByRole("button", { name: "3개 냉장고에 넣기" }).click();
    await expect(sheet).toBeHidden();

    const card = page.getByRole("region", { name: "오늘의 한 끼" });
    await expect(card).toContainText("먼저 써야 할 재료");
    const name = (await card.locator("span.font-bold").textContent())!.trim();

    await card.getByRole("button", { name: "재료 보기" }).click();
    await expect(page.getByRole("status", { name: "요리 재료 강조" })).toContainText(name);

    // 식단 탭의 오늘 첫 끼와 같은 요리다
    await page.goto("/plan");
    await expect(page.getByRole("listitem").filter({ hasText: name }).first()).toBeVisible();
  });
});
