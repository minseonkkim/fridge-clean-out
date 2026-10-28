import { expect, test } from "./fixtures";

test.describe("하단 탭바", () => {
  test("네 탭으로 이동하고 현재 탭을 표시한다", async ({ page }) => {
    await page.goto("/fridge");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(nav.getByRole("link", { name: "냉장고" })).toHaveAttribute("aria-current", "page");

    for (const [name, url] of [
      ["식단", "/plan"],
      ["장보기", "/shopping"],
      ["마이", "/my"],
      ["냉장고", "/fridge"],
    ] as const) {
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(new RegExp(`${url}$`));
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
  });

  test("레시피 상세에서는 식단 탭이 선택돼 있다", async ({ page }) => {
    await page.goto("/recipes/kimchi_stew");
    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(nav.getByRole("link", { name: "식단" })).toHaveAttribute("aria-current", "page");
  });

  test("재료 추가 버튼과 겹치지 않는다", async ({ page }) => {
    await page.goto("/fridge");
    const fab = await page.getByRole("button", { name: "재료 추가" }).boundingBox();
    const nav = await page.getByRole("navigation", { name: "주 메뉴" }).boundingBox();
    expect(fab!.y + fab!.height).toBeLessThanOrEqual(nav!.y);
  });
});
