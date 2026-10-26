/**
 * iOS 홈 화면 웹앱 시작 화면 (기획서 4.2절). 많이 쓰는 iPhone 세로 화면 크기.
 * 이미지는 scripts/gen-icons.ts가 public/splash/에 만든다.
 */
export const SPLASH_SCREENS = [
  { width: 375, height: 667, ratio: 2 }, // iPhone SE 2·3세대, 8
  { width: 390, height: 844, ratio: 3 }, // iPhone 12·13·14
  { width: 393, height: 852, ratio: 3 }, // iPhone 15·16, 14 Pro
  { width: 428, height: 926, ratio: 3 }, // iPhone 12·13 Pro Max, 14 Plus
  { width: 430, height: 932, ratio: 3 }, // iPhone 15·16 Plus/Pro Max, 14 Pro Max
] as const;

export function splashStartupImages() {
  return SPLASH_SCREENS.map((s) => ({
    url: `/splash/splash-${s.width * s.ratio}x${s.height * s.ratio}.png`,
    media: `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`,
  }));
}
