import { expect, test, type Page } from "./fixtures";

const ROUTES = [
  "/",
  "/login",
  "/onboarding",
  "/fridge",
  "/plan",
  "/recipes/kimchi_stew",
  "/shopping",
  "/my",
];

/** 가로로 넘치는 요소 (화면 밖으로 삐져나가 가로 스크롤을 만드는 것) */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const bad: string[] = [];
    if (document.documentElement.scrollWidth > width) {
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > width + 1 && !el.closest("[aria-hidden=true], [inert]")) {
          bad.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 60)}`);
        }
      }
      bad.unshift(`scrollWidth ${document.documentElement.scrollWidth} > ${width}`);
    }
    return bad.slice(0, 5);
  });
}

/**
 * 44×44px보다 작은 누름 대상. 문장 속 링크(인라인)는 WCAG 2.5.8 예외라 뺀다.
 * 숨겨진 것·닫힌 문 안쪽은 누를 수 없으니 보지 않는다.
 */
async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    const sel =
      "button, a[href], input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox]";
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest("[aria-hidden=true], [inert]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      if (el.tagName === "A" && style.display === "inline") continue;
      // 체크박스·라디오는 감싼 label이 누름 영역이다
      const box = el.closest("label")?.getBoundingClientRect() ?? r;
      if (Math.round(box.width) < 44 || Math.round(box.height) < 44) {
        bad.push(
          `${Math.round(box.width)}x${Math.round(box.height)} ${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30)}"`,
        );
      }
    }
    return bad;
  });
}

for (const width of [360, 430]) {
  test.describe(`세로 ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("모든 화면이 가로로 넘치지 않는다", async ({ page }) => {
      // 재료가 있어야 냉장고·식단·장보기 화면이 채워진다
      await page.goto("/fridge");
      await page.getByRole("button", { name: "재료 추가" }).click();
      const sheet = page.getByRole("dialog", { name: "재료 추가" });
      await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
      await sheet
        .getByRole("textbox")
        .fill("우유 1L, 계란 10, 김치 500g, 돼지고기 150g, 만두 300g, 양파 1개, 대파 1단");
      await sheet.getByRole("button", { name: "7개 냉장고에 넣기" }).click();
      await expect(sheet).toBeHidden();

      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        expect(await overflowing(page), route).toEqual([]);
      }
    });

    test("누름 대상이 44×44px 이상이다", async ({ page }) => {
      await page.goto("/fridge");
      await page.getByRole("button", { name: "재료 추가" }).click();
      const sheet = page.getByRole("dialog", { name: "재료 추가" });
      await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
      await sheet.getByRole("textbox").fill("우유 1L, 김치 500g, 돼지고기 150g, 만두 300g");
      await sheet.getByRole("button", { name: "4개 냉장고에 넣기" }).click();
      await expect(sheet).toBeHidden();

      const found: Record<string, string[]> = {};
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const bad = await smallTargets(page);
        if (bad.length) found[route] = bad;
      }
      expect(found).toEqual({});
    });
  });
}
