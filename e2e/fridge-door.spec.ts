import { expect, test, type Page } from "@playwright/test";

async function addBulk(page: Page, text: string, count: number) {
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("냉장고 문", () => {
  test("닫힌 문에 급한 재료 배지가 붙고, 누르면 열려 재료를 고를 수 있다", async ({ page }) => {
    await page.goto("/fridge");
    // 숙주 D-2, 돼지고기 D-3 → 3일 안에 2 / 만두는 냉동
    await addBulk(page, "숙주 200g, 돼지고기 600g, 계란 10, 만두 300g", 4);

    const fridgeDoor = page.getByRole("button", { name: "냉장실 문 열기" });
    await expect(fridgeDoor).toContainText("3일 안에 2");
    await expect(page.getByRole("button", { name: "냉동실 문 열기" })).toContainText("냉동 1개");

    // 닫혀 있으면 안쪽 재료를 누를 수 없다
    await expect(page.getByRole("button", { name: /^숙주/ })).toHaveCount(0);

    await fridgeDoor.click();
    await expect(page.getByRole("button", { name: "냉장실 문 열기" })).toHaveCount(0);
    await page.getByRole("button", { name: /^숙주/ }).click();
    await expect(page.getByRole("dialog", { name: "숙주" })).toBeVisible();
  });

  test("한 번 열면 탭을 오가도 열려 있고, 바깥 빈 곳을 누르면 닫힌다", async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "숙주 200g", 1);
    await page.getByRole("button", { name: "냉장실 문 열기" }).click();

    const nav = page.getByRole("navigation", { name: "주 메뉴" });
    await nav.getByRole("link", { name: "식단" }).click();
    await nav.getByRole("link", { name: "냉장고" }).click();
    await expect(page.getByRole("button", { name: /^숙주/ })).toBeVisible();

    // 냉장고 바깥 빈 곳(제목 줄)을 누르면 닫힌다
    await page.getByRole("heading", { name: "내 냉장고" }).click();
    await expect(page.getByRole("button", { name: "냉장실 문 열기" })).toBeVisible();
  });

  test("움직임 줄이기 설정이면 회전하지 않는다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fridge");
    const door = page.getByRole("button", { name: "냉장실 문 열기" });
    const transform = await door.evaluate((el) => getComputedStyle(el).transform);
    await door.click();
    await expect(page.getByRole("button", { name: "냉장실 문 열기" })).toHaveCount(0);
    // 열린 뒤에도 회전 변환이 없다 (페이드만)
    const after = await page
      .locator('button[aria-label="냉장실 문 열기"]')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(after).toBe(transform);
  });
});
