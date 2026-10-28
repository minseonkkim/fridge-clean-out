import { Art, shadow, shine, tone } from "./kit.ts";

/**
 * 화면 장식 그림 (냄비, 접시, 휴지통, 탭 아이콘 …). 재료 그림과 같은 입체 스타일로 그린다.
 */
const outline = (c: string) =>
  `stroke="${tone(c, -0.45)}" stroke-width="1.2" stroke-linejoin="round"`;

export const UI_ART = {
  pot: () => {
    const a = new Art();
    const c = "#d9dee2";
    return a.svg(
      `${shadow(22)}<path d="M20 12 q-3 -5 0 -9 M32 12 q-3 -5 0 -9 M44 12 q-3 -5 0 -9" stroke="#b0bec5" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8"/>` +
        `<rect x="2" y="28" width="10" height="6" rx="3" fill="${a.cyl("#455a64")}"/><rect x="52" y="28" width="10" height="6" rx="3" fill="${a.cyl("#455a64")}"/>` +
        `<path d="M10 24 H54 V48 Q54 56 46 56 H18 Q10 56 10 48 Z" fill="${a.cyl(c)}" ${outline(c)}/><ellipse cx="32" cy="22" rx="24" ry="5" fill="${a.top("#b0bec5", 0.3, 0.1)}" ${outline("#90a4ae")}/>` +
        `<rect x="28" y="13" width="8" height="5" rx="2" fill="${a.cyl("#455a64")}"/><path d="M15 30 V50" stroke="#fff" stroke-width="2.6" opacity="0.5" stroke-linecap="round"/>`,
    );
  },
  plate: () => {
    const a = new Art();
    return a.svg(
      `${shadow(26, 32, 50)}<ellipse cx="32" cy="40" rx="28" ry="12" fill="${a.top("#f5f7f8", 0.2, 0.15)}" ${outline("#cfd8dc")}/><ellipse cx="32" cy="38" rx="18" ry="7" fill="${a.top("#ffffff", 0, 0.08)}" stroke="#dfe5e8" stroke-width="1"/>${shine(18, 36, 6, 1.5, 0, 0.6)}`,
    );
  },
  trash: () => {
    const a = new Art();
    const c = "#78909c";
    return a.svg(
      `${shadow(16)}<path d="M16 20 H48 L45 56 H19 Z" fill="${a.cyl(c)}" ${outline(c)}/>${[24, 32, 40].map((x) => `<path d="M${x} 26 V50" stroke="${tone(c, -0.3)}" stroke-width="1.6"/>`).join("")}<rect x="12" y="13" width="40" height="7" rx="3" fill="${a.top(tone(c, 0.15))}" ${outline(c)}/><rect x="26" y="8" width="12" height="6" rx="2" fill="none" stroke="${tone(c, -0.3)}" stroke-width="2"/>`,
    );
  },
  fly: () => {
    const a = new Art();
    return a.svg(
      `<ellipse cx="22" cy="24" rx="12" ry="7" transform="rotate(-30 22 24)" fill="#cfe8f5" opacity="0.8" stroke="#90a4ae" stroke-width="1"/><ellipse cx="42" cy="24" rx="12" ry="7" transform="rotate(30 42 24)" fill="#cfe8f5" opacity="0.8" stroke="#90a4ae" stroke-width="1"/>` +
        `<ellipse cx="32" cy="38" rx="9" ry="13" fill="${a.ball("#37474f")}"/><circle cx="32" cy="24" r="7" fill="${a.ball("#263238")}"/><circle cx="28" cy="22" r="2.6" fill="#c62828"/><circle cx="36" cy="22" r="2.6" fill="#c62828"/>` +
        `<path d="M24 36 l-8 4 M24 42 l-8 6 M40 36 l8 4 M40 42 l8 6" stroke="#263238" stroke-width="1.6" stroke-linecap="round"/>`,
    );
  },
  pan: () => {
    const a = new Art();
    return a.svg(
      `${shadow(22, 28, 52)}<rect x="44" y="34" width="20" height="6" rx="3" fill="${a.cyl("#5d4037")}" transform="rotate(-10 44 37)"/><ellipse cx="26" cy="38" rx="22" ry="13" fill="${a.top("#37474f", 0.2, 0.3)}" ${outline("#263238")}/><ellipse cx="26" cy="36" rx="17" ry="9" fill="#455a64"/>` +
        `<path d="M14 36 Q16 28 24 30 Q30 26 36 32 Q40 38 32 41 Q22 44 14 36 Z" fill="#fbfaf4"/><circle cx="25" cy="35" r="5" fill="${a.ball("#f9b31c")}"/>${shine(23, 33, 1.6, 1, 0, 0.7)}`,
    );
  },
  snowflake: () =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="#29b6f6" stroke-width="5" stroke-linecap="round">${[
      0, 60, 120,
    ]
      .map(
        (r) =>
          `<path d="M32 6 V58 M24 12 L32 20 L40 12 M24 52 L32 44 L40 52" transform="rotate(${r} 32 32)" fill="none"/>`,
      )
      .join("")}</g></svg>`,
  timer: () => {
    const a = new Art();
    const c = "#ef5350";
    return a.svg(
      `${shadow(16)}<rect x="27" y="4" width="10" height="7" rx="2" fill="${a.cyl("#546e7a")}"/><circle cx="32" cy="36" r="21" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><circle cx="32" cy="36" r="15" fill="#fff"/><path d="M32 36 V25 M32 36 L40 40" stroke="#37474f" stroke-width="2.6" stroke-linecap="round"/>${shine(22, 24, 5, 2.5)}`,
    );
  },
  fridge: () => {
    const a = new Art();
    const c = "#e3f2fd";
    return a.svg(
      `${shadow(16)}<rect x="14" y="4" width="36" height="54" rx="6" fill="${a.cyl(c)}" ${outline("#90caf9")}/><path d="M14 24 H50" stroke="#90caf9" stroke-width="1.6"/><rect x="18" y="10" width="3" height="9" rx="1.5" fill="#64b5f6"/><rect x="18" y="29" width="3" height="14" rx="1.5" fill="#64b5f6"/><path d="M42 8 V54" stroke="#fff" stroke-width="2.4" opacity="0.6" stroke-linecap="round"/>`,
    );
  },
  plan: () => {
    const a = new Art();
    const c = "#ffb74d";
    return a.svg(
      `${shadow(20)}<rect x="8" y="14" width="48" height="40" rx="6" fill="${a.top(c, 0.25, 0.2)}" ${outline(c)}/><rect x="12" y="20" width="18" height="15" rx="3" fill="#fbfaf4"/><rect x="34" y="20" width="18" height="15" rx="3" fill="#a5d6a7"/><rect x="12" y="38" width="40" height="12" rx="3" fill="#ef9a9a"/><circle cx="21" cy="27" r="3" fill="#e0e0e0"/><circle cx="43" cy="27" r="3.5" fill="#66bb6a"/>`,
    );
  },
  cart: () => {
    const a = new Art();
    const c = "#66bb6a";
    return a.svg(
      `${shadow(20)}<path d="M4 12 H12 L18 40 H48 L54 18 H14" stroke="#455a64" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M16 20 H52 L47 38 H19 Z" fill="${a.top(c, 0.3, 0.2)}" ${outline(c)}/><circle cx="22" cy="50" r="4.5" fill="${a.ball("#455a64")}"/><circle cx="44" cy="50" r="4.5" fill="${a.ball("#455a64")}"/>`,
    );
  },
  person: () => {
    const a = new Art();
    const c = "#ffcc80";
    return a.svg(
      `${shadow(18)}<path d="M10 58 Q10 38 32 38 Q54 38 54 58 Z" fill="${a.top("#7986cb", 0.25, 0.25)}" ${outline("#5c6bc0")}/><circle cx="32" cy="22" r="13" fill="${a.ball(c, 0.3, 0.2)}" ${outline(c)}/><circle cx="27" cy="22" r="1.6" fill="#37474f"/><circle cx="37" cy="22" r="1.6" fill="#37474f"/><path d="M27 28 q5 4 10 0" stroke="#37474f" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    );
  },
} satisfies Record<string, () => string>;

export type UiArtName = keyof typeof UI_ART;

const cache = new Map<string, string>();

export function uiArtUrl(name: UiArtName): string {
  let url = cache.get(name);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(UI_ART[name]())}`;
    cache.set(name, url);
  }
  return url;
}
