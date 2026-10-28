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

test.describe("장보기", () => {
  test("하나만 사면 되는 재료를 추천하고 목록에 담는다", async ({ page }) => {
    await addBulk(page, "김치 500g", 1);
    await page.goto("/shopping");

    const buyOne = page.getByRole("region", { name: "딱 하나만 산다면" });
    await expect(buyOne.getByRole("listitem").first()).toBeVisible();
    // 1위 재료를 담는다 (레시피가 늘어 순위가 바뀌어도 되도록 이름을 화면에서 읽는다)
    const first = buyOne.getByRole("button", { name: / 장보기에 담기$/ }).first();
    const name =
      (await first.getAttribute("aria-label"))?.replace(" 장보기에 담기", "") ??
      (await first.textContent())!;
    await first.click();
    await expect(
      page.getByRole("status").filter({ hasText: "장보기 목록에 1개 담았어요." }),
    ).toBeVisible();
    const list = page.getByRole("list", { name: "장보기 목록" });
    await expect(list).toContainText(name);

    // 같은 재료는 다시 담지 않는다
    await buyOne.getByRole("button", { name: `${name} 장보기에 담기` }).click();
    await expect(page.getByRole("status").filter({ hasText: "이미 목록에 있어요." })).toBeVisible();
    await expect(list.getByRole("listitem")).toHaveCount(1);
  });

  test("요리에 부족한 재료를 한 번에 담고, 체크하고, 뺀다", async ({ page }) => {
    await addBulk(page, "김치 500g", 1);
    await page.goto("/shopping");

    await page.getByRole("button", { name: "김치찌개에 필요한 재료 담기" }).click();
    const list = page.getByRole("list", { name: "장보기 목록" });
    await expect(list).toContainText("돼지고기150g김치찌개용");

    await list.getByRole("checkbox").first().check();
    await expect(page.getByRole("heading", { name: /내 장보기 목록/ })).toContainText("1/1");

    await page.reload();
    await expect(
      page.getByRole("list", { name: "장보기 목록" }).getByRole("checkbox").first(),
    ).toBeChecked();

    await page.getByRole("button", { name: "돼지고기 목록에서 빼기" }).click();
    await expect(page.getByRole("list", { name: "장보기 목록" })).toHaveCount(0);
  });

  test("체크한 항목을 냉장고에 넣으면 목록에서 빠지고 냉장고에 들어간다", async ({ page }) => {
    await addBulk(page, "김치 500g", 1);
    await page.goto("/shopping");
    await page.getByRole("button", { name: "김치찌개에 필요한 재료 담기" }).click();

    const list = page.getByRole("list", { name: "장보기 목록" });
    await list.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "체크한 1개 냉장고에 넣기" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "1개를 냉장고에 넣었어요" }),
    ).toBeVisible();
    await expect(list).toHaveCount(0);

    await page.goto("/fridge");
    await expect(page.getByRole("region", { name: /아래 선반/ })).toContainText("돼지고기");

    // 이제 김치찌개를 만들 수 있다
    await page.goto("/recipes/kimchi_stew");
    await expect(page.getByRole("button", { name: "요리 완료" })).toBeEnabled();
  });

  test("목록대로 사면 식단이 어떻게 바뀌는지 미리 보여 준다", async ({ page }) => {
    // 김치는 내일까지라 지금은 버려질 위험, 돼지고기를 사면 김치찌개로 살린다
    await addBulk(page, "김치 200g", 1);
    await page.goto("/fridge");
    await page.getByRole("button", { name: /배추김치/ }).click();
    const detail = page.getByRole("dialog", { name: "배추김치" });
    const tomorrow = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    await detail.getByLabel("기한").fill(tomorrow);
    await detail.getByRole("button", { name: "저장" }).click();

    await page.goto("/shopping");
    await expect(page.getByRole("region", { name: "목록대로 사면" })).toHaveCount(0);
    await page.getByRole("button", { name: "김치찌개에 필요한 재료 담기" }).click();

    const sim = page.getByRole("region", { name: "목록대로 사면" });
    await expect(sim).toContainText("0 → 1끼");
    await expect(sim).toContainText("1 → 0개");
    await expect(sim).toContainText("배추김치을(를) 버리지 않게 돼요.");
  });

  test("빈 냉장고면 안내한다", async ({ page }) => {
    await page.goto("/shopping");
    await expect(page.getByText("하나만 사서 새로 만들 수 있는 요리가 없어요")).toBeVisible();
  });
});
