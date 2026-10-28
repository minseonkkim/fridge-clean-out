import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..");

function tsxFiles(): string[] {
  return readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(SRC, f));
}

/**
 * viewport-fit=cover라서 화면 아래에 붙는 고정 요소는 홈 인디케이터를 피해야 한다.
 * 손가락을 따라다니거나 화면 전체를 덮는 장식(pointer-events-none)은 제외한다.
 */
describe("safe-area", () => {
  it("화면 아래에 고정된 요소는 safe-area-inset-bottom을 더한다", () => {
    const offenders: string[] = [];
    for (const file of tsxFiles()) {
      const text = readFileSync(file, "utf8");
      for (const [cls] of text.matchAll(/"[^"]*\bfixed\b[^"]*"|`[^`]*\bfixed\b[^`]*`/g)) {
        if (cls.includes("pointer-events-none")) continue;
        const anchoredBottom = /\bbottom-|\binset-0\b/.test(cls);
        // 바텀 시트처럼 안쪽 요소가 대신 더하는 경우도 있어 같은 파일 안에서 찾는다
        if (anchoredBottom && !text.includes("safe-area-inset-bottom")) {
          offenders.push(`${file.slice(SRC.length + 1)}: ${cls.slice(0, 80)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("페이지 본문은 노치·홈 인디케이터만큼 안쪽에서 시작한다", () => {
    const css = readFileSync(join(SRC, "app", "globals.css"), "utf8");
    const body = /body\s*\{[^}]*\}/.exec(css)![0];
    for (const side of ["top", "right", "bottom", "left"]) {
      expect(body).toContain(`env(safe-area-inset-${side})`);
    }
  });
});
