import { expect, test, type Page } from "./fixtures";

async function addBulk(page: Page, text: string, count: number) {
  await page.goto("/fridge");
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill(text);
  await sheet.getByRole("button", { name: `${count}개 냉장고에 넣기` }).click();
  await expect(sheet).toBeHidden();
}

test.describe("레시피 상세", () => {
  test("재료마다 있음·기본 양념·없음을 보여 준다", async ({ page }) => {
    await addBulk(page, "김치 500g", 1);
    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("heading", { name: "김치찌개" })).toBeVisible();
    await expect(page.getByRole("status", { name: "요리 가능 여부" })).toHaveText(
      "필수 재료 1가지가 없어요",
    );

    const required = page.getByRole("list", { name: "필수 재료" });
    await expect(required.getByRole("listitem").filter({ hasText: "배추김치 200g" })).toContainText(
      "있음",
    );
    await expect(
      required.getByRole("listitem").filter({ hasText: "돼지고기 150g 또는 참치캔 1개" }),
    ).toContainText("없음");
    await expect(required.getByRole("listitem").filter({ hasText: "고춧가루" })).toContainText(
      "기본 양념",
    );
  });

  test("인분을 바꾸면 재료 양과 부족 여부가 다시 계산된다", async ({ page }) => {
    await addBulk(page, "김치 300g, 돼지고기 300g", 2);
    await page.goto("/recipes/kimchi_stew");
    const required = page.getByRole("list", { name: "필수 재료" });
    await expect(required).toContainText("배추김치 200g");
    await expect(required).not.toContainText("양이 조금 모자라요");

    await page.getByRole("button", { name: "인분 늘리기" }).click();
    await page.getByRole("button", { name: "인분 늘리기" }).click();
    await expect(page.getByRole("group", { name: "인분" })).toContainText("4인분");
    await expect(required).toContainText("배추김치 400g");
    await expect(required.getByRole("listitem").filter({ hasText: "배추김치" })).toContainText(
      "양이 조금 모자라요",
    );
  });

  test("단계별 조리법과 타이머를 보여 준다", async ({ page }) => {
    await page.clock.install();
    await page.goto("/recipes/kimchi_stew");
    const steps = page.getByRole("list").filter({ hasText: "물 400ml를 붓고" });
    await expect(steps.getByRole("listitem")).toHaveCount(4);

    const timer = page.getByRole("button", { name: "타이머 시작, 10:00" });
    await timer.click();
    await page.clock.runFor(3_000);
    await expect(page.getByRole("button", { name: /타이머 일시정지, 9:57 남음/ })).toBeVisible();
    await page.clock.runFor(600_000);
    await expect(page.getByRole("button", { name: "타이머 다시 시작" })).toHaveText(/다 됐어요/);
  });

  test("식단 카드에서 레시피로 들어가면 만들 수 있다고 나온다", async ({ page }) => {
    await addBulk(page, "김치 500g, 돼지고기 300g", 2);
    await page.goto("/plan");
    await page
      .getByRole("link", { name: /김치찌개/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/recipes\/kimchi_stew$/);
    await expect(page.getByRole("status", { name: "요리 가능 여부" })).toHaveText(
      "지금 냉장고 재료로 만들 수 있어요",
    );
  });
});
