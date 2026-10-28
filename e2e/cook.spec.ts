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

test.describe("요리 완료", () => {
  test("뺄 재료를 미리 보여 주고, 완료하면 재고가 줄고 식단이 바뀐다", async ({ page }) => {
    await addBulk(page, "김치 500g, 돼지고기 150g", 2);
    await page.goto("/recipes/kimchi_stew");

    await page.getByRole("button", { name: "요리 완료" }).click();
    const sheet = page.getByRole("dialog", { name: "이 재료를 냉장고에서 뺄게요" });
    const list = sheet.getByRole("list", { name: "뺄 재료" });
    await expect(list).toContainText("배추김치 200g");
    await expect(list).toContainText("돼지고기 150g");

    await sheet.getByRole("button", { name: "김치찌개 완료" }).click();
    const result = page.getByRole("status", { name: "요리 완료 결과" });
    await expect(result).toContainText("김치찌개 완료!");

    // 돼지고기는 다 써서 냉장고에서 빠지고, 김치는 300g 남는다
    await page.goto("/fridge");
    await expect(page.getByRole("button", { name: /돼지고기/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /배추김치/ })).toContainText("300g");

    // 돼지고기가 없으니 김치찌개는 더 이상 만들 수 없다
    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("button", { name: "재료가 모자라요" })).toBeDisabled();
  });

  test("단위가 다른 재료는 다 쓴 것으로 처리하고 수량을 고치라고 안내한다", async ({ page }) => {
    // 계란을 팩 단위로 넣으면 레시피(개 단위)와 단위가 다르다
    await addBulk(page, "계란 1팩", 1);
    await page.goto("/recipes/steamed_egg");
    await page.getByRole("button", { name: "요리 완료" }).click();
    const sheet = page.getByRole("dialog", { name: "이 재료를 냉장고에서 뺄게요" });
    await expect(sheet).toContainText("단위가 달라 전부 사용");
    await sheet.getByRole("button", { name: "계란찜 완료" }).click();

    const result = page.getByRole("status", { name: "요리 완료 결과" });
    await expect(result).toContainText(
      "계란 1팩은(는) 레시피와 단위가 달라 다 쓴 것으로 처리했어요",
    );
    await expect(result.getByRole("link", { name: "냉장고에서 수량을 고쳐" })).toBeVisible();
  });

  test("필수 재료가 없으면 요리 완료를 누를 수 없다", async ({ page }) => {
    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("button", { name: "재료가 모자라요" })).toBeDisabled();
  });
});
