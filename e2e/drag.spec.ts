import { expect, test, type Page } from "./fixtures";

async function addBulk(page: Page, text: string, count: number) {
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

/** 길게 누른 뒤 목표 칸으로 끌어다 놓는다 */
async function longPressDrag(page: Page, from: string, toSlot: string) {
  const token = page.getByRole("button", { name: new RegExp(`^${from}`) });
  const a = (await token.boundingBox())!;
  const target = page.locator(`[data-slot="${toSlot}"]`);
  await target.scrollIntoViewIfNeeded();
  const b = (await target.boundingBox())!;
  const a2 = (await token.boundingBox())!;
  await page.mouse.move(a2.x + a2.width / 2, a2.y + a2.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  return {
    drop: async () => page.mouse.up(),
    a,
  };
}

test.describe("드래그로 칸 옮기기", () => {
  test("냉동실 서랍에 놓으면 냉동 기한으로 바뀌고 알려 준다", async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "돼지고기 600g", 1);
    await expect(page.getByRole("region", { name: "아래 선반" })).toContainText("돼지고기");

    const { drop } = await longPressDrag(page, "돼지고기", "freezer_lower");
    // 놓을 칸이 강조되고 끌고 있는 재료가 손가락을 따라온다
    await expect(page.locator('[data-slot="freezer_lower"]')).toHaveClass(/outline-emerald-600/);
    await drop();

    await expect(
      page.getByRole("status").filter({ hasText: "돼지고기를 냉동 아래 서랍에 넣었어요. 새 기한" }),
    ).toContainText("D-90");
    await expect(page.getByRole("group", { name: "냉동실" })).toContainText("돼지고기");
    await expect(page.getByRole("region", { name: "아래 선반" })).not.toContainText("돼지고기");
  });

  test("같은 보관 방식의 다른 칸으로 옮기면 기한은 그대로다", async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "숙주 200g", 1);
    const { drop } = await longPressDrag(page, "숙주", "fridge_top");
    await drop();
    await expect(
      page.getByRole("status").filter({ hasText: "숙주를 위 선반으로 옮겼어요." }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "위 선반" })).toContainText("D-2");
  });

  test("짧게 누르면 드래그 없이 상세 시트가 열린다", async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "숙주 200g", 1);
    await page.getByRole("button", { name: /^숙주/ }).click();
    await expect(page.getByRole("dialog", { name: "숙주" })).toBeVisible();
  });
});
