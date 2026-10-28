import { expect, test } from "./fixtures";

test.describe("PWA", () => {
  test("매니페스트가 기획서 설정대로 나온다", async ({ page, request }) => {
    await page.goto("/fridge");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();

    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: "냉털 레시피",
      short_name: "냉털",
      display: "standalone",
      start_url: "/fridge",
      theme_color: "#059669",
    });
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
  });

  test("매니페스트 아이콘, 파비콘, apple-touch-icon, iOS 시작 화면 파일이 실제로 있다", async ({
    page,
    request,
  }) => {
    await page.goto("/fridge");
    const hrefs = await page
      .locator(
        'link[rel="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-startup-image"]',
      )
      .evaluateAll((links) => links.map((l) => l.getAttribute("href")!));
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    const all = [...hrefs, ...manifest.icons.map((i: { src: string }) => i.src)];

    expect(hrefs.some((h) => h.includes("apple-icon"))).toBe(true);
    expect(hrefs.filter((h) => h.includes("/splash/"))).toHaveLength(5);
    for (const href of all) {
      const res = await request.get(href);
      expect(res.status(), href).toBe(200);
      expect(res.headers()["content-type"], href).toMatch(/image/);
    }
  });

  test("서비스 워커가 등록되면 오프라인에서 새로 고침해도 화면이 뜬다", async ({
    page,
    context,
  }) => {
    await page.goto("/fridge");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // 서비스 워커가 이 페이지를 제어하도록 한 번 더 연다.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    // 체험 데이터를 넣어 두고 오프라인으로 바꾼다.
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("combobox", { name: "이름" }).fill("양파");
    await sheet.getByRole("button", { name: "냉장고에 넣기" }).click();
    await sheet.getByRole("button", { name: "완료" }).click();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "내 냉장고" })).toBeVisible();
    await expect(page.getByText("재료 1개")).toBeVisible();

    // 미리 캐시된 다른 탭도 열린다.
    await page.goto("/plan");
    await expect(page.getByRole("heading", { name: "식단 플랜" })).toBeVisible();
    await context.setOffline(false);
  });

  test("테마 색과 iOS 웹앱 메타 태그가 있다", async ({ page }) => {
    await page.goto("/fridge");
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute(
      "content",
      "#059669",
    );
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute(
      "content",
      "yes",
    );
  });
});
