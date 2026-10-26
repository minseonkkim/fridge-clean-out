import type { MetadataRoute } from "next";

/** 앱 대표 색 (emerald-600) */
export const THEME_COLOR = "#059669";

/** PWA 매니페스트 (기획서 4.2절) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "냉털 레시피",
    short_name: "냉털",
    description: "유통기한 급한 재료부터 다 먹는 며칠치 식단과 최소 장보기",
    lang: "ko",
    start_url: "/fridge",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    categories: ["food", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
