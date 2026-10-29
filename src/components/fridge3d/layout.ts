import type { CompartmentSlot } from "@/lib/domain/fridge";

/**
 * 3D 냉장고의 치수와 칸 배치 (단위: 대략 m의 절반쯤 되는 장면 단위).
 * 화면 그리기와 떨어진 순수 계산이라 단위 테스트로 확인한다.
 *
 * - 냉장고 몸통: 가로 1.8, 높이 3.3, 깊이 1.2. 앞면이 +z.
 * - 아래 냉동실(문 안에 서랍 2개), 위 냉장실(유리 선반 3단, 채소칸, 문 선반 3칸)
 * - 팬트리(실온)는 냉장고 위 바구니
 */

export type Vec3 = [number, number, number];

export const FRIDGE = {
  width: 1.8,
  height: 3.3,
  depth: 1.2,
  wall: 0.06,
  /** 냉동실 문: y 0.08 ~ 1.18 */
  freezerDoor: { y0: 0.08, y1: 1.18 },
  /** 냉장실 문: y 1.24 ~ 3.24 */
  fridgeDoor: { y0: 1.24, y1: 3.24 },
  /** 문 두께와 경첩(오른쪽 앞 모서리) 위치 */
  doorThick: 0.1,
  hingeX: 0.9,
  hingeZ: 0.6,
  /** 문이 열리는 각도 (라디안) */
  doorOpenAngle: (100 * Math.PI) / 180,
  /** 서랍이 앞으로 나오는 거리 */
  drawerTravel: 0.78,
} as const;

/** 칸의 바닥면(재료가 놓이는 면)과 놓을 수 있는 범위 */
export interface SlotArea {
  /** 바닥 높이 */
  y: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** 재료가 가질 수 있는 최대 높이 */
  maxH: number;
  /** 어느 부품에 붙어 있는가 (문·서랍은 함께 움직인다) */
  parent: "body" | "fridgeDoor" | "drawerUpper" | "drawerLower" | "pantry";
  /** 한 줄로만 놓는 칸 (문 선반) */
  singleRow?: boolean;
}

const IN_X0 = -0.82;
const IN_X1 = 0.82;

/**
 * 칸별 영역. 문 선반은 문 좌표계(경첩이 원점, 문은 -x 방향으로 뻗음, 안쪽이 -z),
 * 서랍은 서랍 좌표계, 나머지는 냉장고 몸통 좌표계.
 */
export const SLOT_AREAS: Record<CompartmentSlot, SlotArea[]> = {
  fridge_top: [{ y: 2.74, x0: IN_X0, x1: IN_X1, z0: -0.5, z1: 0.42, maxH: 0.42, parent: "body" }],
  fridge_middle: [
    { y: 2.24, x0: IN_X0, x1: IN_X1, z0: -0.5, z1: 0.42, maxH: 0.42, parent: "body" },
  ],
  fridge_bottom: [
    { y: 1.74, x0: IN_X0, x1: IN_X1, z0: -0.5, z1: 0.42, maxH: 0.42, parent: "body" },
  ],
  veg_drawer: [{ y: 1.3, x0: -0.78, x1: 0.78, z0: -0.46, z1: 0.36, maxH: 0.3, parent: "body" }],
  // 문 선반 3칸 (문 안쪽에 붙은 통)
  fridge_door: [
    {
      y: 1.5,
      x0: -1.62,
      x1: -0.18,
      z0: -0.3,
      z1: -0.08,
      maxH: 0.42,
      parent: "fridgeDoor",
      singleRow: true,
    },
    {
      y: 2.08,
      x0: -1.62,
      x1: -0.18,
      z0: -0.3,
      z1: -0.08,
      maxH: 0.42,
      parent: "fridgeDoor",
      singleRow: true,
    },
    {
      y: 2.66,
      x0: -1.62,
      x1: -0.18,
      z0: -0.3,
      z1: -0.08,
      maxH: 0.42,
      parent: "fridgeDoor",
      singleRow: true,
    },
  ],
  freezer_upper: [
    { y: 0.04, x0: -0.74, x1: 0.74, z0: -0.4, z1: 0.36, maxH: 0.36, parent: "drawerUpper" },
  ],
  freezer_lower: [
    { y: 0.04, x0: -0.74, x1: 0.74, z0: -0.4, z1: 0.36, maxH: 0.36, parent: "drawerLower" },
  ],
  pantry: [{ y: 3.36, x0: -0.72, x1: 0.72, z0: -0.38, z1: 0.34, maxH: 0.36, parent: "pantry" }],
};

/** 서랍 위치 (몸통 좌표계, 닫힌 상태의 서랍 바닥 중심) */
export const DRAWERS = {
  drawerUpper: { y: 0.66, h: 0.46 },
  drawerLower: { y: 0.16, h: 0.46 },
} as const;

export interface Placement {
  /** 부모(몸통·문·서랍) 좌표계에서 재료 바닥 중심 */
  pos: Vec3;
  /** 모델 크기 (모델은 가장 긴 변이 1) */
  size: number;
  parent: SlotArea["parent"];
  /** 앞에서부터 몇 번째 줄인지 (0 = 맨 앞) */
  row: number;
}

/**
 * 칸 안에 재료 n개를 놓는다. 앞줄부터 왼쪽→오른쪽으로 채우고,
 * 칸이 모자라면 재료를 작게 만들어 모두 들어가게 한다.
 */
export function placeItems(slot: CompartmentSlot, n: number): Placement[] {
  if (n === 0) return [];
  const areas = SLOT_AREAS[slot];
  // 여러 칸(문 선반 3칸)은 고르게 나눠 담는다
  const perArea = areas.map(
    (_, i) => Math.floor(n / areas.length) + (i < n % areas.length ? 1 : 0),
  );
  const out: Placement[] = [];
  areas.forEach((area, ai) => {
    const k = perArea[ai];
    if (k === 0) return;
    const w = area.x1 - area.x0;
    const d = area.z1 - area.z0;
    // 크기 s를 줄여 가며 들어가는 가장 큰 크기를 찾는다
    let s = Math.min(0.4, area.maxH, area.singleRow ? d * 1.4 : 0.4);
    let cols = 1;
    let rows = 1;
    for (; s > 0.05; s *= 0.92) {
      const gap = s * 1.08;
      cols = Math.max(1, Math.floor(w / gap));
      rows = area.singleRow ? 1 : Math.max(1, Math.floor(d / gap));
      if (cols * rows >= k) break;
    }
    const gap = s * 1.08;
    const usedRows = Math.ceil(k / cols);
    for (let i = 0; i < k; i++) {
      const row = Math.floor(i / cols);
      const inRow = row === usedRows - 1 ? k - row * cols : cols;
      const col = i % cols;
      const x = (area.x0 + area.x1) / 2 + (col - (inRow - 1) / 2) * gap;
      // 앞줄(z가 큰 쪽)부터
      const z = area.singleRow ? (area.z0 + area.z1) / 2 : area.z1 - s / 2 - row * gap;
      out.push({ pos: [x, area.y, z], size: s, parent: area.parent, row });
    }
  });
  return out;
}

/**
 * 카메라가 상자(가로 x0~x1, 세로 y0~y1)를 화면에 담도록 하는 거리.
 * 세로 시야각 fovDeg, 화면 비율 aspect(가로/세로), 여백 margin.
 */
export function fitDistance(
  box: { x0: number; x1: number; y0: number; y1: number },
  fovDeg: number,
  aspect: number,
  margin = 1.08,
): number {
  const tanV = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const tanH = tanV * aspect;
  const dV = ((box.y1 - box.y0) / 2 / tanV) * margin;
  const dH = ((box.x1 - box.x0) / 2 / tanH) * margin;
  return Math.max(dV, dH);
}

/** 기본 화면에 담을 범위: 냉장고 + 오른쪽으로 열린 문 + 위 바구니 */
/**
 * 그리기 해상도. 고해상도 폰(3배)에서 그대로 그리면 픽셀이 너무 많아 1.5배로 묶는다.
 * 자동화 브라우저(E2E)는 GPU 없이 소프트웨어로 그리므로 더 낮춘다.
 */
export function renderDpr(): number | [number, number] {
  if (typeof navigator !== "undefined" && navigator.webdriver) return 0.6;
  return [1, 1.5];
}

/** 계속 움직이는 장식(흔들림·파리)을 그릴지. 자동화 브라우저에서는 끈다. */
export function ambientMotion(reducedMotion: boolean): boolean {
  return !reducedMotion && !(typeof navigator !== "undefined" && navigator.webdriver);
}

export const VIEW_BOX = { x0: -1.0, x1: 1.3, y0: 0, y1: 4.05 };
