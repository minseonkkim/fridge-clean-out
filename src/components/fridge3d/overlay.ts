import * as THREE from "three";

/**
 * 3D 위에 겹치는 DOM (재료 이름표, 칸 영역, 문·서랍 버튼).
 * 버튼·영역은 진짜 DOM이라 화면 읽기·키보드·드래그가 그대로 동작하고,
 * 위치만 3D 물체를 따라간다. 장면이 그려질 때마다(sync) 물체를 화면 좌표로 투영해 옮긴다.
 *
 * 같은 key로 3D 물체(setObject)와 DOM 요소(setElement)를 등록하면 짝이 된다.
 */
export type AnchorMode =
  /** 물체를 감싸는 화면 사각형에 요소 크기·위치를 맞춘다 (칸 영역, 문 버튼) */
  | "box"
  /** 물체 바닥 앞쪽 한 점에 요소를 둔다 (앞줄 재료 이름표) */
  | "foot"
  /** 물체 꼭대기 한 점에 요소를 둔다 (뒷줄 재료 이름표: 앞줄 이름표와 겹치지 않게) */
  | "head";

interface Anchor {
  obj?: THREE.Object3D;
  el?: HTMLElement;
  mode: AnchorMode;
  /** 요소가 다른 앵커(칸 영역) 안에 들어 있으면 그 앵커 기준 좌표로 놓는다 */
  parent?: string;
}

const box3 = new THREE.Box3();
const v = new THREE.Vector3();
const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

export class Overlay {
  private anchors = new Map<string, Anchor>();
  private onChange: () => void = () => {};

  /** 등록이 바뀌면 다시 그려 달라고 장면에 알린다 */
  listen(fn: () => void): () => void {
    this.onChange = fn;
    return () => {
      if (this.onChange === fn) this.onChange = () => {};
    };
  }

  /** 앵커 방식은 3D 쪽이 정한다 (DOM 쪽은 방식을 모를 수 있다) */
  private get(key: string, mode?: AnchorMode) {
    let a = this.anchors.get(key);
    if (!a) {
      a = { mode: mode ?? "box" };
      this.anchors.set(key, a);
    }
    if (mode) a.mode = mode;
    return a;
  }

  setObject(key: string, mode: AnchorMode, obj: THREE.Object3D | null) {
    const a = this.get(key, mode);
    a.obj = obj ?? undefined;
    if (!a.obj && !a.el) this.anchors.delete(key);
    this.onChange();
  }

  /** 등록된 3D 물체 (카메라를 그 칸으로 옮길 때 쓴다) */
  object(key: string): THREE.Object3D | null {
    return this.anchors.get(key)?.obj ?? null;
  }

  setElement(key: string, el: HTMLElement | null, parent?: string) {
    const a = this.get(key);
    a.el = el ?? undefined;
    a.parent = parent;
    if (!a.obj && !a.el) this.anchors.delete(key);
    this.onChange();
  }

  /** 물체 위치를 화면 좌표로 옮긴다. width·height는 캔버스 CSS 크기. */
  sync(camera: THREE.Camera, width: number, height: number) {
    const origins = new Map<string, [number, number]>();
    // 바깥 요소(칸 영역)를 먼저 맞추고, 그 안의 요소(이름표·서랍 버튼)는 바깥 요소 기준으로 놓는다
    const ordered = [...this.anchors].sort(
      ([, a], [, b]) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)),
    );
    for (const [key, a] of ordered) {
      if (!a.obj || !a.el) continue;
      a.obj.updateWorldMatrix(true, true);
      box3.setFromObject(a.obj);
      if (box3.isEmpty()) continue;
      if (a.mode === "foot" || a.mode === "head") {
        if (a.mode === "foot") v.set((box3.min.x + box3.max.x) / 2, box3.min.y, box3.max.z);
        else v.set((box3.min.x + box3.max.x) / 2, box3.max.y, (box3.min.z + box3.max.z) / 2);
        v.project(camera);
        const behind = v.z > 1;
        const [ox, oy] = (a.parent && origins.get(a.parent)) || [0, 0];
        a.el.style.transform = `translate3d(${((v.x + 1) / 2) * width - ox}px, ${((1 - v.y) / 2) * height - oy}px, 0)`;
        a.el.style.visibility = behind ? "hidden" : "";
        a.el.dataset.anchor = a.mode;
        continue;
      }
      const { min, max } = box3;
      corners[0].set(min.x, min.y, min.z);
      corners[1].set(min.x, min.y, max.z);
      corners[2].set(min.x, max.y, min.z);
      corners[3].set(min.x, max.y, max.z);
      corners[4].set(max.x, min.y, min.z);
      corners[5].set(max.x, min.y, max.z);
      corners[6].set(max.x, max.y, min.z);
      corners[7].set(max.x, max.y, max.z);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const c of corners) {
        c.project(camera);
        const sx = ((c.x + 1) / 2) * width;
        const sy = ((1 - c.y) / 2) * height;
        x0 = Math.min(x0, sx);
        y0 = Math.min(y0, sy);
        x1 = Math.max(x1, sx);
        y1 = Math.max(y1, sy);
      }
      // 캔버스 밖으로 나간 부분은 잘라 낸다 (가로 스크롤이 생기지 않게)
      x0 = Math.max(0, x0);
      y0 = Math.max(0, y0);
      x1 = Math.min(width, x1);
      y1 = Math.min(height, y1);
      origins.set(key, [x0, y0]);
      const [px, py] = (a.parent && origins.get(a.parent)) || [0, 0];
      a.el.style.transform = `translate3d(${x0 - px}px, ${y0 - py}px, 0)`;
      a.el.style.width = `${Math.max(0, x1 - x0)}px`;
      a.el.style.height = `${Math.max(0, y1 - y0)}px`;
    }
  }
}

/** 지수 감쇠로 목표값에 다가간다 (프레임 속도와 상관없이 같은 빠르기) */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** 거의 다 왔으면 true (그만 그려도 된다) */
export function settled(current: number, target: number, eps = 1e-3): boolean {
  return Math.abs(current - target) < eps;
}
