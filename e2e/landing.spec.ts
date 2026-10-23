import { expect, test } from "@playwright/test";

test.describe("랜딩", () => {
  test("처음 오면 냉장고 데모와 시작 버튼을 보여 준다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "냉털 레시피" })).toBeVisible();

    const demo = page.getByRole("button", { name: "냉장고 문 열기" });
    await demo.click();
    await expect(page.getByRole("button", { name: "냉장고 문 닫기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("link", { name: "로그인 없이 시작" }).click();
    await expect(page).toHaveURL(/\/fridge$/);
  });

  test("이미 쓰던 사람은 냉장고로 바로 간다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("combobox", { name: "이름" }).fill("양파");
    await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
    await sheet.getByRole("button", { name: "완료" }).click();

    await page.goto("/");
    await expect(page).toHaveURL(/\/fridge$/);
  });
});
