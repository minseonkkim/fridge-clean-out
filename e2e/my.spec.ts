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

test.describe("마이", () => {
  test("체험 모드 계정 안내와 설정 화면을 보여 준다", async ({ page }) => {
    await page.goto("/my");
    await expect(page.getByText("로그인하지 않은 체험 모드입니다")).toBeVisible();
    await expect(page.getByRole("heading", { name: "식습관" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "기본 양념" })).toBeVisible();
  });

  test("끼니와 조리도구를 바꾸면 저장되고 식단에 반영된다", async ({ page }) => {
    await page.goto("/my");
    await page.getByRole("radio", { name: "1끼" }).click();
    await page.getByRole("button", { name: "에어프라이어" }).click();
    await page.reload();
    await expect(page.getByRole("radio", { name: "1끼" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "에어프라이어" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goto("/plan");
    await expect(page.getByRole("radio", { name: "하루 1끼" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("기본 양념을 끄면 그 양념이 필요한 요리는 냉장고에 있어야 한다", async ({ page }) => {
    await addBulk(page, "김치 500g, 돼지고기 300g", 2);
    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("status", { name: "요리 가능 여부" })).toHaveText(
      "지금 냉장고 재료로 만들 수 있어요",
    );

    await page.goto("/my");
    await page.getByRole("button", { name: "고춧가루 있음" }).click();
    await expect(page.getByRole("button", { name: "고춧가루 없음" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("status", { name: "요리 가능 여부" })).toHaveText(
      "필수 재료 1가지가 없어요",
    );
  });
});
