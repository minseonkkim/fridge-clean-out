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

/**
 * 글자와 그 뒤 배경의 명도 대비가 WCAG AA(본문 4.5:1, 큰 글자 3:1)에 못 미치는 곳.
 * 배경은 조상 중 처음 나오는 불투명 배경색을 쓰고, 반투명이면 그 아래 배경과 섞는다.
 * 숨겨진 것·비활성 버튼(WCAG 예외)·글자가 없는 이모지는 보지 않는다.
 */
async function lowContrast(page: Page) {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number];
    // Tailwind v4는 oklch()로 색을 내보내므로 캔버스에 칠해 sRGB 값으로 바꾼다
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    ctx.canvas.width = ctx.canvas.height = 1;
    const parse = (c: string): Rgba => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: Rgba, bottom: Rgba): Rgba => {
      const a = top[3];
      return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1) as Rgba;
    };
    const lum = ([r, g, b]: Rgba) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const background = (el: Element | null): Rgba | null => {
      const layers: Rgba[] = [];
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== "none") return null; // 그라데이션·이미지는 판단하지 않는다
        const c = parse(s.backgroundColor);
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 1) break;
      }
      const base: Rgba =
        getComputedStyle(document.body).colorScheme === "dark" ? [0, 0, 0, 1] : [255, 255, 255, 1];
      return layers.reduceRight<Rgba>((acc, layer) => over(layer, acc), base);
    };

    const bad: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const text = n.textContent?.trim() ?? "";
      if (!el || seen.has(el) || !/[\p{L}\p{N}]/u.test(text)) continue;
      seen.add(el);
      if (el.closest("[aria-hidden=true], [inert], :disabled, script, style, noscript")) continue;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || s.visibility === "hidden" || Number(s.opacity) === 0)
        continue;
      const bg = background(el);
      if (!bg) continue;
      const fg = over(parse(s.color), bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(s.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) {
        bad.push(
          `${ratio.toFixed(2)} "${text.slice(0, 20)}" ${el.className.toString().slice(0, 70)}`,
        );
      }
    }
    return bad;
  });
}

for (const scheme of ["light", "dark"] as const) {
  test(`${scheme === "dark" ? "다크" : "라이트"} 모드에서 모든 화면의 글자가 읽힌다`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet
      .getByRole("textbox")
      .fill("우유 1L, 김치 500g, 돼지고기 150g, 만두 300g, 숙주 200g");
    await sheet.getByRole("button", { name: "5개 냉장고에 넣기" }).click();
    await expect(sheet).toBeHidden();

    const found: Record<string, string[]> = {};
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const bad = await lowContrast(page);
      if (bad.length) found[route] = bad;
    }
    // 냉장고 홈의 목록 보기
    await page.goto("/fridge");
    await page.getByRole("radio", { name: "목록" }).click();
    const list = await lowContrast(page);
    if (list.length) found["/fridge (목록)"] = list;
    expect(found).toEqual({});
  });
}
