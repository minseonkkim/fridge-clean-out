/**
 * 재료 일러스트 부품 (결정 D8 개정).
 * 64×64 좌표에 SVG 조각을 문자열로 그린다. 입체감은 세 가지로 낸다.
 * - 왼쪽 위에서 빛이 드는 방사형 그라데이션 (밝은 면 → 본래 색 → 어두운 가장자리)
 * - 반들거리는 하이라이트 (흰 타원, 반투명)
 * - 바닥에 깔리는 부드러운 그림자
 * 필터(blur)는 저사양 폰에서 느려 쓰지 않는다.
 */

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: Rgb): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** amount > 0이면 흰색 쪽, < 0이면 검은색 쪽으로 섞는다 */
export function tone(color: string, amount: number): string {
  const c = rgb(color);
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return hex(c.map((v) => v + (target - v) * t) as Rgb);
}

/** 한 아이콘 안에서 그라데이션 정의를 모은다 */
export class Art {
  private defs: string[] = [];
  private n = 0;

  /** 공처럼 둥근 면 */
  ball(color: string, light = 0.45, dark = 0.32): string {
    const id = `g${this.n++}`;
    this.defs.push(
      `<radialGradient id="${id}" cx="0.36" cy="0.3" r="0.78"><stop offset="0" stop-color="${tone(color, light)}"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${tone(color, -dark)}"/></radialGradient>`,
    );
    return `url(#${id})`;
  }

  /** 원기둥처럼 가로로 둥근 면 (병·캔·팩) */
  cyl(color: string): string {
    const id = `g${this.n++}`;
    this.defs.push(
      `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${tone(color, -0.22)}"/><stop offset="0.3" stop-color="${tone(color, 0.28)}"/><stop offset="0.65" stop-color="${color}"/><stop offset="1" stop-color="${tone(color, -0.3)}"/></linearGradient>`,
    );
    return `url(#${id})`;
  }

  /** 위가 밝고 아래가 어두운 면 (납작한 것·고기·잎) */
  top(color: string, light = 0.3, dark = 0.25): string {
    const id = `g${this.n++}`;
    this.defs.push(
      `<linearGradient id="${id}" x1="0" x2="0.3" y1="0" y2="1"><stop offset="0" stop-color="${tone(color, light)}"/><stop offset="0.55" stop-color="${color}"/><stop offset="1" stop-color="${tone(color, -dark)}"/></linearGradient>`,
    );
    return `url(#${id})`;
  }

  svg(body: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${this.defs.join("")}</defs>${body}</svg>`;
  }
}

// ── 공통 조각 ──────────────────────────────────

export const shadow = (w = 20, cx = 32, cy = 58) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${(w / 6).toFixed(1)}" fill="#000" opacity="0.16"/>`;

export const shine = (cx: number, cy: number, rx: number, ry: number, rot = -30, op = 0.55) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="${op}"/>`;

const outline = (color: string) =>
  `stroke="${tone(color, -0.45)}" stroke-width="1.2" stroke-linejoin="round"`;

/** 포장 라벨 글자 (2~3글자). 작은 화면에서도 보이도록 굵고 짧게. */
export const label = (text: string, x: number, y: number, size = 8, color = "#fff") =>
  text
    ? `<text x="${x}" y="${y}" font-family="'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif" font-size="${size}" font-weight="800" fill="${color}" text-anchor="middle">${text}</text>`
    : "";

const leaf = (a: Art, x: number, y: number, rot: number, color = "#4caf50", len = 12) =>
  `<path d="M0 0 C ${len * 0.4} ${-len * 0.45}, ${len * 0.9} ${-len * 0.3}, ${len} 0 C ${len * 0.7} ${len * 0.3}, ${len * 0.3} ${len * 0.3}, 0 0 Z" transform="translate(${x} ${y}) rotate(${rot})" fill="${a.top(color)}" ${outline(color)}/>`;

// ── 과일·채소 ─────────────────────────────────

export interface BallOpts {
  color: string;
  w?: number;
  h?: number;
  cy?: number;
  /** 꼭지 모양 */
  top?: "stem" | "stemLeaf" | "calyx" | "onion" | "tuft" | "none" | "crown" | "persimmon";
  topColor?: string;
  /** 무늬 */
  pattern?: "dimples" | "stripes" | "spots" | "seeds" | "net" | "ribs" | "fuzz";
  patternColor?: string;
}

/** 둥근 과일·채소 (사과, 귤, 양파, 토마토, 수박 …) */
export function ball(o: BallOpts): string {
  const a = new Art();
  const w = o.w ?? 22;
  const h = o.h ?? 21;
  const cy = o.cy ?? 35;
  const tc = o.topColor ?? "#3f8f3a";
  const top = cy - h;
  let pat = "";
  const pc = o.patternColor ?? tone(o.color, -0.25);
  if (o.pattern === "dimples")
    pat = [
      [-8, -6],
      [3, -9],
      [9, 2],
      [-4, 6],
      [-10, 4],
      [5, 10],
      [0, -1],
    ]
      .map(
        ([dx, dy]) =>
          `<circle cx="${32 + dx}" cy="${cy + dy}" r="0.9" fill="${pc}" opacity="0.5"/>`,
      )
      .join("");
  if (o.pattern === "stripes")
    pat = [-12, -5, 2, 9]
      .map(
        (dx) =>
          `<path d="M${32 + dx} ${top + 3} Q ${32 + dx * 1.35} ${cy} ${32 + dx} ${cy + h - 3}" stroke="${pc}" stroke-width="3" fill="none" opacity="0.8"/>`,
      )
      .join("");
  if (o.pattern === "spots")
    pat = [
      [-9, -4],
      [6, -8],
      [8, 6],
      [-3, 9],
      [-11, 6],
      [2, 1],
    ]
      .map(
        ([dx, dy]) =>
          `<ellipse cx="${32 + dx}" cy="${cy + dy}" rx="1.6" ry="1.1" fill="${pc}" opacity="0.6"/>`,
      )
      .join("");
  if (o.pattern === "seeds")
    pat = [
      [-7, -5],
      [4, -8],
      [9, 1],
      [-2, 4],
      [-10, 5],
      [5, 9],
      [0, -2],
      [-5, 10],
    ]
      .map(([dx, dy]) => `<path d="M${32 + dx} ${cy + dy} l1 2 l-2 0 z" fill="${pc}"/>`)
      .join("");
  if (o.pattern === "net")
    pat = `<path d="M${32 - w + 4} ${cy - 4} Q 32 ${cy - 12} ${32 + w - 4} ${cy - 4} M${32 - w + 2} ${cy + 4} Q 32 ${cy - 3} ${32 + w - 2} ${cy + 4} M${32 - 8} ${top + 4} Q ${32 - 12} ${cy} ${32 - 8} ${cy + h - 3} M${32 + 8} ${top + 4} Q ${32 + 12} ${cy} ${32 + 8} ${cy + h - 3}" stroke="${pc}" stroke-width="1" fill="none" opacity="0.7"/>`;
  if (o.pattern === "ribs")
    pat = [-8, 0, 8]
      .map(
        (dx) =>
          `<path d="M${32 + dx} ${top + 2} Q ${32 + dx * 1.6} ${cy} ${32 + dx} ${cy + h - 1}" stroke="${pc}" stroke-width="1.2" fill="none" opacity="0.55"/>`,
      )
      .join("");
  if (o.pattern === "fuzz")
    pat = `<ellipse cx="32" cy="${cy}" rx="${w - 1}" ry="${h - 1}" fill="none" stroke="${pc}" stroke-width="1.5" stroke-dasharray="1 2" opacity="0.5"/>`;

  let crown = "";
  switch (o.top) {
    case "stem":
      crown = `<path d="M32 ${top + 3} q1 -6 4 -8" stroke="#6b4423" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      break;
    case "stemLeaf":
      crown = `<path d="M32 ${top + 3} q1 -6 3 -8" stroke="#6b4423" stroke-width="2.4" fill="none" stroke-linecap="round"/>${leaf(a, 34, top - 2, -25, tc, 12)}`;
      break;
    case "calyx":
      crown =
        [0, 72, 144, 216, 288]
          .map(
            (r) =>
              `<path d="M32 ${top + 2} l-2 -1 l2 -6 l2 6 z" fill="${tc}" transform="rotate(${r} 32 ${top + 2})"/>`,
          )
          .join("") + `<circle cx="32" cy="${top + 1}" r="2" fill="${tone(tc, -0.2)}"/>`;
      break;
    case "persimmon":
      crown = `<path d="M22 ${top + 2} Q32 ${top - 4} 42 ${top + 2} Q32 ${top + 6} 22 ${top + 2} Z" fill="${a.top(tc)}"/><rect x="31" y="${top - 5}" width="2.4" height="5" rx="1" fill="#6b4423"/>`;
      break;
    case "onion":
      crown = `<path d="M30 ${top + 3} Q32 ${top - 8} 33 ${top - 9} Q33 ${top - 3} 35 ${top + 3} Z" fill="${a.top(tone(o.color, -0.1))}"/>`;
      break;
    case "tuft":
      crown = `<path d="M32 ${top + 3} q-6 -10 -9 -12 M32 ${top + 3} q0 -11 1 -14 M32 ${top + 3} q6 -9 9 -11" stroke="${tc}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      break;
    case "crown":
      crown = [-8, -4, 0, 4, 8]
        .map(
          (dx) =>
            `<path d="M${32 + dx * 0.6} ${top + 4} L${32 + dx * 1.5} ${top - 10 + Math.abs(dx) * 0.6} L${32 + dx * 0.6 + 3} ${top + 4} Z" fill="${a.top(tc)}"/>`,
        )
        .join("");
      break;
  }
  return a.svg(
    `${shadow(w * 0.85)}<ellipse cx="32" cy="${cy}" rx="${w}" ry="${h}" fill="${a.ball(o.color)}" ${outline(o.color)}/>${pat}${shine(32 - w * 0.38, cy - h * 0.45, w * 0.28, h * 0.17)}${crown}`,
  );
}

export interface LongOpts {
  color: string;
  /** 꼬리 쪽 색 (그라데이션 끝) */
  endColor?: string;
  length?: number;
  thick?: number;
  /** 휘어짐 (-1~1) */
  bend?: number;
  tip?: "point" | "round";
  top?: "leaves" | "stem" | "none" | "cap" | "roots";
  topColor?: string;
  rings?: boolean;
  bumps?: boolean;
  rot?: number;
}

/** 길쭉한 채소 (당근, 오이, 가지, 고추, 바나나, 우엉 …) */
export function long(o: LongOpts): string {
  const a = new Art();
  const L = o.length ?? 44;
  const t = o.thick ?? 8;
  const bend = (o.bend ?? 0) * 10;
  const x0 = 32 - L / 2;
  const x1 = 32 + L / 2;
  const tipR = o.tip === "point" ? 0.5 : t * 0.75;
  const fillId = (() => {
    if (!o.endColor) return a.top(o.color, 0.35, 0.3);
    return a.top(o.color, 0.35, 0.3);
  })();
  const body = `<path d="M${x0} ${32 - t} Q 32 ${32 - t - bend} ${x1} ${32 - tipR} Q ${x1 + tipR} 32 ${x1} ${32 + tipR} Q 32 ${32 + t - bend} ${x0} ${32 + t} Q ${x0 - t * 0.7} 32 ${x0} ${32 - t} Z" fill="${fillId}" ${outline(o.color)}/>`;
  const end = o.endColor
    ? `<path d="M${x1 - L * 0.3} ${32 - t * 0.8 - bend * 0.5} Q ${x1} ${32 - tipR} ${x1} ${32} Q ${x1} ${32 + tipR} ${x1 - L * 0.3} ${32 + t * 0.8 - bend * 0.5} Z" fill="${o.endColor}" opacity="0.55"/>`
    : "";
  const rings = o.rings
    ? [0.25, 0.42, 0.6, 0.76]
        .map(
          (p) =>
            `<path d="M${x0 + L * p} ${32 - t * 0.8} q1.5 ${t * 0.8} 0 ${t * 1.6}" stroke="${tone(o.color, -0.3)}" stroke-width="0.9" fill="none" opacity="0.6"/>`,
        )
        .join("")
    : "";
  const bumps = o.bumps
    ? [0.2, 0.35, 0.5, 0.65, 0.8]
        .map(
          (p, i) =>
            `<circle cx="${x0 + L * p}" cy="${32 + (i % 2 ? 2 : -3)}" r="0.9" fill="${tone(o.color, -0.35)}"/>`,
        )
        .join("")
    : "";
  const tc = o.topColor ?? "#3f8f3a";
  let top = "";
  if (o.top === "leaves")
    top = `<path d="M${x0} 32 q-6 -6 -8 -14 M${x0} 32 q-8 -2 -12 -8 M${x0} 32 q-7 2 -11 0" stroke="${tc}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  if (o.top === "stem")
    top = `<path d="M${x0 + 1} 32 l-5 -2 l-1 -5" stroke="${tc}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M${x0 + 3} ${32 - t * 0.9} q-4 ${t * 0.9} 0 ${t * 1.8} z" fill="${tc}"/>`;
  if (o.top === "cap")
    top = `<path d="M${x0 + 4} ${32 - t - 1} q-6 ${t + 1} 0 ${2 * t + 2} q-5 -2 -6 -${t + 1} q1 -${t - 1} 6 -${t + 1} z" fill="${a.top(tc)}"/>`;
  if (o.top === "roots")
    top = `<path d="M${x1} 32 q4 1 7 4 M${x1} 33 q3 3 4 7" stroke="${tone(o.color, -0.2)}" stroke-width="1" fill="none"/>`;
  const shineLine = `<path d="M${x0 + L * 0.15} ${32 - t * 0.55 - bend * 0.4} Q 32 ${32 - t * 0.7 - bend * 0.8} ${x1 - L * 0.2} ${32 - t * 0.45 - bend * 0.3}" stroke="#fff" stroke-width="${Math.max(1.4, t * 0.28)}" stroke-linecap="round" fill="none" opacity="0.5"/>`;
  return a.svg(
    `${shadow(L * 0.45, 32, 32 + t + 9)}<g transform="rotate(${o.rot ?? -18} 32 32)">${body}${end}${rings}${bumps}${shineLine}${top}</g>`,
  );
}

/** 잎이 겹친 결구 채소 (양배추, 배추, 양상추, 청경채) */
export function leafHead(o: {
  color: string;
  inner?: string;
  kind?: "round" | "napa" | "bokchoy" | "frilly";
}): string {
  const a = new Art();
  const c = o.color;
  const inner = o.inner ?? tone(c, 0.45);
  if (o.kind === "napa" || o.kind === "bokchoy") {
    const stalk = o.kind === "bokchoy" ? tone(c, 0.55) : "#f4f1dc";
    return a.svg(
      `${shadow(14, 32, 59)}<path d="M24 58 Q18 34 22 14 Q32 2 42 14 Q46 34 40 58 Z" fill="${a.cyl(stalk)}" ${outline(stalk)}/>` +
        `<path d="M22 30 Q16 12 30 6 Q24 20 30 34 Z" fill="${a.top(c)}" ${outline(c)}/><path d="M42 30 Q48 12 34 6 Q40 20 34 34 Z" fill="${a.top(tone(c, -0.08))}" ${outline(c)}/><path d="M27 32 Q32 4 37 32 Z" fill="${a.top(tone(c, 0.12))}" ${outline(c)}/>` +
        `<path d="M32 30 V56" stroke="${tone(stalk, -0.15)}" stroke-width="1"/>${shine(26, 40, 2, 9, 0, 0.45)}`,
    );
  }
  if (o.kind === "frilly") {
    // 가장자리가 물결치는 잎: 둘레의 점을 잇되 바깥으로 부푼 곡선으로 잇는다
    const frill = (cx: number, cy: number, r: number, col: string) => {
      const n = 9;
      const pt = (ang: number, rr: number) =>
        `${(cx + Math.cos(ang) * rr).toFixed(1)} ${(cy + Math.sin(ang) * rr).toFixed(1)}`;
      const d = Array.from({ length: n }, (_, i) => {
        const a0 = (i / n) * Math.PI * 2;
        const a1 = ((i + 1) / n) * Math.PI * 2;
        return `${i ? "" : `M${pt(a0, r)} `}Q${pt((a0 + a1) / 2, r + 4.5)} ${pt(a1, r)}`;
      }).join(" ");
      const veins = `<path d="M${cx} ${cy + r * 0.8} Q${cx - 2} ${cy} ${cx + 1} ${cy - r * 0.7}" stroke="${tone(col, 0.35)}" stroke-width="1" fill="none" opacity="0.7"/>`;
      return `<path d="${d} Z" fill="${a.ball(col, 0.35, 0.25)}" ${outline(col)}/>${veins}`;
    };
    return a.svg(
      `${shadow(18)}${frill(24, 38, 13, tone(c, -0.08))}${frill(40, 38, 13, c)}${frill(32, 28, 13, tone(c, 0.1))}${shine(27, 24, 5, 3)}`,
    );
  }
  return a.svg(
    `${shadow(19)}<circle cx="32" cy="35" r="21" fill="${a.ball(c, 0.35, 0.28)}" ${outline(c)}/>` +
      `<path d="M14 36 Q20 18 34 16 Q24 26 26 52" stroke="${tone(c, -0.25)}" stroke-width="1.2" fill="none"/><path d="M50 34 Q46 18 30 16 Q42 28 38 54" stroke="${tone(c, -0.25)}" stroke-width="1.2" fill="none"/>` +
      `<ellipse cx="32" cy="30" rx="9" ry="8" fill="${a.ball(inner, 0.3, 0.15)}"/><path d="M32 22 V44 M26 30 Q32 34 38 30" stroke="${tone(c, -0.2)}" stroke-width="0.8" fill="none" opacity="0.6"/>${shine(24, 25, 6, 3.5)}`,
  );
}

/** 잎채소 한 단 (시금치, 깻잎, 상추, 나물, 허브) */
export function bunch(o: {
  color: string;
  stem?: string;
  leafShape?: "round" | "thin" | "jagged" | "heart" | "tiny";
  tie?: string;
  count?: number;
}): string {
  const a = new Art();
  const c = o.color;
  const stem = o.stem ?? tone(c, 0.35);
  const n = o.count ?? 5;
  const leaves = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const ang = -50 + t * 100;
    const col = tone(c, i % 2 ? -0.08 : 0.06);
    const shape =
      o.leafShape === "thin"
        ? "M0 0 C -3 -12, -2 -26, 0 -34 C 2 -26, 3 -12, 0 0 Z"
        : o.leafShape === "jagged"
          ? "M0 0 C -9 -6, -6 -12, -10 -16 C -5 -16, -8 -22, -4 -26 C -2 -24, 0 -30, 0 -32 C 0 -30, 2 -24, 4 -26 C 8 -22, 5 -16, 10 -16 C 6 -12, 9 -6, 0 0 Z"
          : o.leafShape === "heart"
            ? "M0 0 C -12 -6, -14 -20, -6 -26 C -2 -28, 0 -24, 0 -22 C 0 -24, 2 -28, 6 -26 C 14 -20, 12 -6, 0 0 Z"
            : o.leafShape === "tiny"
              ? "M0 0 C -6 -6, -6 -14, -2 -18 M0 0 C 6 -8, 8 -14, 3 -20 M0 0 C 0 -10, -1 -20, 0 -28"
              : "M0 0 C -10 -8, -10 -22, 0 -30 C 10 -22, 10 -8, 0 0 Z";
    const isLine = o.leafShape === "tiny";
    return `<g transform="translate(32 40) rotate(${ang})"><path d="${shape}" ${isLine ? `stroke="${col}" stroke-width="3.5" stroke-linecap="round" fill="none"` : `fill="${a.top(col, 0.3, 0.3)}" ${outline(col)}`}/>${isLine ? "" : `<path d="M0 -2 V-24" stroke="${tone(col, 0.35)}" stroke-width="0.8" opacity="0.7"/>`}</g>`;
  }).join("");
  const stems = `<path d="M29 40 L28 58 M32 40 V58 M35 40 L36 58" stroke="${stem}" stroke-width="2.6" stroke-linecap="round"/>`;
  const tie = o.tie ? `<rect x="26" y="47" width="12" height="4" rx="1.5" fill="${o.tie}"/>` : "";
  return a.svg(`${shadow(12, 32, 59)}${stems}${leaves}${tie}`);
}

/** 가는 줄기 묶음 (대파, 쪽파, 부추, 아스파라거스, 콩나물, 팽이) */
export function stalks(o: {
  color: string;
  base?: string;
  head?: "sprout" | "tip" | "enoki" | "none";
  headColor?: string;
  count?: number;
  thick?: number;
  tie?: string;
}): string {
  const a = new Art();
  const n = o.count ?? 5;
  const w = o.thick ?? 3.2;
  const base = o.base ?? tone(o.color, 0.6);
  const lines = Array.from({ length: n }, (_, i) => {
    const x = 32 + (i - (n - 1) / 2) * (w + 0.8);
    const lean = (i - (n - 1) / 2) * 2.2;
    const topY = 8 + (i % 2) * 4;
    const head =
      o.head === "sprout"
        ? `<ellipse cx="${x + lean}" cy="${topY}" rx="2.6" ry="3.4" fill="${a.ball(o.headColor ?? "#f5d76e")}"/>`
        : o.head === "enoki"
          ? `<circle cx="${x + lean}" cy="${topY}" r="2.2" fill="${a.ball(o.headColor ?? "#f6f1e1")}"/>`
          : o.head === "tip"
            ? `<path d="M${x + lean - w / 2} ${topY + 4} L${x + lean} ${topY - 3} L${x + lean + w / 2} ${topY + 4} Z" fill="${o.headColor ?? tone(o.color, -0.2)}"/>`
            : "";
    return `<path d="M${x} 56 Q ${x + lean * 0.3} 30 ${x + lean} ${topY}" stroke="${o.color}" stroke-width="${w}" stroke-linecap="round" fill="none"/><path d="M${x} 56 L${x + lean * 0.15} 42" stroke="${base}" stroke-width="${w}" stroke-linecap="round"/>${head}`;
  }).join("");
  const tie = o.tie
    ? `<rect x="${32 - n * 2.4}" y="44" width="${n * 4.8}" height="4" rx="1.5" fill="${o.tie}"/>`
    : "";
  return a.svg(`${shadow(12, 32, 59)}${lines}${tie}`);
}

/** 버섯 */
export function mushroom(o: {
  cap: string;
  stem?: string;
  kind?: "dome" | "flat" | "king" | "cluster" | "oyster";
  pattern?: "cross" | "none";
}): string {
  const a = new Art();
  const stem = o.stem ?? "#efe6d2";
  if (o.kind === "king")
    return a.svg(
      `${shadow(10)}<rect x="24" y="22" width="16" height="35" rx="7" fill="${a.cyl(stem)}" ${outline(stem)}/><ellipse cx="32" cy="20" rx="13" ry="8" fill="${a.ball(o.cap)}" ${outline(o.cap)}/>${shine(27, 17, 4, 2)}`,
    );
  if (o.kind === "cluster" || o.kind === "oyster") {
    const cap = (x: number, y: number, s: number) =>
      o.kind === "oyster"
        ? `<path d="M${x - 12 * s} ${y} Q${x} ${y - 14 * s} ${x + 12 * s} ${y} Q${x} ${y + 4 * s} ${x - 12 * s} ${y} Z" fill="${a.ball(o.cap)}" ${outline(o.cap)}/>`
        : `<path d="M${x} ${y} V${y + 16 * s}" stroke="${stem}" stroke-width="${4 * s}" stroke-linecap="round"/><ellipse cx="${x}" cy="${y}" rx="${6 * s}" ry="${4.5 * s}" fill="${a.ball(o.cap)}" ${outline(o.cap)}/>`;
    return a.svg(
      `${shadow(16)}${o.kind === "oyster" ? `<path d="M32 56 Q28 44 26 34 M32 56 Q36 44 40 32" stroke="${stem}" stroke-width="4" stroke-linecap="round"/>` : ""}${cap(22, 34, 1)}${cap(42, 32, 1)}${cap(32, 24, 1.15)}${cap(27, 44, 0.85)}${cap(38, 44, 0.85)}`,
    );
  }
  const flat = o.kind === "flat";
  const cross =
    o.pattern === "cross"
      ? `<path d="M24 ${flat ? 26 : 22} L40 ${flat ? 22 : 18} M26 ${flat ? 18 : 14} L36 ${flat ? 28 : 26}" stroke="${tone(o.cap, 0.45)}" stroke-width="1.6" stroke-linecap="round"/>`
      : "";
  return a.svg(
    `${shadow(14)}<path d="M26 34 Q25 48 24 56 H40 Q39 48 38 34 Z" fill="${a.cyl(stem)}" ${outline(stem)}/>` +
      (flat
        ? `<path d="M10 30 Q12 14 32 12 Q52 14 54 30 Q32 38 10 30 Z" fill="${a.ball(o.cap)}" ${outline(o.cap)}/>`
        : `<path d="M12 34 Q12 8 32 8 Q52 8 52 34 Q32 40 12 34 Z" fill="${a.ball(o.cap)}" ${outline(o.cap)}/>`) +
      `${cross}${shine(23, flat ? 18 : 16, 6, 3)}`,
  );
}

/** 울퉁불퉁한 뿌리 (감자, 생강, 고구마, 토란, 마늘) */
export function root(o: {
  color: string;
  kind: "potato" | "ginger" | "garlic" | "taro" | "sweet";
  eyes?: string;
}): string {
  const a = new Art();
  const c = o.color;
  if (o.kind === "garlic")
    return a.svg(
      `${shadow(16)}<path d="M32 10 Q36 16 44 22 Q54 32 48 46 Q42 56 32 56 Q22 56 16 46 Q10 32 20 22 Q28 16 32 10 Z" fill="${a.ball(c, 0.3, 0.2)}" ${outline(c)}/>` +
        `<path d="M32 14 Q26 34 30 55 M32 14 Q38 34 34 55 M24 24 Q18 40 24 52 M40 24 Q46 40 40 52" stroke="${tone(c, -0.2)}" stroke-width="1" fill="none"/>` +
        `<path d="M30 10 L32 4 L34 10" stroke="${tone(c, -0.25)}" stroke-width="1.5" fill="none"/><path d="M26 56 l-2 3 M32 57 v3 M38 56 l2 3" stroke="#b9a07a" stroke-width="1"/>${shine(24, 30, 4, 8, 15)}`,
    );
  if (o.kind === "ginger")
    return a.svg(
      `${shadow(20)}<path d="M8 42 Q8 32 18 32 Q20 22 28 24 Q34 16 42 22 Q52 20 54 30 Q58 40 48 44 Q40 52 30 48 Q18 54 8 42 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/>` +
        `<path d="M18 34 q2 4 0 8 M30 26 q2 6 0 10 M44 24 q-2 6 1 10" stroke="${tone(c, -0.25)}" stroke-width="1" fill="none"/>${shine(26, 30, 7, 2.5, -10)}`,
    );
  if (o.kind === "sweet")
    return a.svg(
      `${shadow(22)}<path d="M6 36 Q14 22 34 22 Q54 22 58 34 Q54 46 34 46 Q14 46 6 36 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><path d="M58 34 l5 1 M6 36 l-4 1" stroke="${tone(c, -0.3)}" stroke-width="1.5"/>` +
        `<path d="M22 26 q1 4 0 8 M38 25 q1 5 0 9 M30 38 q1 3 0 5" stroke="${tone(c, -0.25)}" stroke-width="0.9" fill="none"/>${shine(22, 28, 9, 2.5, -5)}`,
    );
  if (o.kind === "taro")
    return a.svg(
      `${shadow(14)}<ellipse cx="32" cy="36" rx="15" ry="19" fill="${a.ball(c, 0.25, 0.35)}" ${outline(c)}/>${[22, 28, 34, 40, 46].map((y) => `<path d="M${19 + Math.abs(y - 36) * 0.2} ${y} Q32 ${y + 3} ${45 - Math.abs(y - 36) * 0.2} ${y}" stroke="${tone(c, -0.35)}" stroke-width="1" fill="none"/>`).join("")}${shine(26, 26, 3.5, 6, 15)}`,
    );
  const eyes = o.eyes ?? tone(c, -0.3);
  return a.svg(
    `${shadow(19)}<path d="M10 38 Q8 24 22 20 Q34 14 46 20 Q58 26 54 40 Q50 52 34 52 Q14 54 10 38 Z" fill="${a.ball(c, 0.32, 0.3)}" ${outline(c)}/>` +
      [
        [20, 30],
        [34, 24],
        [44, 34],
        [28, 42],
        [40, 46],
      ]
        .map(
          ([x, y]) =>
            `<path d="M${x} ${y} q1.5 -1 3 0" stroke="${eyes}" stroke-width="1.2" fill="none"/>`,
        )
        .join("") +
      shine(22, 27, 6, 3),
  );
}

/** 브로콜리·콜리플라워 */
export function floret(o: { color: string; stem?: string }): string {
  const a = new Art();
  const stem = o.stem ?? tone(o.color, 0.35);
  const bumps = [
    [22, 26, 9],
    [32, 20, 10],
    [42, 26, 9],
    [26, 34, 8],
    [38, 34, 8],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.ball(o.color, 0.3, 0.3)}" ${outline(o.color)}/>`,
    )
    .join("");
  return a.svg(
    `${shadow(12)}<path d="M28 36 L26 56 H38 L36 36 Z" fill="${a.cyl(stem)}" ${outline(stem)}/>${bumps}${shine(28, 16, 5, 2.5)}`,
  );
}

/** 열매 송이·작은 알갱이 (포도, 블루베리, 체리, 방울토마토, 딸기) */
export function berries(o: {
  color: string;
  kind: "grape" | "blueberry" | "cherry" | "cherryTomato" | "strawberry" | "jujube";
}): string {
  const a = new Art();
  const c = o.color;
  if (o.kind === "strawberry")
    return a.svg(
      `${shadow(15)}<path d="M14 26 Q14 16 32 16 Q50 16 50 26 Q50 42 32 56 Q14 42 14 26 Z" fill="${a.ball(c, 0.35, 0.3)}" ${outline(c)}/>` +
        [
          [22, 26],
          [30, 24],
          [38, 26],
          [44, 30],
          [26, 34],
          [34, 34],
          [40, 38],
          [30, 42],
          [36, 46],
          [20, 32],
        ]
          .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="0.9" ry="1.4" fill="#f9e27d"/>`)
          .join("") +
        [0, 60, 120, 180, 240, 300]
          .map(
            (r) =>
              `<path d="M32 17 l-3 -2 l3 -7 l3 7 z" fill="#3f8f3a" transform="rotate(${r * 0.5 - 75} 32 17)"/>`,
          )
          .join("") +
        shine(22, 22, 5, 2.5),
    );
  if (o.kind === "cherry")
    return a.svg(
      `${shadow(18)}<path d="M22 40 Q26 18 38 8 M42 40 Q40 22 38 8" stroke="#5d7b2e" stroke-width="2" fill="none" stroke-linecap="round"/>${leaf(a, 38, 9, 10, "#4caf50", 12)}` +
        [
          [22, 42],
          [42, 42],
        ]
          .map(
            ([x, y]) =>
              `<circle cx="${x}" cy="${y}" r="10" fill="${a.ball(c)}" ${outline(c)}/>${shine(x - 4, y - 4, 3, 1.8)}`,
          )
          .join(""),
    );
  if (o.kind === "jujube")
    return a.svg(
      `${shadow(18)}` +
        [
          [22, 38],
          [40, 36],
          [31, 28],
        ]
          .map(
            ([x, y]) =>
              `<ellipse cx="${x}" cy="${y}" rx="9" ry="11" fill="${a.ball(c, 0.3, 0.35)}" ${outline(c)}/><path d="M${x - 4} ${y - 4} q3 4 0 8 M${x + 3} ${y - 6} q-2 5 1 10" stroke="${tone(c, -0.35)}" stroke-width="0.9" fill="none"/>`,
          )
          .join(""),
    );
  const pts: [number, number, number][] =
    o.kind === "grape"
      ? [
          [24, 22, 6.5],
          [34, 21, 6.5],
          [44, 23, 6],
          [28, 32, 6.5],
          [39, 32, 6.5],
          [33, 42, 6.5],
          [24, 41, 5.5],
          [41, 42, 5.5],
          [32, 51, 5.5],
        ]
      : o.kind === "blueberry"
        ? [
            [22, 40, 8],
            [38, 42, 8],
            [30, 30, 8],
            [44, 32, 7],
            [18, 30, 6.5],
          ]
        : [
            [22, 40, 9],
            [40, 40, 9],
            [31, 28, 9],
          ];
  const top =
    o.kind === "grape"
      ? `<path d="M34 16 Q34 8 40 6" stroke="#6b4423" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : "";
  return a.svg(
    `${shadow(18)}${top}` +
      pts
        .map(
          ([x, y, r]) =>
            `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.ball(c)}" ${outline(c)}/>${shine(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18)}` +
            (o.kind === "blueberry"
              ? `<circle cx="${x}" cy="${y - r * 0.7}" r="1.4" fill="${tone(c, -0.4)}"/>`
              : "") +
            (o.kind === "cherryTomato"
              ? `<path d="M${x} ${y - r} l-2 -2 m2 2 l2 -2 m-2 2 v-3" stroke="#3f8f3a" stroke-width="1.5"/>`
              : ""),
        )
        .join(""),
  );
}

/** 과일 조각 (수박, 멜론) */
export function wedge(o: { flesh: string; rind: string; seeds?: string }): string {
  const a = new Art();
  return a.svg(
    `${shadow(22)}<path d="M8 22 Q32 66 56 22 Z" fill="${a.top(o.rind, 0.1, 0.3)}" ${outline(o.rind)}/><path d="M12 22 Q32 58 52 22 Z" fill="#f4f6e8"/><path d="M14 22 Q32 54 50 22 Z" fill="${a.top(o.flesh, 0.25, 0.15)}"/>` +
      (o.seeds
        ? [
            [24, 28],
            [32, 32],
            [40, 28],
            [28, 38],
            [36, 38],
          ]
            .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1" ry="1.6" fill="${o.seeds}"/>`)
            .join("")
        : "") +
      shine(22, 25, 6, 1.6, 10, 0.35),
  );
}

/** 바나나 송이 */
export function banana(color: string): string {
  const a = new Art();
  const one = (dy: number, rot: number) =>
    `<g transform="rotate(${rot} 32 32) translate(0 ${dy})"><path d="M10 26 Q30 50 54 26 Q52 22 50 24 Q30 42 14 22 Z" fill="${a.top(color, 0.35, 0.25)}" ${outline(color)}/><path d="M50 24 l4 -4" stroke="#6b4423" stroke-width="3" stroke-linecap="round"/><path d="M10 26 l-2 1" stroke="#4a3520" stroke-width="2.5" stroke-linecap="round"/></g>`;
  return a.svg(`${shadow(20)}${one(8, 0)}${one(2, -8)}${one(-4, -16)}`);
}

/** 레몬·레몬처럼 끝이 뾰족한 타원 / 아보카도 반쪽 */
export function lemon(color: string): string {
  const a = new Art();
  return a.svg(
    `${shadow(18)}<path d="M6 34 Q8 30 12 28 Q20 16 34 16 Q50 16 54 28 Q58 30 59 34 Q58 38 54 40 Q50 52 34 52 Q20 52 12 40 Q8 38 6 34 Z" fill="${a.ball(color)}" ${outline(color)}/>${shine(24, 24, 8, 3, -10)}`,
  );
}

export function avocado(): string {
  const a = new Art();
  return a.svg(
    `${shadow(14)}<path d="M32 6 Q42 6 44 22 Q52 34 48 46 Q42 58 32 58 Q22 58 16 46 Q12 34 20 22 Q22 6 32 6 Z" fill="${a.top("#4a6b2a", 0.1, 0.2)}" ${outline("#3b5a1e")}/><path d="M32 10 Q39 10 41 23 Q48 34 45 45 Q40 54 32 54 Q24 54 19 45 Q16 34 23 23 Q25 10 32 10 Z" fill="${a.ball("#d9e88a", 0.3, 0.15)}"/><circle cx="32" cy="40" r="8.5" fill="${a.ball("#8a5a2b")}"/>${shine(29, 37, 2.5, 1.5)}`,
  );
}

/** 옥수수 */
export function corn(): string {
  const a = new Art();
  const kernels = Array.from({ length: 6 }, (_, r) =>
    Array.from(
      { length: 3 },
      (_, c) =>
        `<ellipse cx="${28 + c * 4}" cy="${16 + r * 6}" rx="1.8" ry="2.4" fill="${a.ball("#f6c945", 0.4, 0.2)}"/>`,
    ).join(""),
  ).join("");
  return a.svg(
    `${shadow(12)}<g transform="rotate(20 32 32)"><path d="M32 8 Q44 10 42 34 Q40 52 32 56 Q24 52 22 34 Q20 10 32 8 Z" fill="${a.ball("#f2c13b")}" ${outline("#d9a514")}/>${kernels}<path d="M22 30 Q14 46 28 58 Q26 44 30 34 Z" fill="${a.top("#7cb342")}" ${outline("#558b2f")}/><path d="M42 30 Q50 46 36 58 Q38 44 34 34 Z" fill="${a.top("#8bc34a")}" ${outline("#558b2f")}/></g>`,
  );
}

/** 단호박·애호박 같은 골 있는 호박 */
export function pumpkin(color: string, flesh?: string): string {
  const a = new Art();
  return a.svg(
    `${shadow(20)}<ellipse cx="20" cy="38" rx="12" ry="16" fill="${a.ball(tone(color, -0.08))}" ${outline(color)}/><ellipse cx="44" cy="38" rx="12" ry="16" fill="${a.ball(tone(color, -0.08))}" ${outline(color)}/><ellipse cx="32" cy="38" rx="12" ry="17" fill="${a.ball(color)}" ${outline(color)}/>` +
      (flesh ? `<circle cx="20" cy="38" r="1.5" fill="${flesh}"/>` : "") +
      `<path d="M32 21 q1 -6 5 -8" stroke="#5d4527" stroke-width="3" fill="none" stroke-linecap="round"/>${shine(27, 28, 3, 6, 10)}`,
  );
}

// ── 고기·해산물 ───────────────────────────────

/** 고기 덩어리 (삼겹살 층, 마블링, 가장자리 지방) */
export function meat(o: {
  color: string;
  fat?: "layers" | "marble" | "edge" | "none";
  bone?: boolean;
  shape?: "slab" | "round" | "strips" | "mince";
  /** 튀김옷 (돈가스·떡갈비 겉면) */
  crumbs?: boolean;
}): string {
  const a = new Art();
  const c = o.color;
  if (o.shape === "mince")
    return a.svg(
      `${shadow(20)}<path d="M10 44 Q8 30 22 26 Q30 18 42 24 Q56 28 54 42 Q50 52 32 52 Q14 52 10 44 Z" fill="${a.ball(c, 0.25, 0.3)}" ${outline(c)}/>` +
        Array.from(
          { length: 22 },
          (_, i) =>
            `<circle cx="${14 + ((i * 37) % 38)}" cy="${28 + ((i * 13) % 20)}" r="1.4" fill="${tone(c, i % 2 ? 0.35 : -0.25)}"/>`,
        ).join("") +
        shine(24, 30, 6, 2),
    );
  if (o.shape === "strips")
    return a.svg(
      `${shadow(20)}` +
        [0, 1, 2]
          .map(
            (i) =>
              `<path d="M${8 + i * 4} ${22 + i * 10} Q32 ${14 + i * 10} ${56 - i * 2} ${24 + i * 10} L${56 - i * 2} ${32 + i * 10} Q32 ${24 + i * 10} ${8 + i * 4} ${30 + i * 10} Z" fill="${a.top(c)}" ${outline(c)}/><path d="M${10 + i * 4} ${26 + i * 10} Q32 ${18 + i * 10} ${54 - i * 2} ${28 + i * 10}" stroke="${o.fat === "none" ? tone(c, 0.2) : "#fbefe6"}" stroke-width="2" fill="none" opacity="0.9"/>`,
          )
          .join(""),
    );
  const body =
    o.shape === "round"
      ? `<path d="M10 36 Q8 20 30 18 Q54 16 56 34 Q56 50 32 52 Q10 52 10 36 Z"`
      : `<path d="M8 28 Q10 18 22 18 L50 16 Q58 18 56 30 L54 44 Q52 52 42 52 L16 52 Q6 50 8 40 Z"`;
  let fat = "";
  if (o.fat === "layers")
    fat = `<path d="M9 30 Q30 26 56 28 L56 32 Q30 30 9 34 Z" fill="#fbefe6"/><path d="M9 42 Q30 38 55 40 L55 44 Q30 42 9 46 Z" fill="#fbefe6"/><path d="M10 19 Q30 15 52 16 L54 20 Q30 19 10 23 Z" fill="#fff6ee"/>`;
  if (o.fat === "marble")
    fat = `<path d="M16 26 q6 4 12 0 t12 2 M14 36 q8 -3 14 2 t16 -2 M20 46 q6 -4 12 0 t10 0 M36 22 q2 6 -2 10" stroke="#fbefe6" stroke-width="1.6" fill="none"/>`;
  if (o.fat === "edge")
    fat = `<path d="M10 22 Q30 14 52 18 Q58 22 56 30 L52 28 Q50 22 30 20 Q16 22 14 28 Z" fill="#fbefe6"/>`;
  const bone = o.bone
    ? `<rect x="40" y="28" width="22" height="7" rx="3.5" fill="${a.cyl("#f6efe2")}" ${outline("#e7dcc8")}/><circle cx="61" cy="28" r="3.5" fill="#f6efe2"/><circle cx="61" cy="35" r="3.5" fill="#f6efe2"/>`
    : "";
  const crumbs = o.crumbs
    ? Array.from({ length: 34 }, (_, i) => {
        const x = 14 + ((i * 29) % 40);
        const y = 22 + ((i * 17) % 28);
        return `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.1 : 1.6}" fill="${tone(c, i % 2 ? 0.35 : -0.2)}"/>`;
      }).join("")
    : "";
  return a.svg(
    `${shadow(22)}${body} fill="${a.top(c, 0.25, 0.3)}" ${outline(c)}/>${fat}${crumbs}${bone}${shine(20, 24, 7, 2.2, -8, 0.45)}`,
  );
}

/** 닭고기 (다리, 날개, 가슴살, 통닭) */
export function chicken(o: {
  kind: "leg" | "wing" | "breast" | "whole" | "gizzard";
  color?: string;
}): string {
  const a = new Art();
  const skin = o.color ?? "#f2c9a0";
  if (o.kind === "breast")
    return a.svg(
      `${shadow(20)}<path d="M8 36 Q10 18 34 18 Q56 20 56 34 Q52 50 30 50 Q10 50 8 36 Z" fill="${a.ball(skin, 0.3, 0.25)}" ${outline(skin)}/><path d="M16 30 Q30 26 48 30 M18 40 Q32 36 46 40" stroke="${tone(skin, -0.12)}" stroke-width="1" fill="none"/>${shine(22, 26, 8, 2.5)}`,
    );
  if (o.kind === "gizzard")
    return a.svg(
      `${shadow(18)}` +
        [
          [22, 34],
          [42, 36],
        ]
          .map(
            ([x, y]) =>
              `<ellipse cx="${x}" cy="${y}" rx="12" ry="10" fill="${a.ball("#a8463d")}" ${outline("#8c3a32")}/><ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="#d9b8a0" opacity="0.8"/>`,
          )
          .join(""),
    );
  if (o.kind === "whole")
    return a.svg(
      `${shadow(22)}<ellipse cx="32" cy="36" rx="20" ry="16" fill="${a.ball(skin)}" ${outline(skin)}/><path d="M14 44 Q4 50 6 56 Q12 58 18 50" fill="${a.ball(skin)}" ${outline(skin)}/><path d="M50 44 Q60 50 58 56 Q52 58 46 50" fill="${a.ball(skin)}" ${outline(skin)}/><circle cx="6" cy="57" r="2.5" fill="#f6efe2"/><circle cx="58" cy="57" r="2.5" fill="#f6efe2"/>${shine(24, 28, 8, 4)}`,
    );
  if (o.kind === "wing")
    return a.svg(
      `${shadow(20)}<path d="M8 40 Q10 26 24 26 Q30 30 34 30 Q46 20 56 24 Q58 34 46 40 Q36 46 26 46 Q12 50 8 40 Z" fill="${a.ball(skin)}" ${outline(skin)}/><path d="M30 30 Q32 38 28 46" stroke="${tone(skin, -0.2)}" stroke-width="1" fill="none"/>${shine(18, 32, 5, 2)}`,
    );
  return a.svg(
    `${shadow(18)}<g transform="rotate(-30 32 32)"><rect x="34" y="28" width="22" height="7" rx="3.5" fill="${a.cyl("#f6efe2")}"/><circle cx="56" cy="27" r="3.6" fill="#f6efe2"/><circle cx="56" cy="36" r="3.6" fill="#f6efe2"/><path d="M8 32 Q8 16 24 18 Q36 20 38 30 Q38 42 24 46 Q8 48 8 32 Z" fill="${a.ball(skin)}" ${outline(skin)}/>${shine(16, 24, 5, 3)}</g>`,
  );
}

/** 통생선 */
export function fish(o: {
  body: string;
  belly?: string;
  pattern?: "stripes" | "spots" | "none";
  long?: boolean;
  slim?: boolean;
}): string {
  const a = new Art();
  const belly = o.belly ?? "#eef2f4";
  const L = o.long ? 1.15 : 1;
  const h = o.slim ? 7 : 11;
  const pat =
    o.pattern === "stripes"
      ? [16, 22, 28, 34, 40]
          .map(
            (x) =>
              `<path d="M${x} ${32 - h + 2} q3 4 0 ${h - 3}" stroke="${tone(o.body, -0.45)}" stroke-width="1.6" fill="none"/>`,
          )
          .join("")
      : o.pattern === "spots"
        ? [
            [18, 28],
            [26, 26],
            [34, 27],
            [42, 28],
            [22, 31],
            [30, 30],
          ]
            .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="${tone(o.body, -0.4)}"/>`)
            .join("")
        : "";
  return a.svg(
    `${shadow(22, 32, 50)}<g transform="scale(${L} 1) translate(${o.long ? -4 : 0} 0)"><path d="M6 32 Q16 ${32 - h - 4} 34 ${32 - h} Q46 ${32 - h} 50 32 Q46 ${32 + h} 34 ${32 + h} Q16 ${32 + h + 4} 6 32 Z" fill="${a.top(o.body, 0.3, 0.1)}" ${outline(o.body)}/>` +
      `<path d="M8 33 Q20 ${32 + h + 2} 34 ${32 + h - 1} Q44 ${32 + h - 2} 49 33 Z" fill="${belly}" opacity="0.9"/>${pat}` +
      `<path d="M50 32 L60 ${32 - h * 0.8} L57 32 L60 ${32 + h * 0.8} Z" fill="${a.top(tone(o.body, -0.1))}" ${outline(o.body)}/><path d="M26 ${32 - h} l6 -5 l4 5 z" fill="${tone(o.body, -0.15)}"/>` +
      `<circle cx="13" cy="${31 - h * 0.2}" r="2.4" fill="#fff"/><circle cx="12.6" cy="${31 - h * 0.2}" r="1.3" fill="#222"/><path d="M18 ${32 - h * 0.6} q-2 ${h * 0.6} 0 ${h * 1.2}" stroke="${tone(o.body, -0.35)}" stroke-width="1" fill="none"/>${shine(30, 32 - h * 0.55, 9, 1.4, 0, 0.5)}</g>`,
  );
}

/** 생선 살 (연어, 대구살, 훈제연어) */
export function fillet(o: { color: string; lines?: string; skin?: string }): string {
  const a = new Art();
  const lines = o.lines ?? "#fff3e6";
  return a.svg(
    `${shadow(22)}<path d="M8 40 Q10 22 30 20 L54 22 Q58 30 54 40 Q48 50 30 50 Q12 50 8 40 Z" fill="${a.top(o.color, 0.25, 0.2)}" ${outline(o.color)}/>` +
      (o.skin
        ? `<path d="M10 46 Q30 54 52 42 L54 40 Q48 50 30 50 Q12 50 10 46 Z" fill="${o.skin}"/>`
        : "") +
      [18, 26, 34, 42, 50]
        .map(
          (x) =>
            `<path d="M${x} 22 Q${x - 6} 34 ${x - 2} 48" stroke="${lines}" stroke-width="1.6" fill="none" opacity="0.85"/>`,
        )
        .join("") +
      shine(22, 26, 8, 2),
  );
}

/** 조개류 */
export function shell(o: {
  color: string;
  kind: "clam" | "mussel" | "scallop" | "oyster" | "abalone" | "cockle";
}): string {
  const a = new Art();
  const c = o.color;
  if (o.kind === "mussel")
    return a.svg(
      `${shadow(18)}<path d="M10 46 Q8 36 20 26 Q34 12 52 12 Q56 18 50 30 Q40 46 22 52 Q12 54 10 46 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><path d="M16 46 Q28 34 50 16" stroke="${tone(c, 0.3)}" stroke-width="1" fill="none"/><path d="M20 50 Q34 42 48 26" stroke="${tone(c, 0.2)}" stroke-width="0.8" fill="none"/>${shine(26, 28, 9, 2, -40)}`,
    );
  if (o.kind === "abalone")
    return a.svg(
      `${shadow(20)}<ellipse cx="32" cy="36" rx="24" ry="17" fill="${a.ball(c, 0.25, 0.3)}" ${outline(c)}/><path d="M14 36 Q32 18 52 32" stroke="${tone(c, 0.3)}" stroke-width="1.2" fill="none"/>${[18, 24, 30, 36, 42].map((x, i) => `<circle cx="${x}" cy="${33 - i * 1.2}" r="1.3" fill="${tone(c, -0.4)}"/>`).join("")}<ellipse cx="34" cy="40" rx="10" ry="6" fill="${a.ball("#e8d8b0", 0.3, 0.2)}" opacity="0.9"/>${shine(22, 28, 6, 2)}`,
    );
  if (o.kind === "oyster")
    return a.svg(
      `${shadow(20)}<path d="M8 38 Q10 20 30 16 Q50 14 56 30 Q58 46 40 50 Q20 54 8 38 Z" fill="${a.ball("#9aa3a0", 0.3, 0.3)}" ${outline("#7d8784")}/><path d="M14 36 Q16 24 32 22 Q48 22 50 32 Q50 42 38 44 Q22 46 14 36 Z" fill="${a.ball(c, 0.4, 0.15)}"/><path d="M24 34 Q32 28 42 34" stroke="${tone(c, -0.2)}" stroke-width="1.2" fill="none"/>${shine(26, 28, 6, 2)}`,
    );
  const ribs = o.kind === "scallop" || o.kind === "cockle" ? 9 : 5;
  const fan = `<path d="M8 42 Q8 14 32 12 Q56 14 56 42 Q44 48 32 48 Q20 48 8 42 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/>`;
  const lines = Array.from({ length: ribs }, (_, i) => {
    const t = (i + 1) / (ribs + 1);
    const x = 8 + t * 48;
    return `<path d="M32 50 L${x} ${16 + Math.abs(t - 0.5) * 30}" stroke="${tone(c, o.kind === "clam" ? 0.25 : -0.25)}" stroke-width="${o.kind === "clam" ? 0.8 : 1.4}"/>`;
  }).join("");
  const hinge = `<path d="M26 48 L28 56 L36 56 L38 48 Z" fill="${a.top(tone(c, -0.1))}" ${outline(c)}/>`;
  const clamBands =
    o.kind === "clam"
      ? `<path d="M12 36 Q32 26 52 36 M16 28 Q32 20 48 28" stroke="${tone(c, -0.3)}" stroke-width="1.6" fill="none" opacity="0.6"/>`
      : "";
  return a.svg(`${shadow(20)}${hinge}${fan}${lines}${clamBands}${shine(22, 24, 7, 2.5)}`);
}

/** 새우 */
export function shrimp(color = "#f08a5d"): string {
  const a = new Art();
  const segs = [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const ang = -120 + i * 38;
      const r = 14;
      const x = 32 + Math.cos((ang * Math.PI) / 180) * r;
      const y = 32 + Math.sin((ang * Math.PI) / 180) * r;
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${8 - i * 0.6}" ry="${6.5 - i * 0.5}" transform="rotate(${ang + 90} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${a.ball(color, 0.35, 0.3)}" ${outline(color)}/>`;
    })
    .join("");
  return a.svg(
    `${shadow(18)}<path d="M20 22 Q8 10 4 14 M22 20 Q14 4 8 6" stroke="${tone(color, -0.3)}" stroke-width="1" fill="none"/>${segs}<path d="M44 46 l8 6 l-2 -10 z" fill="${a.top(tone(color, -0.1))}"/><circle cx="23" cy="19" r="1.4" fill="#222"/>`,
  );
}

/** 오징어·낙지·문어 */
export function cephalopod(o: { color: string; kind: "squid" | "octopus" }): string {
  const a = new Art();
  const c = o.color;
  const tent = Array.from({ length: 6 }, (_, i) => {
    const x = 20 + i * 4.8;
    const wig = i % 2 ? 4 : -4;
    return `<path d="M${x} 38 Q${x + wig} 48 ${x - wig} 58" stroke="${c}" stroke-width="${o.kind === "octopus" ? 4 : 3}" stroke-linecap="round" fill="none"/>`;
  }).join("");
  const head =
    o.kind === "squid"
      ? `<path d="M32 4 L46 22 Q46 36 32 40 Q18 36 18 22 Z" fill="${a.ball(c, 0.3, 0.25)}" ${outline(c)}/><path d="M32 4 L42 10 L46 22 Z M32 4 L22 10 L18 22 Z" fill="${tone(c, -0.08)}"/>`
      : `<ellipse cx="32" cy="24" rx="15" ry="16" fill="${a.ball(c, 0.3, 0.25)}" ${outline(c)}/>`;
  return a.svg(
    `${shadow(16)}${tent}${head}<circle cx="27" cy="32" r="2" fill="#fff"/><circle cx="37" cy="32" r="2" fill="#fff"/><circle cx="27" cy="32" r="1" fill="#222"/><circle cx="37" cy="32" r="1" fill="#222"/>${shine(26, 18, 4, 6, 15, 0.4)}`,
  );
}

export function crab(color = "#e5533d"): string {
  const a = new Art();
  const legs = [-1, 1]
    .map((s) =>
      [0, 1, 2]
        .map(
          (i) =>
            `<path d="M${32 + s * 14} ${38 + i * 4} q${s * 8} 2 ${s * 14} ${8 + i * 2}" stroke="${tone(color, -0.1)}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
        )
        .join(""),
    )
    .join("");
  const claw = (s: number) =>
    `<path d="M${32 + s * 14} 30 Q${32 + s * 22} 20 ${32 + s * 22} 12" stroke="${tone(color, -0.05)}" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M${32 + s * 18} 14 q${s * 4} -10 ${s * 10} -2 q${-s * 4} 2 ${-s * 6} 6 z" fill="${a.ball(color)}" ${outline(color)}/>`;
  return a.svg(
    `${shadow(22)}${legs}${claw(-1)}${claw(1)}<ellipse cx="32" cy="38" rx="18" ry="12" fill="${a.ball(color, 0.35, 0.3)}" ${outline(color)}/><circle cx="27" cy="28" r="2" fill="#222"/><circle cx="37" cy="28" r="2" fill="#222"/>${shine(26, 34, 6, 2.5)}`,
  );
}

/** 마른 멸치·건새우처럼 작은 것 여러 마리 */
export function smallFry(o: { color: string; kind: "anchovy" | "shrimp" }): string {
  const a = new Art();
  const pos = [
    [18, 24, 20],
    [34, 20, -15],
    [44, 32, 35],
    [22, 38, -10],
    [36, 44, 15],
    [14, 46, 40],
  ];
  return a.svg(
    `${shadow(20)}` +
      pos
        .map(([x, y, r]) =>
          o.kind === "anchovy"
            ? `<path d="M${x - 9} ${y} Q${x} ${y - 3} ${x + 8} ${y} L${x + 11} ${y - 2} L${x + 10} ${y + 2} Q${x} ${y + 3} ${x - 9} ${y} Z" transform="rotate(${r} ${x} ${y})" fill="${a.top(o.color, 0.3, 0.2)}" ${outline(o.color)}/>`
            : `<path d="M${x - 6} ${y - 4} Q${x + 6} ${y - 6} ${x + 6} ${y + 2} Q${x + 2} ${y + 6} ${x - 2} ${y + 2}" transform="rotate(${r} ${x} ${y})" stroke="${o.color}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
        )
        .join(""),
  );
}

/** 해조류 (김, 미역, 다시마, 톳, 파래, 매생이) */
export function seaweed(o: {
  color: string;
  kind: "sheet" | "strands" | "kelp" | "fuzzy";
}): string {
  const a = new Art();
  const c = o.color;
  if (o.kind === "sheet")
    return a.svg(
      `${shadow(20)}<rect x="12" y="20" width="40" height="32" rx="2" fill="${a.top(tone(c, -0.1), 0.15, 0.2)}" transform="rotate(-8 32 36)"/><rect x="10" y="14" width="40" height="32" rx="2" fill="${a.top(c, 0.25, 0.2)}" ${outline(c)} transform="rotate(6 30 30)"/>${shine(22, 22, 9, 1.3, 6, 0.3)}`,
    );
  if (o.kind === "kelp")
    return a.svg(
      `${shadow(20)}<path d="M8 22 Q32 14 56 22 L54 46 Q32 54 10 46 Z" fill="${a.top(c, 0.25, 0.3)}" ${outline(c)}/><path d="M14 30 Q32 24 50 30 M14 40 Q32 34 50 40" stroke="${tone(c, 0.3)}" stroke-width="1" fill="none" opacity="0.6"/>${shine(22, 24, 9, 1.6, -8, 0.4)}`,
    );
  if (o.kind === "fuzzy")
    return a.svg(
      `${shadow(18)}<path d="M10 42 Q14 22 32 22 Q50 22 54 42 Q46 52 32 52 Q18 52 10 42 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/>` +
        Array.from(
          { length: 16 },
          (_, i) =>
            `<path d="M${14 + ((i * 23) % 36)} ${28 + ((i * 7) % 20)} q3 -2 5 1" stroke="${tone(c, 0.35)}" stroke-width="0.9" fill="none"/>`,
        ).join(""),
    );
  return a.svg(
    `${shadow(18)}` +
      [0, 1, 2, 3, 4]
        .map(
          (i) =>
            `<path d="M${16 + i * 8} 56 Q${10 + i * 8} 40 ${18 + i * 8} 28 Q${24 + i * 8} 16 ${16 + i * 8} 8" stroke="${tone(c, i % 2 ? 0.1 : -0.05)}" stroke-width="5" stroke-linecap="round" fill="none"/>`,
        )
        .join(""),
  );
}

// ── 알·유제품·두부 ────────────────────────────

export function eggs(o: {
  color: string;
  count?: number;
  spots?: boolean;
  cracked?: boolean;
}): string {
  const a = new Art();
  const pos =
    o.count === 1
      ? [[32, 34]]
      : o.count === 3
        ? [
            [22, 38],
            [42, 38],
            [32, 28],
          ]
        : [
            [24, 36],
            [40, 34],
          ];
  const sizeK = o.spots ? 0.62 : 1;
  return a.svg(
    `${shadow(20)}` +
      pos
        .map(
          ([x, y]) =>
            `<path d="M${x} ${y - 15 * sizeK} Q${x + 11 * sizeK} ${y - 13 * sizeK} ${x + 11 * sizeK} ${y + 2 * sizeK} Q${x + 10 * sizeK} ${y + 13 * sizeK} ${x} ${y + 13 * sizeK} Q${x - 10 * sizeK} ${y + 13 * sizeK} ${x - 11 * sizeK} ${y + 2 * sizeK} Q${x - 11 * sizeK} ${y - 13 * sizeK} ${x} ${y - 15 * sizeK} Z" fill="${a.ball(o.color, 0.45, 0.25)}" ${outline(o.color)}/>` +
            (o.spots
              ? [
                  [-3, -4],
                  [3, 0],
                  [-2, 5],
                  [4, -7],
                  [0, 1],
                ]
                  .map(
                    ([dx, dy]) =>
                      `<circle cx="${x + dx}" cy="${y + dy}" r="1.3" fill="#6b4f3a" opacity="0.8"/>`,
                  )
                  .join("")
              : "") +
            shine(x - 4 * sizeK, y - 7 * sizeK, 3 * sizeK, 4.5 * sizeK, 20),
        )
        .join(""),
  );
}

/** 치즈 덩어리·슬라이스·버터 */
export function block(o: {
  color: string;
  kind: "wedge" | "slice" | "butter" | "tofu" | "ball" | "stick" | "tub";
  wrap?: string;
  text?: string;
}): string {
  const a = new Art();
  const c = o.color;
  switch (o.kind) {
    case "wedge":
      return a.svg(
        `${shadow(22)}<path d="M8 40 L50 22 L56 30 L56 46 L8 52 Z" fill="${a.top(tone(c, -0.08))}" ${outline(c)}/><path d="M8 40 L50 22 L56 30 L14 46 Z" fill="${a.top(tone(c, 0.2))}" ${outline(c)}/>` +
          [
            [24, 46, 2.5],
            [40, 42, 2],
            [48, 48, 1.8],
          ]
            .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${tone(c, -0.25)}"/>`)
            .join(""),
      );
    case "slice":
      return a.svg(
        `${shadow(20)}<rect x="12" y="20" width="36" height="32" rx="2" fill="${a.top(tone(c, -0.08))}" transform="rotate(-6 30 36)"/><path d="M14 14 H50 V48 Q40 52 36 46 Q30 42 22 48 H14 Z" fill="${a.top(c, 0.3, 0.15)}" ${outline(c)}/>${shine(22, 20, 7, 1.5, 0, 0.45)}`,
      );
    case "butter":
      return a.svg(
        `${shadow(22)}<path d="M10 30 L40 20 L56 28 L56 42 L26 52 L10 44 Z" fill="${a.top(o.wrap ?? "#f2f2f2")}" ${outline(o.wrap ?? "#d6d6d6")}/><path d="M10 30 L40 20 L56 28 L26 38 Z" fill="${a.top(c, 0.35, 0.1)}" ${outline(c)}/>${label(o.text ?? "", 30, 48, 7, tone(o.wrap ?? "#c62828", -0.1))}`,
      );
    case "tofu":
      return a.svg(
        `${shadow(22)}<path d="M8 30 L30 22 L56 28 L56 46 L34 54 L8 48 Z" fill="${a.top(tone(c, -0.06), 0.1, 0.2)}" ${outline(c)}/><path d="M8 30 L30 22 L56 28 L34 36 Z" fill="${a.top(tone(c, 0.15))}" ${outline(c)}/><path d="M34 36 V54" stroke="${tone(c, -0.15)}" stroke-width="1"/>${shine(28, 28, 8, 2, -10, 0.5)}`,
      );
    case "ball":
      return a.svg(
        `${shadow(18)}<circle cx="32" cy="36" r="18" fill="${a.ball(c, 0.25, 0.18)}" ${outline(c)}/>${shine(25, 28, 6, 4)}`,
      );
    case "stick":
      return a.svg(
        `${shadow(18)}<rect x="26" y="8" width="12" height="48" rx="6" fill="${a.cyl(c)}" ${outline(c)} transform="rotate(25 32 32)"/>${label(o.text ?? "", 32, 36, 6, tone(c, -0.5))}`,
      );
    case "tub":
      return a.svg(
        `${shadow(18)}<path d="M14 22 L50 22 L46 54 L18 54 Z" fill="${a.cyl(o.wrap ?? "#fff")}" ${outline(o.wrap ?? "#ddd")}/><ellipse cx="32" cy="22" rx="18" ry="5" fill="${a.top(c, 0.2, 0.1)}" ${outline(c)}/>${label(o.text ?? "", 32, 42, 8, tone(c, -0.45))}`,
      );
  }
}

// ── 곡물·면·빵 ────────────────────────────────

/** 그릇에 담긴 곡물·밥·콩 */
export function bowl(o: {
  content: string;
  bowl?: string;
  grain?: "rice" | "bean" | "seed" | "pile" | "natto";
}): string {
  const a = new Art();
  const bowlC = o.bowl ?? "#e8eef2";
  const c = o.content;
  const grains =
    o.grain === "bean" || o.grain === "natto"
      ? [
          [20, 26],
          [28, 22],
          [36, 22],
          [44, 26],
          [24, 30],
          [32, 28],
          [40, 30],
          [30, 18],
        ]
          .map(
            ([x, y]) =>
              `<ellipse cx="${x}" cy="${y}" rx="${o.grain === "natto" ? 3 : 3.6}" ry="${o.grain === "natto" ? 2.6 : 3}" fill="${a.ball(c, 0.4, 0.3)}"/>`,
          )
          .join("") +
        (o.grain === "natto"
          ? `<path d="M20 22 Q32 10 44 22 M24 18 Q34 30 42 16" stroke="#fff" stroke-width="0.7" fill="none" opacity="0.8"/>`
          : "")
      : o.grain === "seed"
        ? Array.from(
            { length: 18 },
            (_, i) =>
              `<ellipse cx="${16 + ((i * 17) % 32)}" cy="${20 + ((i * 5) % 12)}" rx="1.4" ry="2" transform="rotate(${i * 40} ${16 + ((i * 17) % 32)} ${20 + ((i * 5) % 12)})" fill="${tone(c, i % 2 ? -0.15 : 0.15)}"/>`,
          ).join("")
        : Array.from(
            { length: 14 },
            (_, i) =>
              `<ellipse cx="${18 + ((i * 19) % 28)}" cy="${18 + ((i * 7) % 12)}" rx="2.2" ry="1.2" transform="rotate(${i * 50} ${18 + ((i * 19) % 28)} ${18 + ((i * 7) % 12)})" fill="${tone(c, 0.3)}"/>`,
          ).join("");
  return a.svg(
    `${shadow(20)}<path d="M10 28 Q32 6 54 28 Z" fill="${a.ball(c, 0.35, 0.2)}"/>${grains}<path d="M8 28 H56 Q54 50 32 54 Q10 50 8 28 Z" fill="${a.cyl(bowlC)}" ${outline(bowlC)}/><path d="M14 34 H50" stroke="${tone(bowlC, -0.25)}" stroke-width="1.2"/>${shine(18, 36, 3, 6, 10, 0.5)}`,
  );
}

/** 면 다발 */
export function noodles(o: {
  color: string;
  kind: "dry" | "wavy" | "fresh" | "thick" | "round";
  tie?: string;
}): string {
  const a = new Art();
  const c = o.color;
  if (o.kind === "wavy" || o.kind === "round")
    return a.svg(
      `${shadow(18)}<rect x="10" y="22" width="44" height="30" rx="${o.kind === "round" ? 15 : 6}" fill="${a.top(c, 0.3, 0.25)}" ${outline(c)}/>` +
        [26, 31, 36, 41, 46]
          .map(
            (y) =>
              `<path d="M12 ${y} q4 -3 8 0 t8 0 t8 0 t8 0 t8 0" stroke="${tone(c, -0.2)}" stroke-width="1" fill="none"/>`,
          )
          .join("") +
        shine(20, 26, 7, 2),
    );
  const n = o.kind === "thick" ? 7 : 11;
  const w = o.kind === "thick" ? 4 : o.kind === "fresh" ? 2.6 : 2;
  const lines = Array.from({ length: n }, (_, i) => {
    const x = 20 + (i * 24) / (n - 1);
    return `<path d="M${x - 4} 8 L${x + 4} 56" stroke="${tone(c, i % 2 ? -0.06 : 0.06)}" stroke-width="${w}" stroke-linecap="round"/>`;
  }).join("");
  const tie = `<rect x="16" y="28" width="32" height="7" rx="2" fill="${a.cyl(o.tie ?? "#c62828")}" transform="rotate(4 32 31)"/>`;
  return a.svg(`${shadow(14)}${lines}${o.kind === "dry" ? tie : ""}`);
}

export function bread(o: {
  kind: "loaf" | "slice" | "baguette" | "bagel" | "bun" | "tortilla" | "bun2";
  color?: string;
}): string {
  const a = new Art();
  const crust = o.color ?? "#c98b4a";
  switch (o.kind) {
    case "slice":
      return a.svg(
        `${shadow(18)}<path d="M14 54 V28 Q8 24 10 16 Q14 8 32 8 Q50 8 54 16 Q56 24 50 28 V54 Z" fill="${a.top(crust)}" ${outline(crust)}/><path d="M17 51 V27 Q12 23 14 18 Q18 11 32 11 Q46 11 50 18 Q52 23 47 27 V51 Z" fill="${a.top("#fbf0d6", 0.2, 0.08)}"/>`,
      );
    case "baguette":
      return a.svg(
        `${shadow(24)}<g transform="rotate(-25 32 32)"><rect x="2" y="24" width="60" height="16" rx="8" fill="${a.cyl(crust)}" ${outline(crust)}/>${[14, 26, 38, 50].map((x) => `<path d="M${x} 27 q4 5 0 10" stroke="${tone(crust, 0.4)}" stroke-width="2" fill="none"/>`).join("")}</g>`,
      );
    case "bagel":
      return a.svg(
        `${shadow(20)}<circle cx="32" cy="34" r="20" fill="${a.ball(crust, 0.3, 0.3)}" ${outline(crust)}/><ellipse cx="32" cy="34" rx="6" ry="5" fill="${tone(crust, -0.35)}"/>${shine(24, 24, 7, 3)}`,
      );
    case "bun":
    case "bun2":
      return a.svg(
        `${shadow(20)}<path d="M8 42 Q8 18 32 18 Q56 18 56 42 Z" fill="${a.ball(crust, 0.35, 0.25)}" ${outline(crust)}/><rect x="8" y="42" width="48" height="10" rx="4" fill="${a.top(tone(crust, 0.1))}" ${outline(crust)}/>${[
          [24, 28],
          [32, 24],
          [40, 28],
          [28, 34],
          [38, 34],
        ]
          .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="0.8" fill="#fff8e7"/>`)
          .join("")}${shine(22, 26, 6, 3)}`,
      );
    case "tortilla":
      return a.svg(
        `${shadow(22)}<ellipse cx="32" cy="38" rx="26" ry="14" fill="${a.top("#f2dcae", 0.2, 0.15)}" ${outline("#d9bd86")}/>${[
          [20, 36],
          [34, 42],
          [44, 34],
          [28, 32],
        ]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#c99a5a" opacity="0.7"/>`)
          .join("")}`,
      );
    default:
      return a.svg(
        `${shadow(22)}<path d="M8 50 V30 Q8 16 20 16 Q26 10 32 16 Q38 10 44 16 Q56 16 56 30 V50 Z" fill="${a.ball(crust, 0.3, 0.25)}" ${outline(crust)}/>${shine(18, 24, 5, 3)}`,
      );
  }
}

/** 떡·어묵·맛살·소시지처럼 길쭉한 가공품 여러 개 */
export function sticks(o: {
  color: string;
  count?: number;
  kind?: "cylinder" | "flat" | "oval" | "link" | "crab";
  accent?: string;
}): string {
  const a = new Art();
  const n = o.count ?? 3;
  const c = o.color;
  const items = Array.from({ length: n }, (_, i) => {
    const y = 22 + i * (28 / Math.max(1, n - 1 || 1));
    const x = 10 + (i % 2) * 4;
    if (o.kind === "oval")
      return `<ellipse cx="${22 + i * 10}" cy="${30 + (i % 2) * 10}" rx="9" ry="6" fill="${a.ball(c, 0.25, 0.2)}" ${outline(c)}/>`;
    if (o.kind === "flat")
      return `<rect x="${x}" y="${y - 6}" width="44" height="12" rx="2" fill="${a.top(c, 0.25, 0.3)}" ${outline(c)}/><path d="M${x + 4} ${y - 2} h36" stroke="${tone(c, -0.15)}" stroke-width="0.8"/>`;
    if (o.kind === "link")
      return `<rect x="${x}" y="${y - 6}" width="42" height="12" rx="6" fill="${a.cyl(c)}" ${outline(c)} transform="rotate(${(i - 1) * 6} 32 ${y})"/><path d="M${x} ${y} l-3 0 M${x + 42} ${y} l3 0" stroke="${tone(c, -0.3)}" stroke-width="2" stroke-linecap="round"/>`;
    if (o.kind === "crab")
      return `<rect x="${x}" y="${y - 5}" width="42" height="10" rx="2" fill="${a.cyl("#fbf6ef")}" ${outline("#e7dccd")}/><rect x="${x}" y="${y - 5}" width="42" height="4" rx="2" fill="${o.accent ?? "#e5533d"}"/>`;
    return `<rect x="${x}" y="${y - 5}" width="44" height="10" rx="5" fill="${a.cyl(c)}" ${outline(c)}/>`;
  }).join("");
  return a.svg(`${shadow(22)}${items}`);
}

/** 만두 */
export function dumpling(color = "#f6eedd"): string {
  const a = new Art();
  const one = (x: number, y: number, s: number) =>
    `<path d="M${x - 14 * s} ${y + 4 * s} Q${x - 14 * s} ${y - 12 * s} ${x} ${y - 12 * s} Q${x + 14 * s} ${y - 12 * s} ${x + 14 * s} ${y + 4 * s} Q${x} ${y + 8 * s} ${x - 14 * s} ${y + 4 * s} Z" fill="${a.ball(color, 0.3, 0.2)}" ${outline(color)}/>` +
    [-8, -3, 2, 7]
      .map(
        (dx) =>
          `<path d="M${x + dx * s} ${y - 11 * s} q1.5 4 0 7" stroke="${tone(color, -0.2)}" stroke-width="0.9" fill="none"/>`,
      )
      .join("");
  return a.svg(`${shadow(22)}${one(20, 40, 0.9)}${one(44, 40, 0.9)}${one(32, 28, 1)}`);
}

// ── 포장 용기 ─────────────────────────────────

/** 병 (간장, 식용유, 식초, 소스, 맥주, 막걸리) */
export function bottle(o: {
  body: string;
  cap?: string;
  label?: string;
  text?: string;
  textColor?: string;
  shape?: "tall" | "round" | "squeeze" | "beer" | "wine" | "small";
  fill?: number;
}): string {
  const a = new Art();
  const cap = o.cap ?? "#c62828";
  const lab = o.label ?? "#fff";
  const tc = o.textColor ?? tone(o.body, -0.4);
  let body: string;
  switch (o.shape) {
    case "squeeze":
      body = `<path d="M18 22 Q18 16 24 16 H40 Q46 16 46 22 V52 Q46 56 42 56 H22 Q18 56 18 52 Z"`;
      break;
    case "round":
      body = `<path d="M26 14 H38 V20 Q50 26 50 40 Q50 56 32 56 Q14 56 14 40 Q14 26 26 20 Z"`;
      break;
    case "beer":
    case "wine":
      body = `<path d="M28 6 H36 V18 Q44 24 44 32 V54 Q44 57 41 57 H23 Q20 57 20 54 V32 Q20 24 28 18 Z"`;
      break;
    case "small":
      body = `<path d="M27 16 H37 V22 Q42 24 42 30 V54 Q42 57 39 57 H25 Q22 57 22 54 V30 Q22 24 27 22 Z"`;
      break;
    default:
      body = `<path d="M27 8 H37 V18 Q44 22 44 30 V54 Q44 57 41 57 H23 Q20 57 20 54 V30 Q20 22 27 18 Z"`;
  }
  const capY =
    o.shape === "squeeze"
      ? 8
      : o.shape === "round"
        ? 8
        : o.shape === "beer" || o.shape === "wine"
          ? 2
          : o.shape === "small"
            ? 10
            : 3;
  const capH = o.shape === "squeeze" ? 9 : 7;
  const capW = o.shape === "squeeze" ? 12 : 12;
  const capEl =
    o.shape === "squeeze"
      ? `<path d="M26 16 L28 ${capY} H36 L38 16 Z" fill="${a.cyl(cap)}" ${outline(cap)}/><rect x="30" y="${capY - 4}" width="4" height="5" rx="1" fill="${a.cyl(cap)}"/>`
      : `<rect x="${32 - capW / 2}" y="${capY}" width="${capW}" height="${capH}" rx="1.5" fill="${a.cyl(cap)}" ${outline(cap)}/>`;
  const labY = o.shape === "round" ? 32 : 32;
  const labEl = `<rect x="${o.shape === "round" ? 16 : 21}" y="${labY}" width="${o.shape === "round" ? 32 : 22}" height="14" rx="2" fill="${lab}"/>${label(o.text ?? "", 32, labY + 10, o.text && o.text.length > 2 ? 6.5 : 8, tc)}`;
  return a.svg(
    `${shadow(14)}${body} fill="${a.cyl(o.body)}" ${outline(o.body)}/>${capEl}${labEl}<path d="${o.shape === "round" ? "M20 30 Q18 40 21 50" : "M24 26 V52"}" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.45"/>`,
  );
}

/** 우유팩 (우유, 주스, 두유, 생크림) */
export function carton(o: {
  body: string;
  top?: string;
  text?: string;
  textColor?: string;
  small?: boolean;
}): string {
  const a = new Art();
  const top = o.top ?? o.body;
  const s = o.small ? 0.8 : 1;
  const x = 32 - 13 * s;
  const w = 26 * s;
  const y0 = 64 - 8 - 40 * s;
  return a.svg(
    `${shadow(15)}<rect x="${x}" y="${y0 + 10 * s}" width="${w}" height="${38 * s}" rx="2" fill="${a.cyl(o.body)}" ${outline(o.body)}/>` +
      `<path d="M${x} ${y0 + 10 * s} L${x + 4 * s} ${y0} H${x + w - 4 * s} L${x + w} ${y0 + 10 * s} Z" fill="${a.top(top, 0.25, 0.1)}" ${outline(top)}/><rect x="${x + 6 * s}" y="${y0 - 4 * s}" width="${w - 12 * s}" height="${5 * s}" rx="1" fill="${a.top(top)}"/>` +
      `<rect x="${x + 3 * s}" y="${y0 + 18 * s}" width="${w - 6 * s}" height="${16 * s}" rx="2" fill="#fff" opacity="0.92"/>${label(o.text ?? "", 32, y0 + 29 * s, (o.text?.length ?? 0) > 2 ? 6.5 : 8, o.textColor ?? tone(top, -0.3))}` +
      `<path d="M${x + 4 * s} ${y0 + 14 * s} V${y0 + 44 * s}" stroke="#fff" stroke-width="2" opacity="0.4"/>`,
  );
}

/** 뚜껑 있는 통 (고추장·된장 통, 김치통, 요거트) */
export function tub(o: {
  body: string;
  lid?: string;
  text?: string;
  textColor?: string;
  content?: string;
  shape?: "square" | "round" | "cup" | "low";
}): string {
  const a = new Art();
  const lid = o.lid ?? tone(o.body, -0.15);
  const tc = o.textColor ?? "#fff";
  if (o.shape === "cup")
    return a.svg(
      `${shadow(14)}<path d="M18 20 H46 L42 56 H22 Z" fill="${a.cyl(o.body)}" ${outline(o.body)}/><ellipse cx="32" cy="20" rx="14" ry="4" fill="${a.top(lid)}" ${outline(lid)}/>${label(o.text ?? "", 32, 42, 7.5, tc)}`,
    );
  if (o.shape === "low")
    return a.svg(
      `${shadow(22)}<path d="M8 32 H56 L54 50 Q54 54 50 54 H14 Q10 54 10 50 Z" fill="${a.cyl(o.body)}" ${outline(o.body)}/>${o.content ? `<path d="M10 32 H54 L53 40 H11 Z" fill="${o.content}" opacity="0.85"/>` : ""}<rect x="6" y="26" width="52" height="7" rx="3" fill="${a.top(lid)}" ${outline(lid)}/>${label(o.text ?? "", 32, 49, 7.5, tc)}`,
    );
  if (o.shape === "round")
    return a.svg(
      `${shadow(18)}<path d="M12 24 H52 V50 Q52 56 46 56 H18 Q12 56 12 50 Z" fill="${a.cyl(o.body)}" ${outline(o.body)}/><ellipse cx="32" cy="22" rx="21" ry="6" fill="${a.top(lid, 0.3, 0.15)}" ${outline(lid)}/><rect x="11" y="18" width="42" height="6" rx="3" fill="${a.cyl(lid)}"/>${label(o.text ?? "", 32, 45, 9, tc)}`,
    );
  return a.svg(
    `${shadow(20)}<rect x="10" y="22" width="44" height="34" rx="4" fill="${a.cyl(o.body)}" ${outline(o.body)}/>${o.content ? `<rect x="13" y="25" width="38" height="14" rx="2" fill="${o.content}" opacity="0.9"/>` : ""}<rect x="8" y="16" width="48" height="8" rx="3" fill="${a.top(lid)}" ${outline(lid)}/>${label(o.text ?? "", 32, 50, 8, tc)}`,
  );
}

/** 유리병 (잼, 꿀, 피클, 땅콩버터, 젓갈) */
export function jar(o: { content: string; lid?: string; text?: string; chunks?: string }): string {
  const a = new Art();
  const lid = o.lid ?? "#d4a017";
  return a.svg(
    `${shadow(15)}<path d="M16 20 H48 V50 Q48 56 42 56 H22 Q16 56 16 50 Z" fill="${a.cyl("#dfeef5")}" opacity="0.55"/><path d="M18 26 H46 V50 Q46 54 42 54 H22 Q18 54 18 50 Z" fill="${a.cyl(o.content)}"/>` +
      (o.chunks
        ? [
            [24, 34],
            [36, 38],
            [28, 46],
            [40, 48],
            [32, 30],
          ]
            .map(
              ([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${o.chunks}" opacity="0.85"/>`,
            )
            .join("")
        : "") +
      `<path d="M16 20 H48 V50 Q48 56 42 56 H22 Q16 56 16 50 Z" fill="none" ${outline("#b8c7cf")}/><rect x="14" y="10" width="36" height="10" rx="3" fill="${a.cyl(lid)}" ${outline(lid)}/>` +
      (o.text
        ? `<rect x="20" y="34" width="24" height="12" rx="2" fill="#fff" opacity="0.92"/>${label(o.text, 32, 43, o.text.length > 2 ? 6 : 7.5, tone(o.content, -0.4))}`
        : "") +
      `<path d="M21 24 V50" stroke="#fff" stroke-width="2.4" opacity="0.55" stroke-linecap="round"/>`,
  );
}

/** 캔 (참치, 옥수수콘, 콜라, 맥주) */
export function can(o: {
  body: string;
  text?: string;
  textColor?: string;
  kind?: "short" | "tall" | "rect";
  band?: string;
}): string {
  const a = new Art();
  if (o.kind === "rect")
    return a.svg(
      `${shadow(20)}<rect x="10" y="22" width="44" height="32" rx="6" fill="${a.cyl(o.body)}" ${outline(o.body)}/><rect x="10" y="18" width="44" height="8" rx="4" fill="${a.cyl("#c9ced3")}" ${outline("#a9b0b6")}/>${o.band ? `<rect x="10" y="32" width="44" height="12" fill="${o.band}"/>` : ""}${label(o.text ?? "", 32, 42, 8, o.textColor ?? "#fff")}`,
    );
  const tall = o.kind === "tall";
  const y0 = tall ? 8 : 22;
  const h = tall ? 48 : 32;
  return a.svg(
    `${shadow(16)}<rect x="16" y="${y0}" width="32" height="${h}" rx="3" fill="${a.cyl(o.body)}" ${outline(o.body)}/><ellipse cx="32" cy="${y0}" rx="16" ry="4" fill="${a.top("#d7dce0", 0.3, 0.1)}" ${outline("#a9b0b6")}/><ellipse cx="32" cy="${y0}" rx="11" ry="2.4" fill="none" stroke="#a9b0b6" stroke-width="1"/>` +
      (o.band
        ? `<rect x="16" y="${y0 + h * 0.35}" width="32" height="${h * 0.35}" fill="${o.band}"/>`
        : "") +
      `${label(o.text ?? "", 32, y0 + h * 0.62, 8, o.textColor ?? "#fff")}<path d="M20 ${y0 + 4} V${y0 + h - 3}" stroke="#fff" stroke-width="2.4" opacity="0.45" stroke-linecap="round"/>`,
  );
}

/** 봉지 포장 (밀가루, 라면, 면, 냉동식품, 시리얼, 가루) */
export function pouch(o: {
  body: string;
  text?: string;
  textColor?: string;
  window?: string;
  kind?: "bag" | "box" | "ramen" | "sachet" | "net";
}): string {
  const a = new Art();
  const c = o.body;
  const tc = o.textColor ?? "#fff";
  if (o.kind === "box")
    return a.svg(
      `${shadow(18)}<path d="M14 12 L44 8 L50 12 V56 L20 58 L14 54 Z" fill="${a.top(tone(c, -0.15))}" ${outline(c)}/><path d="M20 14 L50 12 V56 L20 58 Z" fill="${a.cyl(c)}" ${outline(c)}/>${o.window ? `<ellipse cx="35" cy="42" rx="9" ry="7" fill="${o.window}"/>` : ""}${label(o.text ?? "", 35, 28, 8, tc)}`,
    );
  if (o.kind === "ramen")
    return a.svg(
      `${shadow(22)}<path d="M6 20 L58 18 L58 50 L6 52 Z" fill="${a.top(c, 0.2, 0.25)}" ${outline(c)}/><path d="M6 20 l4 -2 l4 2 l4 -2 l4 2 l4 -2 l4 2 l4 -2 l4 2 l4 -2 l4 2 l4 -2 l4 2 l4 -2" stroke="${tone(c, -0.3)}" stroke-width="1" fill="none"/><ellipse cx="44" cy="36" rx="9" ry="8" fill="${o.window ?? "#f4d27a"}"/><path d="M38 34 q3 -3 6 0 t6 0 M38 38 q3 -3 6 0 t6 0" stroke="#c99a3a" stroke-width="1" fill="none"/>${label(o.text ?? "", 22, 40, 10, tc)}`,
    );
  if (o.kind === "sachet")
    return a.svg(
      `${shadow(16)}<path d="M16 14 H48 L46 56 H18 Z" fill="${a.cyl(c)}" ${outline(c)}/><path d="M16 14 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3" stroke="${tone(c, -0.3)}" stroke-width="1" fill="none"/>${label(o.text ?? "", 32, 38, (o.text?.length ?? 0) > 2 ? 7 : 9, tc)}`,
    );
  if (o.kind === "net")
    return a.svg(
      `${shadow(18)}<path d="M18 14 Q32 8 46 14 L50 50 Q32 60 14 50 Z" fill="${a.ball(c, 0.25, 0.25)}" ${outline(c)}/><path d="M18 14 L50 50 M30 11 L52 38 M14 30 L40 58 M46 14 L14 50 M34 11 L12 38 M50 30 L24 58" stroke="${tone(c, -0.4)}" stroke-width="0.9" opacity="0.6"/><rect x="26" y="6" width="12" height="6" rx="2" fill="#c62828"/>`,
    );
  return a.svg(
    `${shadow(18)}<path d="M14 14 Q14 10 18 10 H46 Q50 10 50 14 L54 52 Q54 58 48 58 H16 Q10 58 10 52 Z" fill="${a.cyl(c)}" ${outline(c)}/><path d="M14 16 H50" stroke="${tone(c, -0.25)}" stroke-width="1.6"/>${o.window ? `<rect x="20" y="36" width="24" height="14" rx="4" fill="${o.window}" ${outline(o.window)}/>` : ""}${label(o.text ?? "", 32, 30, (o.text?.length ?? 0) > 2 ? 7.5 : 9, tc)}`,
  );
}

/** 소금·후추 같은 통 */
export function shaker(o: {
  body: string;
  cap?: string;
  text?: string;
  textColor?: string;
}): string {
  const a = new Art();
  const cap = o.cap ?? "#9aa3a8";
  return a.svg(
    `${shadow(13)}<rect x="20" y="20" width="24" height="36" rx="4" fill="${a.cyl(o.body)}" ${outline(o.body)}/><path d="M20 20 Q20 10 32 10 Q44 10 44 20 Z" fill="${a.ball(cap)}" ${outline(cap)}/>${[28, 32, 36].map((x) => `<circle cx="${x}" cy="15" r="0.9" fill="${tone(cap, -0.5)}"/>`).join("")}${label(o.text ?? "", 32, 42, (o.text?.length ?? 0) > 2 ? 6.5 : 8, o.textColor ?? "#fff")}<path d="M24 24 V52" stroke="#fff" stroke-width="2" opacity="0.4"/>`,
  );
}

/** 컵 음료·커피 */
export function cup(o: { body: string; drink?: string; text?: string }): string {
  const a = new Art();
  return a.svg(
    `${shadow(15)}<path d="M16 16 H48 L44 56 H20 Z" fill="${a.cyl(o.body)}" ${outline(o.body)}/><ellipse cx="32" cy="16" rx="16" ry="4" fill="${o.drink ?? "#6b4423"}"/><rect x="14" y="10" width="36" height="5" rx="2" fill="${a.cyl(tone(o.body, -0.2))}"/>${label(o.text ?? "", 32, 40, 8, tone(o.body, -0.5))}`,
  );
}

/** 견과류·밤·씨앗 무더기 */
export function nuts(o: {
  color: string;
  kind: "almond" | "chestnut" | "pine" | "raisin" | "peanut" | "walnut";
}): string {
  const a = new Art();
  const c = o.color;
  const pos = [
    [20, 40],
    [34, 42],
    [46, 38],
    [26, 30],
    [40, 28],
    [32, 20],
  ];
  const one = (x: number, y: number) => {
    switch (o.kind) {
      case "chestnut":
        return `<path d="M${x} ${y - 9} Q${x + 10} ${y - 4} ${x + 8} ${y + 5} Q${x} ${y + 9} ${x - 8} ${y + 5} Q${x - 10} ${y - 4} ${x} ${y - 9} Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><path d="M${x - 8} ${y + 4} Q${x} ${y + 9} ${x + 8} ${y + 4} L${x + 7} ${y + 1} Q${x} ${y + 5} ${x - 7} ${y + 1} Z" fill="#d9c49a"/>`;
      case "pine":
        return `<ellipse cx="${x}" cy="${y}" rx="2.8" ry="4" fill="${a.ball(c, 0.35, 0.2)}" ${outline(c)}/>`;
      case "raisin":
        return `<ellipse cx="${x}" cy="${y}" rx="4.5" ry="3.6" fill="${a.ball(c, 0.25, 0.35)}" ${outline(c)}/><path d="M${x - 2} ${y - 1} q2 2 4 0" stroke="${tone(c, 0.3)}" stroke-width="0.7" fill="none"/>`;
      case "peanut":
        return `<path d="M${x - 7} ${y} Q${x - 7} ${y - 6} ${x - 2} ${y - 4} Q${x} ${y - 3} ${x + 2} ${y - 4} Q${x + 7} ${y - 6} ${x + 7} ${y} Q${x + 7} ${y + 6} ${x + 2} ${y + 4} Q${x} ${y + 3} ${x - 2} ${y + 4} Q${x - 7} ${y + 6} ${x - 7} ${y} Z" fill="${a.ball(c, 0.3, 0.25)}" ${outline(c)}/>`;
      case "walnut":
        return `<circle cx="${x}" cy="${y}" r="6.5" fill="${a.ball(c, 0.25, 0.3)}" ${outline(c)}/><path d="M${x} ${y - 6} V${y + 6} M${x - 4} ${y - 3} q2 3 0 6 M${x + 4} ${y - 3} q-2 3 0 6" stroke="${tone(c, -0.3)}" stroke-width="0.8" fill="none"/>`;
      default:
        return `<path d="M${x} ${y - 8} Q${x + 6} ${y - 2} ${x + 4} ${y + 5} Q${x} ${y + 8} ${x - 4} ${y + 5} Q${x - 6} ${y - 2} ${x} ${y - 8} Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><path d="M${x} ${y - 5} V${y + 4}" stroke="${tone(c, -0.25)}" stroke-width="0.7"/>`;
    }
  };
  const list =
    o.kind === "pine" || o.kind === "raisin"
      ? [...pos, [26, 46], [42, 48], [16, 32]]
      : o.kind === "chestnut"
        ? pos.slice(0, 3)
        : pos;
  return a.svg(`${shadow(20)}${list.map(([x, y]) => one(x, y)).join("")}`);
}

/** 초콜릿 바 */
export function chocolateBar(): string {
  const a = new Art();
  const c = "#5d3a1a";
  return a.svg(
    `${shadow(20)}<rect x="12" y="10" width="40" height="46" rx="3" fill="${a.top(c, 0.2, 0.3)}" ${outline(c)}/>${[
      0, 1, 2,
    ]
      .flatMap((r) =>
        [0, 1].map(
          (col) =>
            `<rect x="${15 + col * 18}" y="${13 + r * 14}" width="16" height="12" rx="1.5" fill="${a.top(tone(c, 0.12), 0.25, 0.2)}"/>`,
        ),
      )
      .join(
        "",
      )}<path d="M12 40 L52 34 V56 H12 Z" fill="${a.top("#c62828", 0.25, 0.2)}"/>${label("초코", 32, 50, 8)}`,
  );
}

/** 무화과·감·자두처럼 끝이 살짝 뾰족한 열매 */
export function teardrop(o: { color: string; top?: "stem" | "none"; flesh?: string }): string {
  const a = new Art();
  return a.svg(
    `${shadow(17)}<path d="M32 10 Q38 16 44 24 Q54 36 48 48 Q42 56 32 56 Q22 56 16 48 Q10 36 20 24 Q26 16 32 10 Z" fill="${a.ball(o.color)}" ${outline(o.color)}/>${o.flesh ? `<path d="M32 30 Q40 38 36 50 Q32 52 28 50 Q24 38 32 30 Z" fill="${o.flesh}" opacity="0.8"/>` : ""}${o.top === "stem" ? `<path d="M32 11 q0 -4 2 -6" stroke="#6b4423" stroke-width="2.4" stroke-linecap="round" fill="none"/>` : ""}${shine(24, 28, 5, 3)}`,
  );
}

/** 파인애플 */
export function pineapple(): string {
  const a = new Art();
  const c = "#e0a526";
  return a.svg(
    `${shadow(15)}${[-10, -5, 0, 5, 10].map((dx) => `<path d="M${32 + dx * 0.4} 24 L${32 + dx * 1.3} ${6 + Math.abs(dx) * 0.7} L${32 + dx * 0.4 + 3} 24 Z" fill="${a.top("#4f9a3c")}" stroke="#2f6b26" stroke-width="0.8"/>`).join("")}<ellipse cx="32" cy="40" rx="15" ry="18" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/>` +
      `<path d="M20 30 L44 52 M17 40 L36 58 M26 23 L46 42 M44 30 L20 52 M47 40 L28 58 M38 23 L18 42" stroke="${tone(c, -0.35)}" stroke-width="1" opacity="0.7"/>${shine(25, 30, 3, 6, 15)}`,
  );
}

/** 바구니 그릇에 담긴 반찬·김치 */
export function sideDish(o: {
  color: string;
  kind: "kimchi" | "cubes" | "stalks" | "eggs" | "mixed" | "radish" | "liquid";
}): string {
  const a = new Art();
  const c = o.color;
  let top: string;
  switch (o.kind) {
    case "cubes":
      top = [
        [20, 26],
        [30, 22],
        [40, 26],
        [25, 32],
        [36, 32],
        [44, 32],
      ]
        .map(
          ([x, y]) =>
            `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="1.5" fill="${a.top(c, 0.3, 0.2)}" ${outline(c)}/>`,
        )
        .join("");
      break;
    case "stalks":
      top = [0, 1, 2, 3, 4]
        .map(
          (i) =>
            `<path d="M${16 + i * 7} 34 Q${18 + i * 7} 22 ${24 + i * 6} 14" stroke="${i % 2 ? c : tone(c, 0.15)}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
        )
        .join("");
      break;
    case "eggs":
      top = [
        [22, 26],
        [32, 22],
        [42, 26],
        [27, 32],
        [38, 32],
      ]
        .map(
          ([x, y]) =>
            `<ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/>`,
        )
        .join("");
      break;
    case "radish":
      top = [
        [20, 24, 30],
        [30, 20, -20],
        [40, 24, 15],
        [26, 30, -40],
        [38, 30, 40],
      ]
        .map(
          ([x, y, r]) =>
            `<path d="M${x - 6} ${y} Q${x} ${y - 6} ${x + 6} ${y} Q${x} ${y + 4} ${x - 6} ${y} Z" transform="rotate(${r} ${x} ${y})" fill="${a.top(c, 0.3, 0.2)}" ${outline(c)}/>`,
        )
        .join("");
      break;
    case "liquid":
      top = `<ellipse cx="32" cy="30" rx="22" ry="6" fill="${a.top(c, 0.25, 0.1)}"/>${[
        [22, 30],
        [34, 29],
        [42, 31],
      ]
        .map(
          ([x, y]) =>
            `<rect x="${x - 3}" y="${y - 2}" width="6" height="4" rx="1" fill="#f4efe0" opacity="0.9"/>`,
        )
        .join("")}`;
      break;
    case "mixed":
      top = `<path d="M12 30 Q22 14 34 18 Q48 14 52 30 Z" fill="${a.ball(c, 0.3, 0.25)}"/>${[
        [22, 24, "#7cb342"],
        [32, 20, "#f6c945"],
        [42, 24, "#e57373"],
        [28, 28, "#a1887f"],
      ]
        .map(([x, y, col]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${col}"/>`)
        .join("")}`;
      break;
    default:
      top = `<path d="M12 30 Q16 12 28 16 Q34 8 42 16 Q52 14 52 30 Z" fill="${a.ball(c, 0.3, 0.3)}" ${outline(c)}/><path d="M22 18 Q26 26 22 30 M32 14 Q36 22 32 30 M42 18 Q40 24 44 30" stroke="#f6e7c8" stroke-width="2" fill="none" opacity="0.8"/>`;
  }
  const dish = "#f2f4f5";
  return a.svg(
    `${shadow(22)}${top}<path d="M8 30 H56 Q54 48 32 52 Q10 48 8 30 Z" fill="${a.cyl(dish)}" ${outline("#cfd6da")}/><path d="M12 36 H52" stroke="#9fb3c8" stroke-width="2" opacity="0.6"/>${shine(16, 38, 2.5, 5, 10, 0.5)}`,
  );
}
