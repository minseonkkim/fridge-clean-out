import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { tone } from "../data/ingredient-art/kit.ts";
import type { ArtSpec } from "../data/ingredient-art/specs.ts";
import {
  at,
  box,
  cone,
  cyl,
  dome,
  group,
  labelPlate,
  labelSleeve,
  lathe,
  mat,
  sphere,
  torus,
  tube,
} from "./prims.ts";

/**
 * 재료 설계도(ArtSpec)를 장난감 같은 3D 모델로 만든다.
 * 2D 일러스트와 같은 설계도를 써서 색·모양·라벨이 같다.
 * 모델은 가장 긴 변이 1이 되도록 줄이고 바닥(y=0)에 세운다.
 */

const GREEN = "#4caf50";
const BROWN = "#6b4423";
const WHITE = "#f7f5ee";

const PI = Math.PI;

function ballModel(o: Extract<ArtSpec, { part: "ball" }>) {
  const rx = (o.w ?? 22) / 22;
  const ry = (o.h ?? 21) / 22;
  const body = sphere(0.5, o.color, [0, 0.5 * ry, 0], [rx, ry, rx]);
  const parts: THREE.Object3D[] = [body];
  const top = ry;
  const tc = o.topColor ?? "#3f8f3a";
  if (o.pattern === "stripes")
    for (let i = 0; i < 6; i++)
      parts.push(
        sphere(
          0.5,
          o.patternColor ?? tone(o.color, -0.25),
          [0, 0.5 * ry, 0],
          [rx * 0.18, ry * 1.01, rx * 1.01],
          [0, (i * PI) / 6, 0],
        ),
      );
  if (o.pattern === "ribs")
    for (let i = 0; i < 4; i++)
      parts.push(
        sphere(
          0.5,
          tone(o.color, -0.12),
          [0, 0.5 * ry, 0],
          [rx * 0.06, ry * 1.005, rx * 1.005],
          [0, (i * PI) / 4, 0],
        ),
      );
  switch (o.top) {
    case "stem":
      parts.push(cyl(0.03, 0.04, 0.18, BROWN, [0.02, top + 0.05, 0], [0, 0, -0.3]));
      break;
    case "stemLeaf":
      parts.push(cyl(0.03, 0.04, 0.18, BROWN, [0.02, top + 0.05, 0], [0, 0, -0.3]));
      parts.push(sphere(0.14, tc, [0.13, top + 0.06, 0], [1, 0.25, 0.5], [0, 0, 0.5]));
      break;
    case "calyx":
      for (let i = 0; i < 5; i++)
        parts.push(
          sphere(
            0.12,
            tc,
            [Math.cos((i * 2 * PI) / 5) * 0.09, top - 0.01, Math.sin((i * 2 * PI) / 5) * 0.09],
            [1, 0.2, 0.35],
            [0, (-i * 2 * PI) / 5, 0],
          ),
        );
      parts.push(cyl(0.025, 0.03, 0.08, tone(tc, -0.2), [0, top + 0.03, 0]));
      break;
    case "persimmon":
      parts.push(cyl(0.18, 0.2, 0.04, tc, [0, top - 0.01, 0], [0, 0, 0], 6));
      parts.push(cyl(0.025, 0.03, 0.08, BROWN, [0, top + 0.05, 0]));
      break;
    case "onion":
      parts.push(cone(0.08, 0.22, tone(o.color, -0.1), [0, top + 0.08, 0]));
      break;
    case "tuft":
      for (let i = -1; i <= 1; i++)
        parts.push(cyl(0.02, 0.025, 0.35, tc, [i * 0.06, top + 0.15, 0], [0, 0, i * 0.4]));
      break;
    case "crown":
      for (let i = 0; i < 6; i++)
        parts.push(
          cone(
            0.06,
            0.32,
            tc,
            [Math.cos(i) * 0.06, top + 0.14, Math.sin(i) * 0.06],
            [Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4],
          ),
        );
      break;
  }
  return group(...parts);
}

function longModel(o: Extract<ArtSpec, { part: "long" }>) {
  const L = (o.length ?? 44) / 44;
  const r = ((o.thick ?? 8) / 44) * 0.9;
  const bend = (o.bend ?? 0) * 0.18;
  const parts: THREE.Object3D[] = [];
  if (o.tip === "point" && !bend) {
    parts.push(cone(r, L, o.color, [0, 0, 0], [0, 0, -PI / 2]));
  } else {
    parts.push(
      tube(
        [
          [-L / 2, 0, 0],
          [0, bend, 0],
          [L / 2, 0, 0],
        ],
        r,
        o.color,
      ),
    );
    parts.push(sphere(r, o.color, [-L / 2, 0, 0]));
    parts.push(sphere(o.tip === "point" ? r * 0.35 : r, o.color, [L / 2, 0, 0]));
  }
  if (o.endColor)
    parts.push(
      cyl(r * 1.03, r * 1.03, L * 0.3, o.endColor, [-L * 0.32, bend * 0.4, 0], [0, 0, PI / 2]),
    );
  if (o.rings)
    for (const p of [-0.25, -0.05, 0.15, 0.32])
      parts.push(
        torus(
          r * (o.tip === "point" && !bend ? 0.5 - p : 0.98),
          r * 0.06,
          tone(o.color, -0.25),
          [p * L, bend * (1 - Math.abs(p) * 2), 0],
          [0, PI / 2, 0],
        ),
      );
  const tc = o.topColor ?? "#3f8f3a";
  const x0 = o.tip === "point" && !bend ? L / 2 : -L / 2;
  const dir = o.tip === "point" && !bend ? 1 : -1;
  if (o.top === "leaves")
    for (let i = -1; i <= 1; i++)
      parts.push(
        cyl(
          0.02,
          0.03,
          0.35,
          tc,
          [x0 + dir * 0.15, i * 0.05, 0],
          [0, 0, (dir * PI) / 2 + i * 0.35],
        ),
      );
  if (o.top === "stem")
    parts.push(cyl(0.03, 0.04, 0.12, tc, [x0 + dir * 0.05, 0, 0], [0, 0, PI / 2]));
  if (o.top === "cap")
    parts.push(cone(r * 1.15, 0.12, tc, [x0 + dir * 0.02, 0, 0], [0, 0, (-dir * PI) / 2]));
  const g = group(...parts);
  g.rotation.z = 0.12;
  return g;
}

function leafHeadModel(o: Extract<ArtSpec, { part: "leafHead" }>) {
  const c = o.color;
  if (o.kind === "napa" || o.kind === "bokchoy") {
    const stalk = o.kind === "bokchoy" ? tone(c, 0.55) : "#f4f1dc";
    return group(
      cyl(0.16, 0.2, 0.55, stalk, [0, 0.27, 0]),
      sphere(0.24, c, [0, 0.7, 0], [0.9, 1.4, 0.9]),
      sphere(0.2, tone(c, -0.08), [-0.1, 0.62, 0.05], [0.6, 1.4, 0.6], [0, 0, 0.3]),
      sphere(0.2, tone(c, 0.08), [0.1, 0.62, -0.05], [0.6, 1.4, 0.6], [0, 0, -0.3]),
    );
  }
  if (o.kind === "frilly")
    return group(
      sphere(0.28, tone(c, -0.08), [-0.18, 0.26, 0], [1, 0.75, 1]),
      sphere(0.28, c, [0.18, 0.26, 0.02], [1, 0.75, 1]),
      sphere(0.3, tone(c, 0.1), [0, 0.4, -0.05], [1, 0.8, 1]),
      torus(0.3, 0.05, tone(c, 0.15), [0, 0.3, 0], [PI / 2, 0, 0]),
    );
  return group(
    sphere(0.45, c, [0, 0.45, 0]),
    sphere(0.3, o.inner ?? tone(c, 0.45), [0, 0.62, 0.22], [1, 0.9, 0.5]),
    sphere(0.46, tone(c, -0.1), [0, 0.42, 0], [1.04, 0.75, 1.04]),
  );
}

function bunchModel(o: Extract<ArtSpec, { part: "bunch" }>) {
  const n = o.count ?? 5;
  const parts: THREE.Object3D[] = [];
  const stem = o.stem ?? tone(o.color, 0.35);
  const leafScale: [number, number, number] =
    o.leafShape === "thin"
      ? [0.18, 1, 0.06]
      : o.leafShape === "tiny"
        ? [0.15, 0.7, 0.06]
        : o.leafShape === "heart"
          ? [0.55, 0.6, 0.06]
          : [0.42, 0.75, 0.06];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const ang = -0.7 + t * 1.4;
    const col = tone(o.color, i % 2 ? -0.08 : 0.06);
    parts.push(cyl(0.02, 0.025, 0.35, stem, [Math.sin(ang) * 0.06, 0.17, 0], [0, 0, -ang * 0.3]));
    parts.push(
      sphere(0.32, col, [Math.sin(ang) * 0.28, 0.6, (i % 2) * 0.06 - 0.03], leafScale, [
        0.15,
        0,
        -ang,
      ]),
    );
  }
  if (o.tie) parts.push(torus(0.07, 0.025, o.tie, [0, 0.14, 0], [PI / 2, 0, 0]));
  return group(...parts);
}

function stalksModel(o: Extract<ArtSpec, { part: "stalks" }>) {
  const n = o.count ?? 5;
  const r = Math.max(0.012, ((o.thick ?? 3.2) / 64) * 0.55);
  const parts: THREE.Object3D[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * r * 2.4;
    const lean = (i - (n - 1) / 2) * 0.05;
    const h = 0.9 - (i % 2) * 0.08;
    parts.push(cyl(r, r, h * 0.6, o.color, [x + lean * 0.3, h * 0.6, 0], [0, 0, -lean]));
    parts.push(cyl(r, r, h * 0.4, o.base ?? tone(o.color, 0.6), [x, h * 0.2, 0]));
    if (o.head === "sprout" || o.head === "enoki")
      parts.push(
        sphere(r * 1.8, o.headColor ?? "#f5d76e", [x + lean * 0.6, h * 0.92, 0], [1, 1.3, 1]),
      );
    if (o.head === "tip")
      parts.push(
        cone(r * 1.3, 0.1, o.headColor ?? tone(o.color, -0.2), [x + lean * 0.6, h * 0.95, 0]),
      );
  }
  if (o.tie) parts.push(torus(r * n * 1.3, 0.025, o.tie, [0, 0.3, 0], [PI / 2, 0, 0]));
  return group(...parts);
}

function mushroomModel(o: Extract<ArtSpec, { part: "mushroom" }>) {
  const stem = o.stem ?? "#efe6d2";
  const one = (x: number, z: number, s: number) =>
    group(
      cyl(0.08 * s, 0.1 * s, 0.4 * s, stem, [x, 0.2 * s, z]),
      dome(0.25 * s, o.cap, [x, 0.38 * s, z], [1, 0.7, 1]),
    );
  switch (o.kind) {
    case "king":
      return group(
        cyl(0.2, 0.22, 0.8, stem, [0, 0.4, 0]),
        dome(0.26, o.cap, [0, 0.78, 0], [1, 0.6, 1]),
      );
    case "cluster":
      return group(
        one(-0.2, 0, 0.9),
        one(0.2, 0.05, 0.85),
        one(0, -0.15, 1.1),
        one(0.05, 0.18, 0.75),
      );
    case "oyster":
      return group(
        cyl(0.05, 0.08, 0.3, stem, [0, 0.15, 0]),
        sphere(0.3, o.cap, [-0.12, 0.35, 0], [1, 0.25, 0.8], [0, 0, 0.3]),
        sphere(0.28, tone(o.cap, 0.08), [0.14, 0.42, 0.05], [1, 0.25, 0.8], [0, 0, -0.3]),
      );
    case "flat":
      return group(
        cyl(0.1, 0.13, 0.45, stem, [0, 0.22, 0]),
        dome(0.42, o.cap, [0, 0.42, 0], [1, 0.45, 1]),
      );
    default:
      return group(
        cyl(0.12, 0.15, 0.45, stem, [0, 0.22, 0]),
        dome(0.38, o.cap, [0, 0.4, 0], [1, 0.8, 1]),
      );
  }
}

function rootModel(o: Extract<ArtSpec, { part: "root" }>) {
  const c = o.color;
  switch (o.kind) {
    case "garlic":
      return group(
        lathe(
          [
            [0, 0],
            [0.3, 0.08],
            [0.42, 0.3],
            [0.32, 0.6],
            [0.06, 0.82],
            [0.02, 0.95],
          ],
          c,
        ),
        ...[0, 1, 2, 3].map((i) =>
          sphere(0.42, tone(c, -0.06), [0, 0.33, 0], [0.12, 0.75, 1.0], [0, (i * PI) / 4, 0]),
        ),
      );
    case "ginger":
      return group(
        sphere(0.25, c, [-0.25, 0.2, 0], [1.3, 0.8, 0.9]),
        sphere(0.2, tone(c, 0.05), [0.12, 0.22, 0.08], [1, 0.9, 0.9]),
        sphere(0.18, tone(c, -0.05), [0.32, 0.3, -0.05], [1, 1.2, 0.9]),
      );
    case "sweet":
      return group(
        sphere(0.5, c, [0, 0.22, 0], [1, 0.45, 0.45]),
        cone(0.06, 0.15, tone(c, -0.3), [0.55, 0.22, 0], [0, 0, -PI / 2]),
      );
    case "taro":
      return group(
        sphere(0.35, c, [0, 0.4, 0], [0.9, 1.15, 0.9]),
        ...[0.22, 0.4, 0.58].map((y) =>
          torus(0.29, 0.02, tone(c, -0.3), [0, y, 0], [PI / 2, 0, 0]),
        ),
      );
    default:
      return group(
        sphere(0.45, c, [0, 0.3, 0], [1.2, 0.7, 0.95]),
        sphere(0.3, tone(c, 0.05), [0.3, 0.35, 0.1], [1, 0.8, 0.9]),
      );
  }
}

function berriesModel(o: Extract<ArtSpec, { part: "berries" }>) {
  const c = o.color;
  switch (o.kind) {
    case "strawberry":
      return group(
        lathe(
          [
            [0, 0],
            [0.18, 0.12],
            [0.32, 0.4],
            [0.3, 0.62],
            [0, 0.66],
          ],
          c,
        ),
        ...[0, 1, 2, 3, 4].map((i) =>
          sphere(
            0.12,
            GREEN,
            [Math.cos(i * 1.26) * 0.12, 0.66, Math.sin(i * 1.26) * 0.12],
            [1, 0.2, 0.4],
            [0, -i * 1.26, 0],
          ),
        ),
      );
    case "cherry":
      return group(
        sphere(0.22, c, [-0.22, 0.22, 0]),
        sphere(0.22, c, [0.22, 0.22, 0]),
        tube(
          [
            [-0.2, 0.4, 0],
            [-0.05, 0.75, 0],
            [0.05, 0.9, 0],
          ],
          0.02,
          "#5d7b2e",
        ),
        tube(
          [
            [0.2, 0.4, 0],
            [0.1, 0.75, 0],
            [0.05, 0.9, 0],
          ],
          0.02,
          "#5d7b2e",
        ),
      );
    case "jujube":
      return group(
        sphere(0.2, c, [-0.18, 0.2, 0], [0.9, 1.1, 0.9]),
        sphere(0.2, c, [0.2, 0.2, 0.05], [0.9, 1.1, 0.9]),
        sphere(0.2, tone(c, 0.05), [0, 0.45, -0.05], [0.9, 1.1, 0.9]),
      );
    case "grape": {
      const pts: [number, number, number][] = [];
      for (let row = 0; row < 4; row++) {
        const n = 4 - row;
        for (let i = 0; i < n; i++)
          pts.push([(i - (n - 1) / 2) * 0.2, 0.75 - row * 0.17, (row % 2) * 0.06]);
      }
      return group(
        ...pts.map((p) => sphere(0.11, c, p)),
        cyl(0.02, 0.025, 0.16, BROWN, [0, 0.92, 0]),
      );
    }
    case "blueberry":
      return group(
        ...[
          [-0.2, 0.12, 0],
          [0.18, 0.12, 0.05],
          [0, 0.12, -0.18],
          [0, 0.3, 0],
          [0.02, 0.12, 0.2],
        ].map((p) => sphere(0.14, c, p as [number, number, number])),
      );
    default:
      return group(
        sphere(0.2, c, [-0.2, 0.2, 0]),
        sphere(0.2, c, [0.2, 0.2, 0.05]),
        sphere(0.2, c, [0, 0.48, 0]),
        ...[
          [-0.2, 0.4, 0],
          [0.2, 0.4, 0.05],
          [0, 0.68, 0],
        ].map((p) => sphere(0.04, GREEN, p as [number, number, number], [1, 0.4, 1])),
      );
  }
}

function meatModel(o: Extract<ArtSpec, { part: "meat" }>) {
  const c = o.color;
  if (o.shape === "mince")
    return group(
      ...[
        [-0.15, 0.15, 0],
        [0.15, 0.15, 0.05],
        [0, 0.18, -0.12],
        [0, 0.3, 0.05],
        [0.2, 0.12, -0.15],
      ].map((p) => sphere(0.18, tone(c, p[0] * 0.5), p as [number, number, number])),
    );
  if (o.shape === "strips")
    return group(
      ...[0, 1, 2].map((i) =>
        box(
          0.9,
          0.06,
          0.16,
          c,
          [0, 0.04 + i * 0.07, -0.18 + i * 0.18],
          [0, 0, (i - 1) * 0.05],
          0.02,
        ),
      ),
      ...[0, 1, 2].map((i) =>
        box(
          0.9,
          0.065,
          0.04,
          o.fat === "none" ? tone(c, 0.2) : "#fbefe6",
          [0, 0.04 + i * 0.07, -0.18 + i * 0.18 + 0.05],
          [0, 0, (i - 1) * 0.05],
          0.015,
        ),
      ),
    );
  const round = o.shape === "round";
  const parts: THREE.Object3D[] = [
    round
      ? sphere(0.45, c, [0, 0.16, 0], [1, 0.35, 0.8])
      : box(0.95, 0.28, 0.65, c, [0, 0.14, 0], [0, 0, 0], 0.1),
  ];
  if (o.fat === "layers")
    for (const y of [0.08, 0.18])
      parts.push(box(0.96, 0.035, 0.66, "#fbefe6", [0, y, 0], [0, 0, 0], 0.015));
  if (o.fat === "marble")
    for (let i = 0; i < 5; i++)
      parts.push(
        sphere(
          0.12,
          "#fbefe6",
          [-0.3 + i * 0.15, 0.28, -0.15 + (i % 2) * 0.25],
          [1.4, 0.08, 0.3],
          [0, i, 0],
        ),
      );
  if (o.fat === "edge")
    parts.push(
      round
        ? torus(0.42, 0.04, "#fbefe6", [0, 0.17, 0], [PI / 2, 0, 0], PI)
        : box(0.97, 0.29, 0.08, "#fbefe6", [0, 0.14, -0.3], [0, 0, 0], 0.03),
    );
  if (o.crumbs)
    for (let i = 0; i < 18; i++)
      parts.push(
        sphere(0.03, tone(c, i % 2 ? 0.3 : -0.2), [
          -0.35 + (i % 6) * 0.14,
          0.32,
          -0.2 + Math.floor(i / 6) * 0.2,
        ]),
      );
  if (o.bone)
    parts.push(
      cyl(0.05, 0.05, 0.5, WHITE, [0.55, 0.15, 0], [0, 0, PI / 2]),
      sphere(0.07, WHITE, [0.8, 0.15, 0.05]),
      sphere(0.07, WHITE, [0.8, 0.15, -0.05]),
    );
  return group(...parts);
}

function chickenModel(o: Extract<ArtSpec, { part: "chicken" }>) {
  const skin = o.color ?? "#f2c9a0";
  switch (o.kind) {
    case "breast":
      return group(sphere(0.45, skin, [0, 0.15, 0], [1, 0.32, 0.7]));
    case "gizzard":
      return group(
        sphere(0.22, "#a8463d", [-0.2, 0.18, 0], [1, 0.8, 0.9]),
        sphere(0.22, "#9c3f37", [0.2, 0.18, 0.05], [1, 0.8, 0.9]),
      );
    case "whole":
      return group(
        sphere(0.42, skin, [0, 0.35, 0], [1.1, 0.8, 0.85]),
        sphere(0.15, skin, [0.38, 0.2, 0.25], [1.4, 0.8, 0.8], [0, -0.4, 0]),
        sphere(0.15, skin, [0.38, 0.2, -0.25], [1.4, 0.8, 0.8], [0, 0.4, 0]),
        sphere(0.05, WHITE, [0.58, 0.18, 0.32]),
        sphere(0.05, WHITE, [0.58, 0.18, -0.32]),
      );
    case "wing":
      return group(
        sphere(0.25, skin, [-0.2, 0.15, 0], [1.2, 0.5, 0.7]),
        sphere(0.22, skin, [0.22, 0.15, 0.05], [1.3, 0.45, 0.6], [0, 0.5, 0]),
      );
    default:
      return group(
        sphere(0.3, skin, [-0.15, 0.25, 0], [1.2, 0.85, 0.85]),
        cyl(0.05, 0.05, 0.5, WHITE, [0.3, 0.2, 0], [0, 0, PI / 2 - 0.25]),
        sphere(0.07, WHITE, [0.55, 0.15, 0.04]),
        sphere(0.07, WHITE, [0.55, 0.15, -0.04]),
      );
  }
}

function fishModel(o: Extract<ArtSpec, { part: "fish" }>) {
  const L = o.long ? 1.25 : 1;
  const h = o.slim ? 0.14 : 0.22;
  const belly = o.belly ?? "#eef2f4";
  const parts: THREE.Object3D[] = [
    sphere(0.42 * L, o.body, [0, h, 0], [1, h / (0.42 * L), 0.12 / (0.42 * L)]),
    sphere(0.4 * L, belly, [0, h * 0.85, 0], [0.95, (h * 0.75) / (0.4 * L), 0.125 / (0.4 * L)]),
    cone(0.16, 0.22, tone(o.body, -0.1), [0.5 * L, h, 0], [0, 0, PI / 2], 4),
    sphere(0.035, "#ffffff", [-0.32 * L, h * 1.1, 0.09]),
    sphere(0.02, "#222222", [-0.33 * L, h * 1.1, 0.11]),
  ];
  if (o.pattern === "stripes")
    for (let i = 0; i < 5; i++)
      parts.push(
        box(
          0.03,
          h * 0.7,
          0.26,
          tone(o.body, -0.45),
          [-0.2 * L + i * 0.1 * L, h * 1.35, 0],
          [0, 0, 0.3],
          0.01,
        ),
      );
  return group(...parts);
}

function shellModel(o: Extract<ArtSpec, { part: "shell" }>) {
  const c = o.color;
  switch (o.kind) {
    case "mussel":
      return group(sphere(0.45, c, [0, 0.15, 0], [1, 0.32, 0.45], [0, 0.3, 0]));
    case "oyster":
      return group(
        sphere(0.45, "#9aa3a0", [0, 0.1, 0], [1, 0.22, 0.75]),
        sphere(0.32, c, [0, 0.17, 0], [1, 0.15, 0.7]),
      );
    case "abalone":
      return group(
        sphere(0.45, c, [0, 0.12, 0], [1, 0.3, 0.72]),
        sphere(0.25, "#e8d8b0", [0.05, 0.19, 0], [1, 0.3, 0.7]),
      );
    case "scallop":
      return group(
        dome(0.45, c, [0, 0.02, 0], [1, 0.35, 0.9]),
        ...[0, 1, 2, 3, 4, 5].map((i) =>
          box(
            0.04,
            0.03,
            0.45,
            tone(c, -0.2),
            [-0.3 + i * 0.12, 0.12, 0],
            [0, (i - 2.5) * 0.15, 0],
            0.01,
          ),
        ),
      );
    default:
      return group(
        ...[
          [-0.22, 0],
          [0.18, 0.08],
          [0, -0.2],
        ].map(([x, z]) => dome(0.24, c, [x, 0.02, z], [1, 0.6, 0.85])),
      );
  }
}

function bottleModel(o: Extract<ArtSpec, { part: "bottle" }>) {
  const body = o.body;
  const cap = o.cap ?? "#c62828";
  const profiles: Record<string, [number, number][]> = {
    tall: [
      [0, 0],
      [0.22, 0],
      [0.24, 0.05],
      [0.24, 0.58],
      [0.14, 0.72],
      [0.09, 0.82],
      [0.09, 0.9],
      [0, 0.9],
    ],
    round: [
      [0, 0],
      [0.3, 0.02],
      [0.36, 0.25],
      [0.3, 0.52],
      [0.12, 0.66],
      [0.1, 0.74],
      [0, 0.74],
    ],
    squeeze: [
      [0, 0],
      [0.26, 0],
      [0.28, 0.06],
      [0.28, 0.6],
      [0.22, 0.7],
      [0.12, 0.76],
      [0, 0.76],
    ],
    beer: [
      [0, 0],
      [0.2, 0],
      [0.22, 0.05],
      [0.22, 0.5],
      [0.08, 0.72],
      [0.07, 0.95],
      [0, 0.95],
    ],
    wine: [
      [0, 0],
      [0.2, 0],
      [0.22, 0.05],
      [0.22, 0.55],
      [0.08, 0.7],
      [0.07, 0.95],
      [0, 0.95],
    ],
    small: [
      [0, 0],
      [0.18, 0],
      [0.2, 0.05],
      [0.2, 0.42],
      [0.1, 0.55],
      [0.07, 0.62],
      [0, 0.62],
    ],
  };
  const prof = profiles[o.shape ?? "tall"];
  const top = prof[prof.length - 1][1];
  const r = Math.max(...prof.map((p) => p[0]));
  return group(
    lathe(prof, mat(body, { rough: 0.25 })),
    cyl(o.shape === "squeeze" ? 0.12 : 0.1, o.shape === "squeeze" ? 0.14 : 0.1, 0.12, cap, [
      0,
      top + 0.05,
      0,
    ]),
    labelSleeve(
      r * 1.02,
      top * 0.32,
      o.text ?? "",
      o.label ?? "#ffffff",
      o.textColor ?? tone(body, -0.4),
      top * 0.33,
    ),
  );
}

function boxPack(
  w: number,
  h: number,
  d: number,
  color: string,
  text: string,
  fg: string,
  labelBg = "#ffffff",
) {
  return group(
    box(w, h, d, color, [0, h / 2, 0]),
    labelPlate(w * 0.8, h * 0.4, text, labelBg, fg, [0, h * 0.5, d / 2 + 0.005]),
  );
}

function modelFor(spec: ArtSpec): THREE.Object3D {
  switch (spec.part) {
    case "ball":
      return ballModel(spec);
    case "long":
      return longModel(spec);
    case "leafHead":
      return leafHeadModel(spec);
    case "bunch":
      return bunchModel(spec);
    case "stalks":
      return stalksModel(spec);
    case "mushroom":
      return mushroomModel(spec);
    case "root":
      return rootModel(spec);
    case "floret": {
      const stem = spec.stem ?? tone(spec.color, 0.35);
      return group(
        cyl(0.1, 0.13, 0.4, stem, [0, 0.2, 0]),
        ...[
          [0, 0.55, 0, 0.22],
          [-0.2, 0.45, 0.05, 0.18],
          [0.2, 0.45, -0.05, 0.18],
          [0.05, 0.45, 0.2, 0.17],
          [-0.05, 0.45, -0.2, 0.17],
        ].map(([x, y, z, r]) => sphere(r, spec.color, [x, y, z])),
      );
    }
    case "berries":
      return berriesModel(spec);
    case "wedge":
      return group(
        at(
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.18, 24, 1, false, 0, PI / 2.5),
            mat(spec.rind),
          ),
          [0, 0.09, 0],
        ),
        at(
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.44, 0.44, 0.185, 24, 1, false, 0, PI / 2.5),
            mat(spec.flesh),
          ),
          [0, 0.09, 0],
        ),
      );
    case "banana":
      return group(
        ...[0, 1, 2].map((i) => {
          const t = tube(
            [
              [-0.45, 0.25, 0],
              [0, 0.05, 0],
              [0.45, 0.25, 0],
            ],
            0.08,
            spec.color,
          );
          return at(t, [0, i * 0.06, -0.12 + i * 0.12], [0, 0, 0], [1, 1, 1]);
        }),
        cyl(0.04, 0.05, 0.12, BROWN, [0.48, 0.32, 0], [0, 0, -0.6]),
      );
    case "lemon":
      return group(
        sphere(0.4, spec.color, [0, 0.3, 0], [1.2, 0.75, 0.75]),
        sphere(0.06, tone(spec.color, -0.1), [0.48, 0.3, 0]),
        sphere(0.06, tone(spec.color, -0.1), [-0.48, 0.3, 0]),
      );
    case "avocado":
      return group(
        lathe(
          [
            [0, 0],
            [0.3, 0.08],
            [0.34, 0.3],
            [0.22, 0.6],
            [0.12, 0.78],
            [0, 0.8],
          ],
          "#3b5a1e",
        ),
      );
    case "corn":
      return group(
        sphere(0.45, "#f2c13b", [0, 0.18, 0], [1, 0.38, 0.38]),
        sphere(0.45, "#7cb342", [-0.12, 0.15, 0.08], [0.9, 0.3, 0.3], [0, 0.25, 0]),
        sphere(0.45, "#8bc34a", [-0.12, 0.15, -0.08], [0.9, 0.3, 0.3], [0, -0.25, 0]),
      );
    case "pumpkin":
      return group(
        ...[0, 1, 2, 3, 4].map((i) =>
          sphere(
            0.3,
            spec.color,
            [Math.cos((i * 2 * PI) / 5) * 0.16, 0.3, Math.sin((i * 2 * PI) / 5) * 0.16],
            [0.75, 1, 0.75],
          ),
        ),
        cyl(0.04, 0.05, 0.15, "#5d4527", [0, 0.62, 0]),
      );
    case "meat":
      return meatModel(spec);
    case "chicken":
      return chickenModel(spec);
    case "fish":
      return fishModel(spec);
    case "fillet":
      return group(
        box(0.9, 0.22, 0.5, spec.color, [0, 0.11, 0], [0, 0, 0], 0.08),
        ...[0, 1, 2, 3].map((i) =>
          box(
            0.03,
            0.225,
            0.5,
            spec.lines ?? "#fff3e6",
            [-0.3 + i * 0.2, 0.11, 0],
            [0, 0.3, 0],
            0.01,
          ),
        ),
        ...(spec.skin ? [box(0.9, 0.04, 0.5, spec.skin, [0, 0.02, 0], [0, 0, 0], 0.02)] : []),
      );
    case "shell":
      return shellModel(spec);
    case "shrimp":
      return group(
        at(
          torus(0.25, 0.09, spec.color ?? "#f08a5d", [0, 0.3, 0], [0, 0, 0], PI * 1.4),
          [0, 0.3, 0],
          [0, 0, PI * 0.8],
        ),
        cone(0.1, 0.15, tone(spec.color ?? "#f08a5d", -0.1), [0.1, 0.1, 0], [0, 0, PI / 2], 3),
      );
    case "cephalopod":
      return group(
        spec.kind === "squid"
          ? cone(0.2, 0.55, spec.color, [0, 0.68, 0])
          : sphere(0.26, spec.color, [0, 0.55, 0], [1, 1.1, 1]),
        ...[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i * 2 * PI) / 6;
          return tube(
            [
              [Math.cos(a) * 0.08, 0.38, Math.sin(a) * 0.08],
              [Math.cos(a) * 0.25, 0.15, Math.sin(a) * 0.25],
              [Math.cos(a) * 0.38, 0.03, Math.sin(a) * 0.38],
            ],
            0.03,
            spec.color,
          );
        }),
      );
    case "crab": {
      const c = spec.color ?? "#e5533d";
      return group(
        sphere(0.38, c, [0, 0.2, 0], [1, 0.4, 0.75]),
        ...[-1, 1].flatMap((s) =>
          [0, 1, 2].map((i) =>
            cyl(
              0.025,
              0.02,
              0.35,
              tone(c, -0.1),
              [s * 0.4, 0.12, -0.15 + i * 0.15],
              [0, 0, s * 1.1],
            ),
          ),
        ),
        sphere(0.12, c, [-0.2, 0.3, 0.38], [1, 0.7, 1]),
        sphere(0.12, c, [0.2, 0.3, 0.38], [1, 0.7, 1]),
      );
    }
    case "smallFry":
      return group(
        ...[
          [-0.25, 0.04, 0, 0.3],
          [0.1, 0.04, 0.15, -0.4],
          [0.2, 0.04, -0.15, 0.8],
          [-0.05, 0.1, -0.05, 1.5],
        ].map(([x, y, z, r]) =>
          spec.kind === "anchovy"
            ? sphere(0.2, spec.color, [x, y, z], [1, 0.12, 0.2], [0, r, 0])
            : torus(0.08, 0.035, spec.color, [x, y + 0.03, z], [PI / 2, 0, r], PI * 1.3),
        ),
      );
    case "seaweed":
      if (spec.kind === "sheet")
        return group(
          box(0.8, 0.04, 0.8, spec.color, [0, 0.02, 0], [0, 0.2, 0], 0.01),
          box(0.8, 0.04, 0.8, tone(spec.color, -0.1), [0.03, 0.06, 0.03], [0, -0.1, 0], 0.01),
        );
      if (spec.kind === "kelp")
        return group(box(0.9, 0.05, 0.5, spec.color, [0, 0.03, 0], [0, 0, 0.05], 0.02));
      if (spec.kind === "fuzzy")
        return group(sphere(0.42, spec.color, [0, 0.18, 0], [1, 0.42, 0.85]));
      return group(
        ...[0, 1, 2, 3].map((i) =>
          tube(
            [
              [-0.3 + i * 0.18, 0.02, -0.2],
              [-0.2 + i * 0.18, 0.05, 0],
              [-0.3 + i * 0.18, 0.02, 0.2],
            ],
            0.04,
            tone(spec.color, i % 2 ? 0.1 : -0.05),
          ),
        ),
      );
    case "eggs": {
      const egg = (x: number, z: number, s: number) =>
        lathe(
          [
            [0, 0],
            [0.16, 0.05],
            [0.2, 0.2],
            [0.15, 0.38],
            [0, 0.45],
          ].map(([r, y]) => [r * s, y * s] as [number, number]),
          spec.color,
          [x, 0, z],
        );
      return spec.count === 3 || spec.spots
        ? group(egg(-0.18, 0, 0.75), egg(0.18, 0.05, 0.75), egg(0, -0.18, 0.75))
        : group(egg(-0.15, 0, 1), egg(0.17, 0.05, 1));
    }
    case "block":
      switch (spec.kind) {
        case "wedge":
          return group(
            at(
              new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 3), mat(spec.color)),
              [0, 0.18, 0],
              [0, PI / 6, 0],
            ),
          );
        case "slice":
          return group(
            box(0.7, 0.04, 0.7, spec.color, [0, 0.02, 0], [0, 0.15, 0], 0.01),
            box(0.7, 0.04, 0.7, tone(spec.color, -0.06), [0, 0.06, 0], [0, -0.1, 0], 0.01),
          );
        case "butter":
          return group(
            box(0.8, 0.3, 0.4, spec.wrap ?? "#f2f2f2", [0.1, 0.15, 0]),
            box(0.35, 0.3, 0.4, spec.color, [-0.32, 0.15, 0]),
            labelPlate(
              0.4,
              0.15,
              spec.text ?? "",
              spec.wrap ?? "#ffffff",
              "#c62828",
              [0.1, 0.15, 0.205],
            ),
          );
        case "tofu":
          return group(box(0.75, 0.35, 0.55, spec.color, [0, 0.18, 0], [0, 0, 0], 0.04));
        case "ball":
          return group(sphere(0.4, spec.color, [0, 0.4, 0]));
        case "stick":
          return group(cyl(0.1, 0.1, 0.9, spec.color, [0, 0.1, 0], [0, 0, PI / 2]));
        default:
          return group(
            cyl(0.35, 0.3, 0.5, spec.wrap ?? "#ffffff", [0, 0.25, 0]),
            cyl(0.36, 0.36, 0.06, spec.color, [0, 0.52, 0]),
          );
      }
    case "bowl": {
      const bowlColor = spec.bowl ?? "#e8eef2";
      return group(
        lathe(
          [
            [0.2, 0],
            [0.38, 0.1],
            [0.45, 0.32],
            [0.43, 0.33],
            [0.36, 0.12],
            [0, 0.1],
          ],
          bowlColor,
        ),
        dome(0.42, spec.content, [0, 0.28, 0], [1, 0.4, 1]),
        ...(spec.grain === "bean" || spec.grain === "natto"
          ? [
              [-0.15, 0.4, 0],
              [0.12, 0.42, 0.08],
              [0, 0.44, -0.12],
              [0.18, 0.38, -0.15],
            ].map((p) => sphere(0.07, tone(spec.content, 0.15), p as [number, number, number]))
          : []),
      );
    }
    case "noodles":
      if (spec.kind === "wavy" || spec.kind === "round")
        return group(
          sphere(0.42, spec.color, [0, 0.2, 0], [1, 0.45, 0.8]),
          torus(0.3, 0.04, tone(spec.color, -0.15), [0, 0.32, 0], [PI / 2, 0, 0]),
        );
      return group(
        ...Array.from({ length: spec.kind === "thick" ? 7 : 12 }, (_, i) =>
          cyl(
            spec.kind === "thick" ? 0.04 : 0.02,
            spec.kind === "thick" ? 0.04 : 0.02,
            0.95,
            tone(spec.color, i % 2 ? -0.05 : 0.05),
            [(i % 4) * 0.05 - 0.08, 0.06 + Math.floor(i / 4) * 0.05, (i % 3) * 0.05 - 0.05],
            [0, 0, PI / 2],
          ),
        ),
        ...(spec.kind === "dry"
          ? [torus(0.13, 0.03, spec.tie ?? "#c62828", [0, 0.1, 0], [0, PI / 2, 0])]
          : []),
      );
    case "bread": {
      const crust = spec.color ?? "#c98b4a";
      switch (spec.kind) {
        case "slice":
          return group(
            box(0.75, 0.75, 0.15, crust, [0, 0.38, 0], [0, 0, 0], 0.12),
            box(0.62, 0.62, 0.16, "#fbf0d6", [0, 0.36, 0], [0, 0, 0], 0.08),
          );
        case "baguette":
          return group(sphere(0.5, crust, [0, 0.12, 0], [1, 0.22, 0.24], [0, 0.4, 0]));
        case "bagel":
          return group(torus(0.28, 0.14, crust, [0, 0.14, 0], [PI / 2, 0, 0]));
        case "tortilla":
          return group(
            cyl(0.45, 0.45, 0.03, "#f2dcae", [0, 0.02, 0]),
            cyl(0.43, 0.43, 0.03, "#ecd29c", [0.02, 0.05, 0.02]),
          );
        case "bun":
        case "bun2":
          return group(
            dome(0.4, crust, [0, 0.18, 0], [1, 0.7, 1]),
            cyl(0.38, 0.4, 0.15, tone(crust, 0.15), [0, 0.08, 0]),
          );
        default:
          return group(box(0.8, 0.45, 0.5, crust, [0, 0.23, 0], [0, 0, 0], 0.18));
      }
    }
    case "sticks": {
      const n = spec.count ?? 3;
      return group(
        ...Array.from({ length: n }, (_, i) => {
          const z = (i - (n - 1) / 2) * 0.2;
          switch (spec.kind) {
            case "oval":
              return sphere(0.18, spec.color, [-0.25 + i * 0.18, 0.08, z * 0.5], [1, 0.45, 0.75]);
            case "flat":
              return box(
                0.8,
                0.07,
                0.18,
                spec.color,
                [0, 0.04 + i * 0.07, z * 0.3],
                [0, 0.1 * i, 0],
                0.02,
              );
            case "link":
              return at(
                group(sphere(0.4, spec.color, [0, 0, 0], [1, 0.22, 0.22])),
                [0, 0.1 + (i % 2) * 0.05, z],
                [0, (i - 1) * 0.2, 0],
              );
            case "crab":
              return group(
                cyl(0.07, 0.07, 0.8, "#fbf6ef", [0, 0.08, z], [0, 0, PI / 2]),
                cyl(0.072, 0.072, 0.8, spec.accent ?? "#e5533d", [0, 0.12, z], [0, 0, PI / 2]),
              );
            default:
              return cyl(0.08, 0.08, 0.8, spec.color, [0, 0.09, z], [0, 0, PI / 2]);
          }
        }),
      );
    }
    case "dumpling":
      return group(
        ...[
          [-0.2, 0],
          [0.2, 0.05],
          [0, -0.2],
        ].map(([x, z]) => dome(0.22, spec.color ?? "#f6eedd", [x, 0, z], [1, 0.8, 0.6])),
      );
    case "bottle":
      return bottleModel(spec);
    case "carton": {
      const s = spec.small ? 0.8 : 1;
      const top = spec.top ?? spec.body;
      return group(
        box(0.42 * s, 0.7 * s, 0.42 * s, spec.body, [0, 0.35 * s, 0], [0, 0, 0], 0.02),
        at(
          new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.42 * s, 3), mat(top)),
          [0, 0.76 * s, 0],
          [PI / 2, 0, 0],
          [1, 1, 0.6],
        ),
        labelPlate(
          0.36 * s,
          0.25 * s,
          spec.text ?? "",
          "#ffffff",
          spec.textColor ?? tone(top, -0.3),
          [0, 0.38 * s, 0.215 * s],
        ),
      );
    }
    case "tub": {
      const lid = spec.lid ?? tone(spec.body, -0.15);
      const fg = spec.textColor ?? "#ffffff";
      if (spec.shape === "square")
        return group(
          box(0.75, 0.5, 0.55, spec.body, [0, 0.25, 0], [0, 0, 0], 0.06),
          box(0.8, 0.08, 0.6, lid, [0, 0.53, 0], [0, 0, 0], 0.03),
          labelPlate(0.6, 0.22, spec.text ?? "", spec.body, fg, [0, 0.25, 0.28]),
        );
      if (spec.shape === "cup")
        return group(
          cyl(0.28, 0.22, 0.55, spec.body, [0, 0.27, 0]),
          cyl(0.3, 0.3, 0.03, lid, [0, 0.56, 0]),
          labelSleeve(0.255, 0.2, spec.text ?? "", spec.body, fg, 0.28),
        );
      if (spec.shape === "low")
        return group(
          box(0.85, 0.28, 0.6, spec.body, [0, 0.14, 0], [0, 0, 0], 0.05),
          box(0.9, 0.05, 0.65, lid, [0, 0.3, 0], [0, 0, 0], 0.02),
          labelPlate(0.6, 0.15, spec.text ?? "", spec.body, fg, [0, 0.14, 0.305]),
        );
      return group(
        cyl(0.38, 0.38, 0.45, spec.body, [0, 0.22, 0]),
        cyl(0.41, 0.41, 0.1, lid, [0, 0.48, 0]),
        labelSleeve(0.385, 0.2, spec.text ?? "", spec.body, fg, 0.22),
      );
    }
    case "jar":
      return group(
        cyl(0.28, 0.28, 0.55, mat("#dfeef5", { opacity: 0.35, rough: 0.1 }), [0, 0.28, 0]),
        cyl(0.25, 0.25, 0.48, spec.content, [0, 0.25, 0]),
        cyl(0.29, 0.29, 0.12, spec.lid ?? "#d4a017", [0, 0.6, 0]),
        labelSleeve(0.285, 0.18, spec.text ?? "", "#ffffff", tone(spec.content, -0.4), 0.27),
      );
    case "can":
      if (spec.kind === "rect")
        return group(
          box(0.75, 0.42, 0.45, spec.body, [0, 0.21, 0], [0, 0, 0], 0.08),
          labelPlate(
            0.6,
            0.2,
            spec.text ?? "",
            spec.band ?? spec.body,
            spec.textColor ?? "#ffffff",
            [0, 0.2, 0.23],
          ),
        );
      return group(
        cyl(
          0.26,
          0.26,
          spec.kind === "tall" ? 0.8 : 0.42,
          mat(spec.body, { metal: 0.5, rough: 0.35 }),
          [0, spec.kind === "tall" ? 0.4 : 0.21, 0],
        ),
        labelSleeve(
          0.265,
          spec.kind === "tall" ? 0.35 : 0.2,
          spec.text ?? "",
          spec.band ?? spec.body,
          spec.textColor ?? "#ffffff",
          spec.kind === "tall" ? 0.4 : 0.21,
        ),
      );
    case "pouch":
      if (spec.kind === "box")
        return boxPack(
          0.55,
          0.8,
          0.22,
          spec.body,
          spec.text ?? "",
          spec.textColor ?? "#ffffff",
          spec.body,
        );
      if (spec.kind === "ramen")
        return group(
          box(0.85, 0.15, 0.6, spec.body, [0, 0.08, 0], [0, 0, 0], 0.06),
          labelPlate(
            0.5,
            0.25,
            spec.text ?? "",
            spec.body,
            spec.textColor ?? "#ffffff",
            [0, 0.162, 0],
          ).rotateX(-PI / 2),
        );
      return boxPack(
        0.6,
        0.75,
        0.25,
        spec.body,
        spec.text ?? "",
        spec.textColor ?? "#ffffff",
        spec.body,
      );
    case "shaker":
      return group(
        cyl(0.22, 0.22, 0.6, spec.body, [0, 0.3, 0]),
        dome(0.22, spec.cap ?? "#9aa3a8", [0, 0.6, 0]),
        labelSleeve(0.225, 0.22, spec.text ?? "", spec.body, spec.textColor ?? "#ffffff", 0.3),
      );
    case "cup":
      return group(
        cyl(0.3, 0.22, 0.65, spec.body, [0, 0.33, 0]),
        cyl(0.32, 0.32, 0.05, tone(spec.body, -0.2), [0, 0.67, 0]),
      );
    case "nuts": {
      const c = spec.color;
      const pos: [number, number, number][] = [
        [-0.2, 0.08, 0],
        [0.18, 0.08, 0.05],
        [0, 0.08, -0.18],
        [0.02, 0.2, 0.02],
        [-0.1, 0.08, 0.2],
      ];
      const one = (p: [number, number, number]) =>
        spec.kind === "chestnut"
          ? sphere(0.17, c, p, [1, 0.9, 0.8])
          : spec.kind === "pine"
            ? sphere(0.06, c, p, [0.7, 1, 0.7])
            : spec.kind === "raisin"
              ? sphere(0.08, c, p, [1, 0.7, 0.9])
              : sphere(0.12, c, p, [1.3, 0.6, 0.8]);
      return group(...pos.map(one));
    }
    case "chocolateBar":
      return group(
        box(0.8, 0.08, 0.5, "#5d3a1a", [0, 0.04, 0], [0, 0, 0], 0.02),
        box(0.4, 0.09, 0.51, "#c62828", [0.2, 0.045, 0], [0, 0, 0], 0.02),
      );
    case "teardrop":
      return group(
        lathe(
          [
            [0, 0],
            [0.28, 0.08],
            [0.33, 0.3],
            [0.2, 0.58],
            [0, 0.72],
          ],
          spec.color,
        ),
        ...(spec.top === "stem" ? [cyl(0.02, 0.03, 0.1, BROWN, [0, 0.76, 0])] : []),
      );
    case "pineapple":
      return group(
        sphere(0.3, "#e0a526", [0, 0.38, 0], [1, 1.25, 1]),
        ...[0, 1, 2, 3, 4, 5].map((i) =>
          cone(
            0.07,
            0.35,
            "#4f9a3c",
            [Math.cos(i) * 0.05, 0.85, Math.sin(i) * 0.05],
            [Math.sin(i) * 0.4, 0, Math.cos(i) * 0.4],
          ),
        ),
      );
    case "sideDish": {
      const c = spec.color;
      const dish = lathe(
        [
          [0.25, 0],
          [0.42, 0.08],
          [0.48, 0.22],
          [0.46, 0.23],
          [0.4, 0.1],
          [0, 0.08],
        ],
        "#f2f4f5",
      );
      const top: THREE.Object3D[] =
        spec.kind === "cubes"
          ? [
              [-0.15, 0],
              [0.12, 0.08],
              [0, -0.15],
              [0.15, -0.12],
              [-0.1, 0.15],
            ].map(([x, z]) => box(0.15, 0.15, 0.15, c, [x, 0.22, z], [0, x * 5, 0], 0.03))
          : spec.kind === "liquid"
            ? [cyl(0.42, 0.42, 0.02, c, [0, 0.18, 0])]
            : spec.kind === "stalks"
              ? [0, 1, 2, 3].map((i) =>
                  cyl(0.04, 0.04, 0.6, c, [-0.15 + i * 0.1, 0.25, 0], [0, i * 0.3, PI / 2 - 0.2]),
                )
              : spec.kind === "eggs"
                ? [
                    [-0.15, 0],
                    [0.12, 0.08],
                    [0, -0.15],
                  ].map(([x, z]) => sphere(0.12, c, [x, 0.22, z], [1, 0.85, 1]))
                : [sphere(0.38, c, [0, 0.18, 0], [1, 0.45, 1])];
      return group(dish, ...top);
    }
  }
}

/** 모델 원형 (재료 종류마다 한 번만 만들고 복제해 쓴다) */
const prototypes = new Map<string, THREE.Object3D>();

const bakedMaterials = new Map<string, THREE.Material>();

/**
 * 여러 부품을 한 덩어리로 굽는다 (재료 하나 = 그리기 호출 1~3번).
 * 색은 꼭짓점 색으로 옮기고, 재질 성질(거칠기·금속성·투명도)이 같은 부품끼리 합친다.
 * 글자 라벨처럼 그림(텍스처)이 있는 부품은 따로 둔다.
 */
function bake(root: THREE.Object3D): THREE.Object3D {
  root.updateMatrixWorld(true);
  const groups = new Map<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>();
  const out = new THREE.Group();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshStandardMaterial;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
      o.matrixWorld,
    );
    if (m.map) {
      const keep = new THREE.Mesh(g, m);
      keep.castShadow = true;
      out.add(keep);
      return;
    }
    for (const name of Object.keys(g.attributes))
      if (name !== "position" && name !== "normal") g.deleteAttribute(name);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([m.color.r, m.color.g, m.color.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const key = `${m.roughness}|${m.metalness}|${m.opacity}|${m.transparent}`;
    let mat = bakedMaterials.get(key);
    if (!mat) {
      mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: m.roughness,
        metalness: m.metalness,
        transparent: m.transparent,
        opacity: m.opacity,
        depthWrite: !m.transparent,
      });
      bakedMaterials.set(key, mat);
    }
    const entry = groups.get(key) ?? { mat, geos: [] };
    entry.geos.push(g);
    groups.set(key, entry);
  });
  for (const { mat, geos } of groups.values()) {
    const merged = mergeGeometries(geos);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    out.add(mesh);
  }
  return out;
}

/** 가장 긴 변이 1, 바닥이 y=0, 가운데가 원점이 되도록 맞춘다 */
function normalize(obj: THREE.Object3D) {
  const box3 = new THREE.Box3().setFromObject(obj);
  const size = box3.getSize(new THREE.Vector3());
  const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
  const center = box3.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  obj.position.sub(new THREE.Vector3(center.x, box3.min.y, center.z));
  holder.add(obj);
  holder.scale.setScalar(s);
  return holder;
}

/** 재료 모델 하나를 만든다 (원형을 복제하므로 도형·재질은 공유) */
export function ingredientModel(key: string, spec: ArtSpec): THREE.Object3D {
  let proto = prototypes.get(key);
  if (!proto) {
    proto = normalize(bake(modelFor(spec)));
    prototypes.set(key, proto);
  }
  return proto.clone(true);
}
