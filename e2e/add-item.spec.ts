import { expect, test } from "./fixtures";

test.describe("재료 추가 (체험 모드)", () => {
  test("별칭으로 찾아 넣으면 냉장고에 들어가고 새로고침해도 남는다", async ({ page }) => {
    await page.goto("/fridge");
    await expect(page.getByText("재료 0개")).toBeVisible();

    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await expect(sheet).toBeVisible();

    await sheet.getByRole("combobox", { name: "이름" }).fill("삼겹");
    await sheet.getByRole("option").filter({ hasText: "돼지고기" }).first().click();

    await expect(sheet.getByRole("radio", { name: "냉장" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(sheet.getByLabel("수량")).toHaveValue("300");
    await expect(sheet.getByText("D-3")).toBeVisible();

    // 냉동으로 바꾸면 기한이 다시 계산된다
    await sheet.getByRole("radio", { name: "냉동" }).click();
    await expect(sheet.getByText("D-90")).toBeVisible();

    await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
    await expect(sheet.getByRole("status")).toHaveText("방금 넣음: 돼지고기 300g");
    await sheet.getByRole("button", { name: "완료" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("재료 1개")).toBeVisible();

    await page.reload();
    await expect(page.getByText("재료 1개")).toBeVisible();
  });

  test("사전에 없는 재료도 이름으로 넣을 수 있다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });

    await sheet.getByRole("combobox", { name: "이름" }).fill("할머니 고추장아찌");
    await expect(sheet.getByText("사전에 없는 재료로 등록돼요")).toBeVisible();
    await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
    await sheet.getByRole("button", { name: "완료" }).click();

    await expect(page.getByText("재료 1개")).toBeVisible();
  });

  test("하나씩 넣을 때 시트가 닫히지 않고 이어서 넣을 수 있다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    const name = sheet.getByRole("combobox", { name: "이름" });

    for (const item of ["양파", "계란", "두부"]) {
      await name.fill(item);
      await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
      await expect(name).toHaveValue("");
      await expect(name).toBeFocused();
    }
    await expect(sheet.getByRole("status")).toHaveText("방금 넣음: 양파 1개, 계란 2개, 두부 1팩");
    await sheet.getByRole("button", { name: "완료" }).click();
    await expect(page.getByText("재료 3개")).toBeVisible();
  });

  test("기한을 직접 고치면 표시되고 권장값으로 되돌릴 수 있다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });

    await sheet.getByRole("combobox", { name: "이름" }).fill("계란");
    await sheet.getByLabel(/^기한/).fill("2099-01-01");
    await expect(sheet.getByText("직접 정한 기한이에요")).toBeVisible();
    await sheet.getByRole("button", { name: "권장 기한으로 되돌리기" }).click();
    await expect(sheet.getByText("D-35")).toBeVisible();
  });

  test("여러 재료를 한 줄로 한 번에 넣는다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });

    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill("양파 3, 두부 1, 계란 10, 돼지고기 600g");
    const preview = sheet.getByRole("list", { name: "넣을 재료 미리보기" });
    await expect(preview.getByRole("listitem")).toHaveCount(4);
    await expect(preview).toContainText("600g");

    await sheet.getByRole("button", { name: "4개 냉장고에 넣기" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("재료 4개")).toBeVisible();
  });

  test("최근 산 재료를 한 번 눌러 다시 넣는다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    let sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill("양파 3, 두부 1");
    await sheet.getByRole("button", { name: "2개 냉장고에 넣기" }).click();
    await expect(page.getByText("재료 2개")).toBeVisible();

    await page.getByRole("button", { name: "재료 추가" }).click();
    sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("button", { name: "양파 다시 넣기" }).click();
    await expect(sheet.getByRole("status")).toHaveText("방금 넣음: 양파 3개");
    await sheet.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByText("재료 3개")).toBeVisible();
  });

  test("이름 없이 넣으면 안내한다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
    await expect(sheet.getByRole("alert")).toHaveText("재료 이름을 입력해 주세요.");
  });
});
