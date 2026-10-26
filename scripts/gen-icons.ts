// 앱 아이콘과 iOS 시작 화면 PNG를 만든다. 실행: npm run gen:icons
// Playwright의 Chromium으로 SVG/HTML을 그려 저장한다 (추가 이미지 라이브러리 없이).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { iconSvg, splashHtml } from "./icon-source.ts";
import { SPLASH_SCREENS } from "../src/app/splash-screens.ts";

const ROOT = join(import.meta.dirname, "..");
const ICONS = join(ROOT, "public", "icons");
const SPLASH = join(ROOT, "public", "splash");
mkdirSync(ICONS, { recursive: true });
mkdirSync(SPLASH, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderSvg(svg: string, size: number, file: string) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log(`생성: ${file}`);
}

await renderSvg(iconSvg({ size: 192 }), 192, join(ICONS, "icon-192.png"));
await renderSvg(iconSvg({ size: 512 }), 512, join(ICONS, "icon-512.png"));
await renderSvg(iconSvg({ size: 512, safe: true }), 512, join(ICONS, "icon-maskable-512.png"));
// iOS는 투명 배경 대신 꽉 찬 사각형을 쓰고 모서리는 시스템이 둥글린다.
await renderSvg(
  iconSvg({ size: 180, safe: true }),
  180,
  join(ROOT, "src", "app", "apple-icon.png"),
);
writeFileSync(join(ROOT, "src", "app", "icon.svg"), iconSvg({ size: 64 }));
console.log("생성: src/app/icon.svg");

for (const s of SPLASH_SCREENS) {
  const width = s.width * s.ratio;
  const height = s.height * s.ratio;
  await page.setViewportSize({ width, height });
  await page.setContent(splashHtml(width, height));
  const file = join(SPLASH, `splash-${width}x${height}.png`);
  await page.screenshot({ path: file });
  console.log(`생성: ${file}`);
}

await browser.close();
