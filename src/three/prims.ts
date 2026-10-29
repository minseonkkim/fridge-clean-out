import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * 장난감 같은 3D를 만드는 기본 도형. 재질·도형은 같은 값이면 하나를 함께 쓴다
 * (재료 200개가 있어도 GPU에 올라가는 재질·도형 수가 늘지 않게).
 */

type Vec = [number, number, number];

const materials = new Map<string, THREE.Material>();

/** 반들거리는 플라스틱 장난감 같은 재질 */
export function mat(
  color: string,
  opts: { rough?: number; metal?: number; opacity?: number; emissive?: string } = {},
) {
  const key = `${color}|${opts.rough ?? 0.5}|${opts.metal ?? 0}|${opts.opacity ?? 1}|${opts.emissive ?? ""}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.5,
      metalness: opts.metal ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? "#000000",
    });
    materials.set(key, m);
  }
  return m;
}

const geometries = new Map<string, THREE.BufferGeometry>();

function geo(key: string, make: () => THREE.BufferGeometry) {
  let g = geometries.get(key);
  if (!g) {
    g = make();
    geometries.set(key, g);
  }
  return g;
}

function place(
  mesh: THREE.Object3D,
  pos: Vec = [0, 0, 0],
  rot: Vec = [0, 0, 0],
  scale: Vec = [1, 1, 1],
) {
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.scale.set(...scale);
  return mesh;
}

function mesh(g: THREE.BufferGeometry, color: string | THREE.Material) {
  const m = new THREE.Mesh(g, typeof color === "string" ? mat(color) : color);
  m.castShadow = true;
  return m;
}

export function sphere(
  r: number,
  color: string | THREE.Material,
  pos?: Vec,
  scale?: Vec,
  rot?: Vec,
) {
  return place(
    mesh(
      geo("sphere", () => new THREE.SphereGeometry(1, 24, 16)),
      color,
    ),
    pos,
    rot,
    [r * (scale?.[0] ?? 1), r * (scale?.[1] ?? 1), r * (scale?.[2] ?? 1)],
  );
}

/** 반구 (뚜껑·버섯 갓) */
export function dome(r: number, color: string | THREE.Material, pos?: Vec, scale?: Vec, rot?: Vec) {
  return place(
    mesh(
      geo("dome", () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      color,
    ),
    pos,
    rot,
    [r * (scale?.[0] ?? 1), r * (scale?.[1] ?? 1), r * (scale?.[2] ?? 1)],
  );
}

export function cyl(
  rTop: number,
  rBottom: number,
  h: number,
  color: string | THREE.Material,
  pos?: Vec,
  rot?: Vec,
  seg = 20,
) {
  const k = `cyl|${rTop.toFixed(3)}|${rBottom.toFixed(3)}|${seg}`;
  return place(
    mesh(
      geo(k, () => new THREE.CylinderGeometry(rTop, rBottom, 1, seg)),
      color,
    ),
    pos,
    rot,
    [1, h, 1],
  );
}

export function cone(
  r: number,
  h: number,
  color: string | THREE.Material,
  pos?: Vec,
  rot?: Vec,
  seg = 16,
) {
  return place(
    mesh(
      geo(`cone|${seg}`, () => new THREE.ConeGeometry(1, 1, seg)),
      color,
    ),
    pos,
    rot,
    [r, h, r],
  );
}

export function box(
  w: number,
  h: number,
  d: number,
  color: string | THREE.Material,
  pos?: Vec,
  rot?: Vec,
  radius = 0.06,
) {
  const k = `rbox|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius}`;
  return place(
    mesh(
      geo(
        k,
        () => new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2) * 0.999),
      ),
      color,
    ),
    pos,
    rot,
  );
}

export function torus(
  r: number,
  tube: number,
  color: string | THREE.Material,
  pos?: Vec,
  rot?: Vec,
  arc = Math.PI * 2,
) {
  const k = `torus|${r}|${tube}|${arc.toFixed(3)}`;
  return place(
    mesh(
      geo(k, () => new THREE.TorusGeometry(r, tube, 12, 32, arc)),
      color,
    ),
    pos,
    rot,
  );
}

/** 단면을 돌려 만든 몸통 (병·그릇·달걀). points는 [반지름, 높이] */
export function lathe(
  points: [number, number][],
  color: string | THREE.Material,
  pos?: Vec,
  rot?: Vec,
  scale?: Vec,
) {
  const k = `lathe|${points.map((p) => p.map((v) => v.toFixed(3)).join(",")).join(";")}`;
  return place(
    mesh(
      geo(
        k,
        () =>
          new THREE.LatheGeometry(
            points.map(([x, y]) => new THREE.Vector2(x, y)),
            28,
          ),
      ),
      color,
    ),
    pos,
    rot,
    scale,
  );
}

/** 굽은 관 (바나나·대파·오징어 다리) */
export function tube(
  points: Vec[],
  radius: number,
  color: string | THREE.Material,
  closed = false,
) {
  const k = `tube|${points
    .flat()
    .map((v) => v.toFixed(3))
    .join(",")}|${radius}`;
  const g = geo(k, () => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 24, radius, 10, closed);
  });
  return mesh(g, color);
}

export function group(...children: THREE.Object3D[]) {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

export function at(obj: THREE.Object3D, pos: Vec, rot: Vec = [0, 0, 0], scale: Vec = [1, 1, 1]) {
  return place(obj, pos, rot, scale);
}

// ── 포장 라벨 ──────────────────────────────────

const labelCache = new Map<string, THREE.Texture | null>();

/**
 * 라벨 글자를 캔버스에 그려 재질로 쓴다 (한글 웹폰트를 내려받지 않고 기기 글꼴로).
 * 브라우저가 아니면(단위 테스트) 글자 없이 바탕색만 쓴다.
 */
export function labelMat(text: string, bg: string, fg: string): THREE.Material {
  const key = `${text}|${bg}|${fg}`;
  if (!labelCache.has(key)) {
    if (typeof document === "undefined" || !text) labelCache.set(key, null);
    else {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 128;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = fg;
      ctx.font = `800 ${text.length > 3 ? 46 : 64}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 68);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      labelCache.set(key, t);
    }
  }
  const tex = labelCache.get(key);
  const mk = `label|${key}`;
  let m = materials.get(mk);
  if (!m) {
    m = tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : mat(bg);
    materials.set(mk, m);
  }
  return m;
}

/** 원기둥 둘레에 두르는 라벨 (앞쪽 반만) */
export function labelSleeve(r: number, h: number, text: string, bg: string, fg: string, y: number) {
  const g = geo(
    `sleeve|${r.toFixed(3)}|${h.toFixed(3)}`,
    () => new THREE.CylinderGeometry(r, r, h, 24, 1, true, -Math.PI / 2, Math.PI),
  );
  return place(mesh(g, labelMat(text, bg, fg)), [0, y, 0]);
}

/** 상자 앞면에 붙이는 라벨 */
export function labelPlate(w: number, h: number, text: string, bg: string, fg: string, pos: Vec) {
  const g = geo(`plate|${w.toFixed(3)}|${h.toFixed(3)}`, () => new THREE.PlaneGeometry(w, h));
  return place(mesh(g, labelMat(text, bg, fg)), pos);
}
