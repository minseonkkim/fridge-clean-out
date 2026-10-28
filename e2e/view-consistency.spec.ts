import { expect, test, type Page } from "./fixtures";

/** 보이는 재료마다 id → 접근 이름(이름·수량·D-day)이 같은지 비교하기 위해 모은다 */
async function collect(page: Page) {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (const el of document.querySelectorAll<HTMLElement>("[data-item-id]")) {
      if (el.closest("[aria-hidden=true], [inert]")) continue;
      // 장식(aria-hidden)을 뺀 글자 = 화면 읽기 프로그램이 읽는 내용
      const visible = el.cloneNode(true) as HTMLElement;
      visible
        .querySelectorAll("[aria-hidden=true], [data-storage-badge]")
        .forEach((h) => h.remove());
      out[el.dataset.itemId!] = (
        el.getAttribute("aria-label") ??
        visible.textContent ??
        ""
      ).replace(/\s+/g, "");
    }
    return out;
  });
}

test("냉장고 보기와 목록 보기가 같은 재료·수량·기한을 보여 준다", async ({ page }) => {
  await page.goto("/fridge");
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet
    .getByRole("textbox")
    .fill("우유 1L, 계란 10, 김치 500g, 돼지고기 150g, 만두 300g, 양파 2개, 대파 1단, 간장 1병");
  await sheet.getByRole("button", { name: "8개 냉장고에 넣기" }).click();
  await expect(sheet).toBeHidden();

  // 냉동 서랍은 닫혀 있으면 재료가 그려지지 않으니 연다
  const freezer = page.getByRole("group", { name: "냉동실" });
  const closed = freezer.getByRole("button", { name: /서랍 열기/ });
  while ((await closed.count()) > 0) await closed.first().click();
  const fridge = await collect(page);
  expect(Object.keys(fridge)).toHaveLength(8);

  await page.getByRole("radio", { name: "목록" }).click();
  const list = await collect(page);
  expect(list).toEqual(fridge);
});
