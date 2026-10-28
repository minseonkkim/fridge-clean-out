import { expect, test } from "@playwright/test";

test.describe("식단 → 냉장고 재료 강조", () => {
  test("요리의 재료만 밝게 보이고 문이 저절로 열리며, 해제하면 평소대로", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill("김치 500g, 돼지고기 150g, 우유 1L");
    await sheet.getByRole("button", { name: "3개 냉장고에 넣기" }).click();
    await expect(sheet).toBeHidden();

    await page.goto("/plan");
    const meal = page.getByRole("listitem").filter({ hasText: "김치찌개" }).first();
    await meal.getByRole("link", { name: /냉장고에서 재료 보기/ }).click();
    await expect(page).toHaveURL(/\/fridge#cook=kimchi_stew$/);

    await expect(page.getByRole("status", { name: "요리 재료 강조" })).toContainText(
      "김치찌개에 쓰는 재료 2개",
    );
    // 문이 닫혀 있던 상태에서도 저절로 열려 재료를 누를 수 있다
    const token = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });
    await expect(token("배추김치")).toHaveAttribute("data-highlight", "on");
    await expect(token("돼지고기")).toHaveAttribute("data-highlight", "on");
    await expect(token("우유")).toHaveAttribute("data-highlight", "off");

    await page.getByRole("button", { name: "해제" }).click();
    await expect(page.getByRole("status", { name: "요리 재료 강조" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/fridge$/);
    // 강조를 해제해도 문은 열린 채로 남는다
    await expect(token("우유")).not.toHaveAttribute("data-highlight", /.*/);
    await expect(page.getByRole("button", { name: "냉장실 문 열기" })).toHaveCount(0);
  });
});
