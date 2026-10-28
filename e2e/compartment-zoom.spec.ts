import { expect, test, type Page } from "./fixtures";

async function addBulk(page: Page, text: string, count: number) {
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("칸 확대", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "우유 1L, 요거트 2, 숙주 200g", 3);
  });

  test("칸 이름을 누르면 그 칸이 크게 보이고, 닫기로 돌아온다", async ({ page }) => {
    await page.getByRole("button", { name: "위 선반" }).click();
    const zoom = page.getByRole("dialog", { name: "위 선반 크게 보기" });
    await expect(zoom).toBeVisible();
    await expect(zoom).toContainText("우유");
    await expect(zoom).toContainText("요거트");
    await expect(zoom).not.toContainText("숙주");

    await zoom.getByRole("button", { name: "닫기" }).click();
    await expect(zoom).toBeHidden();
    // 문은 열린 채로 남는다
    await expect(page.getByRole("button", { name: /^숙주/ })).toBeVisible();
  });

  test("휴대폰 뒤로가기로 돌아온다", async ({ page }) => {
    await page.getByRole("button", { name: "채소칸" }).click();
    const zoom = page.getByRole("dialog", { name: "채소칸 크게 보기" });
    await expect(zoom).toBeVisible();
    await page.goBack();
    await expect(zoom).toBeHidden();
    await expect(page).toHaveURL(/\/fridge$/);
  });

  test("확대한 칸에서 재료를 누르면 상세 시트가 열린다", async ({ page }) => {
    await page.getByRole("button", { name: "위 선반" }).click();
    await page
      .getByRole("dialog", { name: "위 선반 크게 보기" })
      .getByRole("button", { name: /^우유/ })
      .click();
    await expect(page.getByRole("dialog", { name: "우유" })).toBeVisible();
  });
});
