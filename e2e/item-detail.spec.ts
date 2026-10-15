import { expect, test, type Page } from "@playwright/test";

async function addBulk(page: Page, text: string, count: number) {
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("재료 상세 시트", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "돼지고기 600g, 양파 3", 2);
  });

  test("수량을 스테퍼로 바꾸고 메모를 남겨 저장한다", async ({ page }) => {
    await page.getByRole("button", { name: /양파/ }).click();
    const sheet = page.getByRole("dialog", { name: "양파" });
    await expect(sheet.getByText("D-30")).toBeVisible();

    await sheet.getByRole("button", { name: "수량 줄이기" }).click();
    await expect(sheet.getByRole("group", { name: "수량" })).toContainText("2개");
    await sheet.getByLabel("메모").fill("하나는 반 남음");
    await sheet.getByRole("button", { name: "저장" }).click();
    await expect(sheet).toBeHidden();

    await expect(page.getByRole("button", { name: /양파/ })).toContainText("2개");
    await page.reload();
    await expect(page.getByRole("button", { name: /양파/ })).toContainText("2개");
  });

  test("길게 누르면 연속으로 줄어든다", async ({ page }) => {
    await page.getByRole("button", { name: /돼지고기/ }).click();
    const sheet = page.getByRole("dialog", { name: "돼지고기" });
    const minus = sheet.getByRole("button", { name: "수량 줄이기" });
    await minus.hover();
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    const text = (await sheet.getByRole("group", { name: "수량" }).textContent()) ?? "";
    const value = Number(text.match(/(\d+)g/)?.[1]);
    // 한 번 누르면 550g. 1초 길게 누르면 여러 번 줄어 450g 이하가 된다.
    expect(value).toBeLessThanOrEqual(450);
  });

  test("냉동으로 옮기면 기한과 칸이 바뀐다", async ({ page }) => {
    await page.getByRole("button", { name: /돼지고기/ }).click();
    const sheet = page.getByRole("dialog", { name: "돼지고기" });
    await expect(sheet.getByText("D-3")).toBeVisible();

    await sheet.getByRole("radio", { name: "냉동" }).click();
    await expect(sheet.getByText("냉동 보관 기준으로 기한이")).toContainText("D-90");
    await expect(sheet.getByText("냉동 아래 서랍")).toBeVisible();
    await sheet.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("region", { name: /냉동 아래 서랍/ })).toContainText("돼지고기");
  });
});
