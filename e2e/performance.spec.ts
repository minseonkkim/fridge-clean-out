import { expect, test } from "./fixtures";

/** 냉장실·냉동실·채소칸·문 선반에 고루 퍼지는 재료 10종 */
const MIX =
  "우유 1L, 계란 10, 두부 1모, 돼지고기 300g, 만두 300g, 양파 1개, 대파 1단, 김치 500g, 사과 1개, 요거트 2";

/**
 * 3D 냉장고 성능 (결정 D1 개정).
 * 이 테스트는 GPU 없이 소프트웨어로 WebGL을 그리므로 3D 애니메이션의 실제 프레임 속도는 잴 수 없다.
 * 대신 저사양 폰에서 끊김을 만드는 원인을 막는다.
 * - 가만히 있으면 3D를 다시 그리지 않는다 (필요할 때만 그리기)
 * - 페이지를 스크롤해도 3D를 다시 그리지 않아 스크롤이 부드럽다
 * - 재료 200개를 그려도 그리기 호출 수가 정해진 예산 안이다
 * 실제 폰의 3D 애니메이션 속도는 실기기에서 확인한다.
 */
test.describe("성능", () => {
  test("재료 200개를 넣어도 가만히 있을 때·스크롤할 때 3D를 다시 그리지 않고, 그리기 호출이 예산 안이다", async ({
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

    const canvas = page.locator("[data-fridge-3d] canvas");
    await expect(canvas).toHaveAttribute("data-frames", /\d+/);
    // 첫 장면이 자리를 잡을 때까지 기다린다
    await page.waitForTimeout(3000);
    const frames = async () => Number(await canvas.getAttribute("data-frames"));

    const calls = Number(await canvas.getAttribute("data-calls"));
    console.log(`그리기 호출 ${calls}번 (재료 200개)`);
    expect(calls).toBeLessThan(900);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // 가만히 있을 때
    const idle0 = await frames();
    await page.waitForTimeout(1500);
    expect(await frames(), "가만히 있는데 3D를 다시 그렸다").toBe(idle0);

    // 스크롤할 때: 프레임 간격을 재면서 끝까지 내렸다가 올린다
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
    const scroll0 = await frames();
    for (const dy of [...Array(12).fill(300), ...Array(12).fill(-300)]) {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(50);
    }
    const gaps = await page.evaluate(() => {
      const w = window as unknown as { __gaps: number[]; __stop: boolean };
      w.__stop = true;
      return w.__gaps.slice(1).sort((a, b) => a - b);
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const pct = (p: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))];
    console.log(
      `스크롤 프레임 ${gaps.length}개 · 중앙값 ${pct(0.5).toFixed(1)}ms · p95 ${pct(0.95).toFixed(1)}ms`,
    );
    expect(await frames(), "스크롤하는데 3D를 다시 그렸다").toBe(scroll0);
    // CPU 4배 감속에서도 대부분 60fps, 늦은 프레임도 두 프레임(33ms)을 크게 넘지 않는다.
    // (이름표 층을 따로 합성하고 냉장고 영역의 다시 그리기를 가둬서 지킨다)
    expect(pct(0.5)).toBeLessThan(20);
    expect(pct(0.95)).toBeLessThan(50);
  });
});
