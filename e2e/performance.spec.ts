import { expect, test } from "./fixtures";

/** 냉장실·냉동실·채소칸·문 선반에 고루 퍼지는 재료 10종 */
const MIX =
  "우유 1L, 계란 10, 두부 1모, 돼지고기 300g, 만두 300g, 양파 1개, 대파 1단, 김치 500g, 사과 1개, 요거트 2";

test.describe("성능", () => {
  test("재료 200개를 저사양 수준(CPU 4배 느리게)에서도 끊김 없이 스크롤하고 칸을 확대한다", async ({
    page,
  }) => {
    test.slow();
    await page.goto("/fridge");
    await page.getByRole("button", { name: "재료 추가" }).click();
    const sheet = page.getByRole("dialog", { name: "재료 추가" });
    await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
    await sheet.getByRole("textbox").fill(Array(20).fill(MIX).join(", "));
    await sheet.getByRole("button", { name: "200개 냉장고에 넣기" }).click();
    await expect(sheet).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText("재료 200개")).toBeVisible();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // 프레임 간격을 기록하면서 끝까지 스크롤했다가 돌아오고, 칸을 확대했다 닫는다
    await page.evaluate(() => {
      const w = window as unknown as { __gaps: number[]; __stop: boolean };
      w.__gaps = [];
      w.__stop = false;
      let last = performance.now();
      requestAnimationFrame(function tick(now) {
        w.__gaps.push(now - last);
        last = now;
        if (!w.__stop) requestAnimationFrame(tick);
      });
    });
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
    }
    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, -300);
      await page.waitForTimeout(50);
    }
    await page.getByRole("button", { name: "위 선반" }).click();
    await page.getByRole("button", { name: "닫기" }).click();
    await page.waitForTimeout(300);
    const gaps = await page.evaluate(() => {
      const w = window as unknown as { __gaps: number[]; __stop: boolean };
      w.__stop = true;
      return w.__gaps.slice(1).sort((a, b) => a - b);
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    const pct = (p: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))];
    console.log(
      `프레임 ${gaps.length}개 · 중앙값 ${pct(0.5).toFixed(1)}ms · p95 ${pct(0.95).toFixed(1)}ms · 최대 ${gaps.at(-1)!.toFixed(1)}ms`,
    );
    // 대부분 60fps(16.7ms) 근처, 가끔 늦은 프레임도 두 프레임(33ms)을 크게 넘지 않는다
    expect(pct(0.5)).toBeLessThan(20);
    expect(pct(0.95)).toBeLessThan(50);
  });
});
