import { expect, test, type Page } from "./fixtures";

async function addBulk(page: Page, text: string, count: number) {
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("재료 목록 보기", () => {
  test("빈 냉장고 안내", async ({ page }) => {
    await page.goto("/fridge");
    await expect(page.getByText("냉장고가 비어 있어요")).toBeVisible();
  });

  test("칸별로 묶어 보여 주고 급한 순으로 바꿀 수 있다", async ({ page }) => {
    await page.goto("/fridge");
    // 숙주 D-2, 돼지고기 D-3, 양파 D-30(팬트리), 우유 D-7(위 선반)
    await addBulk(page, "양파 3, 우유 1L, 돼지고기 600g, 숙주 200g", 4);

    await expect(page.getByRole("region", { name: /채소칸/ })).toContainText("숙주");
    await expect(page.getByRole("region", { name: /아래 선반/ })).toContainText("돼지고기");
    await expect(page.getByRole("region", { name: /팬트리 선반/ })).toContainText("양파");

    await expect(page.getByRole("list", { name: "급한 재료" })).toContainText("3일 안에 2");

    // 목록 보기로 바꾸면 칸별 목록이 같은 정보를 보여 주고, 급한 순으로 정렬할 수 있다
    await page.getByRole("radio", { name: "목록" }).click();
    await expect(page.getByRole("region", { name: /채소칸/ })).toContainText("숙주");
    await page.getByRole("radio", { name: "급한 순" }).click();
    const rows = page.getByRole("list", { name: "급한 순 재료" }).getByRole("listitem");
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText("숙주");
    await expect(rows.first()).toContainText("D-2");
    await expect(rows.last()).toContainText("양파");

    // 고른 보기를 기억한다
    await page.reload();
    await expect(page.getByRole("radio", { name: "목록" })).toHaveAttribute("aria-checked", "true");
  });

  test("냉장고 보기는 냉장실·냉동실·팬트리로 나뉘고 재료가 칸에 놓인다", async ({ page }) => {
    await page.goto("/fridge");
    await addBulk(page, "양파 3, 우유 1L, 돼지고기 600g, 숙주 200g, 만두 300g, 계란 10", 6);

    await expect(page.getByRole("radio", { name: "냉장고" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const fridge = page.getByRole("group", { name: "냉장실" });
    await expect(fridge.getByRole("region", { name: "위 선반" })).toContainText("우유");
    await expect(fridge.getByRole("region", { name: "문 선반" })).toContainText("계란");
    await expect(fridge.getByRole("region", { name: "채소칸" })).toContainText("숙주");
    // 냉동실 서랍은 닫혀 있으면 앞면에 재료 이름만 보이고, 당기면 재료가 나온다
    const freezer = page.getByRole("group", { name: "냉동실" });
    await expect(freezer).toContainText("만두");
    await expect(freezer.getByRole("button", { name: /^만두/ })).toHaveCount(0);
    await freezer.getByRole("button", { name: /냉동 아래 서랍.*서랍 열기/ }).click();
    await expect(freezer.getByRole("button", { name: /^만두 300g/ })).toBeVisible();
    await expect(page.getByRole("group", { name: "팬트리" })).toContainText("양파");

    // 재료를 누르면 상세 시트가 열린다
    await page.getByRole("button", { name: /^숙주/ }).click();
    await expect(page.getByRole("dialog", { name: "숙주" })).toBeVisible();
  });
});
