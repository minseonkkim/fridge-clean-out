import { expect, test, type Page } from "./fixtures";

/** 재료를 넣고 기한을 오늘 기준 days일 뒤로 바꾼다 */
async function addWithExpiry(page: Page, name: string, days: number) {
  const date = await page.evaluate((d) => {
    const t = new Date();
    t.setDate(t.getDate() + d);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, days);
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("combobox", { name: "이름" }).fill(name);
  await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
  await sheet.getByRole("button", { name: "완료" }).click();
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  const detail = page.getByRole("dialog", { name });
  await detail.getByLabel("기한").fill(date);
  await detail.getByRole("button", { name: "저장" }).click();
  await expect(detail).toBeHidden();
}

test.describe("신선도 표현", () => {
  test("넉넉함·곧·급함·지남을 구분하고 D-day 글자를 항상 보여 준다", async ({ page }) => {
    await page.goto("/fridge");
    await addWithExpiry(page, "계란", 10);
    await addWithExpiry(page, "두부", 3);
    await addWithExpiry(page, "숙주", 1);
    await addWithExpiry(page, "상추", -2);

    const token = (name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });
    await expect(token("계란")).toHaveAttribute("data-freshness", "fresh");
    await expect(token("두부")).toHaveAttribute("data-freshness", "soon");
    await expect(token("숙주")).toHaveAttribute("data-freshness", "urgent");
    await expect(token("상추")).toHaveAttribute("data-freshness", "expired");

    // 색만으로 구분하지 않도록 D-day 글자가 늘 함께 있다
    await expect(token("두부")).toContainText("D-3");
    await expect(token("숙주")).toContainText("D-1");
    await expect(token("상추")).toContainText("D+2");

    // 급한 재료는 흔들리고, 지난 재료에는 파리 아이콘
    const wobble = await token("숙주").evaluate((el) => getComputedStyle(el).animationName);
    expect(wobble).toBe("item-wobble");
    await expect(token("상추").locator("[data-fly-icon]")).toBeAttached();
  });

  test("냉동 재료에는 서리가 낀다", async ({ page }) => {
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill("만두 300g, 계란 10");
    await sheet.getByRole("button", { name: "2개 냉장고에 넣기" }).click();

    const freezer = page.getByRole("group", { name: "냉동실" });
    await freezer.getByRole("button", { name: /냉동 아래 서랍.*서랍 열기/ }).click();
    await expect(
      freezer.getByRole("button", { name: /^만두/ }).locator("[data-frost]"),
    ).toBeAttached();
    await expect(page.getByRole("button", { name: /^계란/ }).locator("[data-frost]")).toHaveCount(
      0,
    );
  });

  test("움직임 줄이기 설정이면 흔들리지 않는다", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/fridge");
    await addWithExpiry(page, "숙주", 0);
    const anim = await page
      .getByRole("button", { name: /^숙주/ })
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe("none");
  });
});
