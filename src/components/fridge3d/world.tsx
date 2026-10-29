"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ingredientSpec } from "@/data/ingredient-art";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { daysLeft, freshness, todayIso } from "@/lib/domain/expiry";
import type { CompartmentSlot, FridgeItem } from "@/lib/domain/fridge";
import type { IngredientCategory } from "@/lib/domain/types";
import { ingredientModel } from "@/three/models";
import {
  DRAWERS,
  FRIDGE,
  SLOT_AREAS,
  VIEW_BOX,
  ambientMotion,
  fitDistance,
  placeItems,
  type Vec3,
} from "./layout";
import { damp, settled, type Overlay } from "./overlay";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const PI = Math.PI;

export type DrawerSlot = "freezer_upper" | "freezer_lower";

export interface WorldState {
  bySlot: ReadonlyMap<CompartmentSlot, FridgeItem[]>;
  doorOpen: boolean;
  drawers: Record<DrawerSlot, boolean>;
  highlight: ReadonlySet<string> | null;
  /** 방금 누른 재료 (튀어 오른다) */
  poppingId: string | null;
  reducedMotion: boolean;
  dark: boolean;
  /** 다 씀(접시)·버림(휴지통)으로 냉장고를 떠나는 재료 */
  departure?: Departure | null;
}

export interface Departure {
  id: number;
  kind: "plate" | "trash";
  ingredientId: string | null;
  category: IngredientCategory | null;
  /** 냉장고 안에 있던 자리 (월드 좌표)와 크기 */
  from: Vec3;
  size: number;
  onDone: () => void;
}

const DEPART_MS = 900;

/** 재료가 냉장고에서 튀어나와 바닥의 접시·휴지통으로 날아간다 */
function Departing({ d, m }: { d: Departure; m: Mats }) {
  const { key, spec } = ingredientSpec(d.ingredientId, d.category);
  const model = useMemo(() => ingredientModel(key, spec), [key, spec]);
  const g = useRef<THREE.Group>(null);
  const target = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const finished = useRef(false);
  const to: Vec3 = d.kind === "plate" ? [-0.55, 0.06, 1.35] : [0.75, 0.6, 1.35];
  useFrame(({ clock, invalidate }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const p = Math.min(1, ((clock.elapsedTime - start.current) * 1000) / DEPART_MS);
    if (target.current) target.current.scale.setScalar(Math.min(1, p * 4));
    if (g.current) {
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      g.current.position.set(
        d.from[0] + (to[0] - d.from[0]) * e,
        d.from[1] + (to[1] - d.from[1]) * e + Math.sin(e * PI) * 0.9,
        d.from[2] + (to[2] - d.from[2]) * e,
      );
      g.current.rotation.set(d.kind === "trash" ? e * PI * 2 : 0, e * PI, 0);
      g.current.scale.setScalar(d.size * (d.kind === "trash" ? 1 - e * 0.6 : 1 - e * 0.2));
    }
    if (p < 1) invalidate();
    else if (!finished.current) {
      finished.current = true;
      d.onDone();
    }
  });
  return (
    <group>
      <group ref={target} position={to}>
        {d.kind === "plate" ? (
          <mesh material={m.counter}>
            <cylinderGeometry args={[0.42, 0.32, 0.05, 32]} />
          </mesh>
        ) : (
          <group>
            <mesh position={[0, -0.3, 0]} material={m.plinth}>
              <cylinderGeometry args={[0.3, 0.25, 0.6, 24]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} material={m.trim}>
              <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
            </mesh>
          </group>
        )}
      </group>
      <group ref={g} position={d.from}>
        <primitive object={model} />
      </group>
    </group>
  );
}

/** 목표값을 향해 부드럽게 움직이며, 움직이는 동안에만 다시 그린다 */
function useDamped(
  target: number,
  apply: (v: number) => void,
  { lambda = 6, instant = false } = {},
) {
  const v = useRef(target);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [target, invalidate]);
  useFrame((_, dt) => {
    if (instant || settled(v.current, target)) v.current = target;
    else {
      v.current = damp(v.current, target, lambda, Math.min(dt, 0.05));
      invalidate();
    }
    apply(v.current);
  });
}

/** 장면 곳곳에서 쓰는 재질 */
function useMaterials(dark: boolean) {
  return useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({
        color: dark ? "#d7dde3" : "#f4f7fa",
        roughness: 0.28,
        metalness: 0.05,
      }),
      inside: new THREE.MeshStandardMaterial({ color: "#e9f4fb", roughness: 0.6 }),
      trim: new THREE.MeshStandardMaterial({ color: "#c9d3db", roughness: 0.4 }),
      plinth: new THREE.MeshStandardMaterial({ color: "#5b6670", roughness: 0.6 }),
      glass: new THREE.MeshStandardMaterial({
        color: "#cfe8f5",
        roughness: 0.05,
        transparent: true,
        opacity: 0.35,
      }),
      clear: new THREE.MeshStandardMaterial({
        color: "#e3f2fd",
        roughness: 0.1,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      icy: new THREE.MeshStandardMaterial({
        color: "#dbeafe",
        roughness: 0.2,
        transparent: true,
        opacity: 0.45,
      }),
      chrome: new THREE.MeshStandardMaterial({ color: "#b8c2cb", roughness: 0.15, metalness: 0.8 }),
      basket: new THREE.MeshStandardMaterial({ color: "#c08a4e", roughness: 0.85 }),
      basketDark: new THREE.MeshStandardMaterial({ color: "#9a6a36", roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({
        color: dark ? "#4a3b2c" : "#d9b48b",
        roughness: 0.8,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: dark ? "#2b2f36" : "#f1ece4",
        roughness: 0.95,
      }),
      tile: new THREE.MeshStandardMaterial({ color: dark ? "#353a42" : "#e6dfd4", roughness: 0.9 }),
      zone: new THREE.MeshBasicMaterial({ visible: false }),
      cabinet: new THREE.MeshStandardMaterial({
        color: dark ? "#5a4a3a" : "#e9dcc7",
        roughness: 0.7,
      }),
      counter: new THREE.MeshStandardMaterial({
        color: dark ? "#3a3f46" : "#f7f4ef",
        roughness: 0.35,
      }),
      board: new THREE.MeshStandardMaterial({ color: "#c99a5c", roughness: 0.8 }),
      pot: new THREE.MeshStandardMaterial({ color: "#e05a47", roughness: 0.35 }),
      window: new THREE.MeshStandardMaterial({
        color: dark ? "#1f3a5a" : "#cfe8f7",
        emissive: dark ? "#0b1a2b" : "#9fd0ee",
        emissiveIntensity: 0.4,
      }),
      potPlant: new THREE.MeshStandardMaterial({ color: "#b5651d", roughness: 0.8 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#5aa23a", roughness: 0.7 }),
      frost: new THREE.MeshStandardMaterial({
        color: "#f0f9ff",
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
      glow: new THREE.MeshStandardMaterial({
        color: "#34d399",
        emissive: "#10b981",
        emissiveIntensity: 1.4,
      }),
      fly: new THREE.MeshStandardMaterial({ color: "#263238", roughness: 0.4 }),
      wing: new THREE.MeshStandardMaterial({ color: "#cfe8f5", transparent: true, opacity: 0.7 }),
    }),
    [dark],
  );
}

type Mats = ReturnType<typeof useMaterials>;

function Box({ size, pos, mat, rot }: { size: Vec3; pos: Vec3; mat: THREE.Material; rot?: Vec3 }) {
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** 오버레이와 짝지을 보이지 않는 영역 */
function Zone({
  id,
  size,
  pos,
  overlay,
  mat,
  name,
}: {
  name?: string;
  id: string;
  size: Vec3;
  pos: Vec3;
  overlay: Overlay | null;
  mat: THREE.Material;
}) {
  const ref = useCallback(
    (m: THREE.Mesh | null) => overlay?.setObject(id, "box", m),
    [id, overlay],
  );
  return (
    <mesh ref={ref} name={name} position={pos} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function zoneOf(slot: CompartmentSlot, index = 0): { size: Vec3; pos: Vec3 } {
  const a = SLOT_AREAS[slot][index];
  return {
    size: [a.x1 - a.x0, a.maxH, a.z1 - a.z0],
    pos: [(a.x0 + a.x1) / 2, a.y + a.maxH / 2, (a.z0 + a.z1) / 2],
  };
}

// ── 부엌 ──────────────────────────────────────

function Kitchen({ m }: { m: Mats }) {
  return (
    <group>
      <mesh rotation-x={-PI / 2} position={[0, 0, 2]} material={m.floor} receiveShadow>
        <planeGeometry args={[16, 16]} />
      </mesh>
      {/* 바닥 판자 줄 */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={i}
          rotation-x={-PI / 2}
          position={[-7 + i * 1.1, 0.002, 2]}
          material={m.basketDark}
        >
          <planeGeometry args={[0.02, 16]} />
        </mesh>
      ))}
      <mesh position={[0, 3, -0.72]} material={m.wall}>
        <planeGeometry args={[16, 6]} />
      </mesh>
      {/* 벽 타일 띠 */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 0.9 + i * 0.5, -0.715]} material={m.tile}>
          <planeGeometry args={[16, 0.02]} />
        </mesh>
      ))}
      <Box size={[16, 0.14, 0.04]} pos={[0, 0.07, -0.7]} mat={m.plinth} />
      {/* 왼쪽 조리대와 냄비 */}
      <Box size={[2.4, 1.7, 1.1]} pos={[-2.4, 0.85, -0.12]} mat={m.cabinet} />
      <Box size={[2.5, 0.1, 1.2]} pos={[-2.4, 1.75, -0.1]} mat={m.counter} />
      {[-3.0, -1.8].map((x) => (
        <Box key={x} size={[0.4, 0.04, 0.04]} pos={[x, 1.45, 0.45]} mat={m.trim} />
      ))}
      <mesh position={[-2.6, 2.02, -0.1]} material={m.pot}>
        <cylinderGeometry args={[0.32, 0.3, 0.42, 24]} />
      </mesh>
      <mesh position={[-2.6, 2.25, -0.1]} material={m.trim}>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 24]} />
      </mesh>
      <Box size={[0.6, 0.05, 0.4]} pos={[-1.75, 1.83, 0.05]} mat={m.board} />
      {/* 벽 창문 */}
      <Box size={[1.5, 1.2, 0.04]} pos={[-2.4, 3.3, -0.69]} mat={m.window} />
      <Box size={[1.6, 0.08, 0.06]} pos={[-2.4, 3.92, -0.68]} mat={m.cabinet} />
      <Box size={[1.6, 0.08, 0.06]} pos={[-2.4, 2.68, -0.68]} mat={m.cabinet} />
      <Box size={[0.06, 1.2, 0.06]} pos={[-2.4, 3.3, -0.68]} mat={m.cabinet} />
      {/* 오른쪽 작은 화분 선반 */}
      <Box size={[1.6, 1.2, 0.9]} pos={[2.3, 0.6, -0.2]} mat={m.cabinet} />
      <mesh position={[2.0, 1.4, -0.2]} material={m.potPlant}>
        <cylinderGeometry args={[0.16, 0.12, 0.3, 16]} />
      </mesh>
      <mesh position={[2.0, 1.75, -0.2]} material={m.leaf}>
        <sphereGeometry args={[0.3, 16, 12]} />
      </mesh>
    </group>
  );
}

// ── 냉장고 ────────────────────────────────────

function Body({ m, doorOpen, overlay }: { m: Mats; doorOpen: boolean; overlay: Overlay | null }) {
  const { width: W, height: H, depth: D, wall: t } = FRIDGE;
  const light = useRef<THREE.PointLight>(null);
  useDamped(doorOpen ? 1.6 : 0, (v) => light.current && (light.current.intensity = v));
  return (
    <group>
      <Box size={[W, 0.08, D - 0.1]} pos={[0, 0.04, -0.05]} mat={m.plinth} />
      <Box size={[W, H - 0.08, t]} pos={[0, H / 2 + 0.04, -D / 2 + t / 2]} mat={m.body} />
      <Box size={[t, H - 0.08, D]} pos={[-W / 2 + t / 2, H / 2 + 0.04, 0]} mat={m.body} />
      <Box size={[t, H - 0.08, D]} pos={[W / 2 - t / 2, H / 2 + 0.04, 0]} mat={m.body} />
      <Box size={[W, t, D]} pos={[0, H - t / 2, 0]} mat={m.body} />
      <Box size={[W, t, D]} pos={[0, 0.08 + t / 2, 0]} mat={m.body} />
      {/* 냉장실·냉동실 경계 */}
      <Box size={[W - 2 * t, 0.08, D]} pos={[0, 1.2, 0]} mat={m.body} />
      {/* 안쪽 벽 */}
      <Box
        size={[W - 2 * t, H - 0.2, 0.01]}
        pos={[0, H / 2 + 0.06, -D / 2 + t + 0.01]}
        mat={m.inside}
      />
      <pointLight
        ref={light}
        position={[0, 3.05, 0.2]}
        color="#f8fbff"
        distance={4}
        intensity={0}
      />
      {/* 유리 선반 3단 */}
      {(["fridge_bottom", "fridge_middle", "fridge_top"] as const).map((s) => {
        const y = SLOT_AREAS[s][0].y;
        return (
          <group key={s}>
            <Box
              size={[W - 2 * t - 0.02, 0.025, D - 0.2]}
              pos={[0, y - 0.0125, -0.04]}
              mat={m.glass}
            />
            <Box size={[W - 2 * t - 0.02, 0.04, 0.025]} pos={[0, y - 0.01, 0.45]} mat={m.trim} />
          </group>
        );
      })}
      {/* 채소칸 서랍 */}
      <group>
        <Box size={[1.62, 0.02, 0.9]} pos={[0, 1.29, -0.04]} mat={m.clear} />
        <Box size={[1.62, 0.36, 0.02]} pos={[0, 1.46, 0.42]} mat={m.clear} />
        <Box size={[0.5, 0.03, 0.03]} pos={[0, 1.6, 0.44]} mat={m.trim} />
      </group>
      {/* 서랍을 열었을 때 카메라가 내려다볼 냉동실 전체 (서랍이 나온 자리까지) */}
      <Zone
        id="zone:freezer"
        size={[1.7, 1.1, 1.9]}
        pos={[0, 0.6, 0.35]}
        overlay={overlay}
        mat={m.zone}
      />
      {(Object.keys(SLOT_AREAS) as CompartmentSlot[])
        .filter((s) => SLOT_AREAS[s][0].parent === "body")
        .map((s) => (
          <Zone key={s} id={`slot:${s}`} {...zoneOf(s)} overlay={overlay} mat={m.zone} />
        ))}
    </group>
  );
}

/** 문 (오른쪽 경첩으로 열린다). 냉장실 문 안쪽에는 문 선반 3칸이 붙어 있다. */
function Door({
  kind,
  m,
  open,
  instant,
  overlay,
  children,
}: {
  kind: "fridge" | "freezer";
  m: Mats;
  open: boolean;
  instant: boolean;
  overlay: Overlay | null;
  children?: ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const { y0, y1 } = kind === "fridge" ? FRIDGE.fridgeDoor : FRIDGE.freezerDoor;
  const h = y1 - y0;
  const L = FRIDGE.width;
  useDamped(open ? FRIDGE.doorOpenAngle : 0, (v) => g.current && (g.current.rotation.y = v), {
    lambda: 4.5,
    instant,
  });
  const panelRef = useCallback(
    (mesh: THREE.Mesh | null) => overlay?.setObject(`door:${kind}`, "box", mesh),
    [kind, overlay],
  );
  return (
    <group ref={g} position={[FRIDGE.hingeX, 0, FRIDGE.hingeZ]}>
      <mesh
        ref={panelRef}
        position={[-L / 2, (y0 + y1) / 2, FRIDGE.doorThick / 2]}
        material={m.body}
        castShadow
      >
        <boxGeometry args={[L, h, FRIDGE.doorThick]} />
      </mesh>
      {/* 손잡이 */}
      <Box
        size={[0.06, Math.min(0.9, h * 0.6), 0.06]}
        pos={[-L + 0.16, (y0 + y1) / 2, FRIDGE.doorThick + 0.07]}
        mat={m.chrome}
      />
      <Box
        size={[0.04, 0.04, 0.08]}
        pos={[
          -L + 0.16,
          (y0 + y1) / 2 + Math.min(0.9, h * 0.6) / 2 - 0.03,
          FRIDGE.doorThick + 0.03,
        ]}
        mat={m.chrome}
      />
      <Box
        size={[0.04, 0.04, 0.08]}
        pos={[
          -L + 0.16,
          (y0 + y1) / 2 - Math.min(0.9, h * 0.6) / 2 + 0.03,
          FRIDGE.doorThick + 0.03,
        ]}
        mat={m.chrome}
      />
      {/* 안쪽 판 */}
      <Box size={[L - 0.16, h - 0.16, 0.02]} pos={[-L / 2, (y0 + y1) / 2, -0.01]} mat={m.inside} />
      {kind === "fridge" &&
        SLOT_AREAS.fridge_door.map((a, i) => (
          <group key={i}>
            <Box
              size={[a.x1 - a.x0 + 0.06, 0.025, a.z1 - a.z0 + 0.06]}
              pos={[(a.x0 + a.x1) / 2, a.y - 0.0125, (a.z0 + a.z1) / 2]}
              mat={m.trim}
            />
            <Box
              size={[a.x1 - a.x0 + 0.06, 0.16, 0.02]}
              pos={[(a.x0 + a.x1) / 2, a.y + 0.07, a.z0 - 0.03]}
              mat={m.clear}
            />
          </group>
        ))}
      {kind === "fridge" && (
        <Zone
          id="slot:fridge_door"
          name="door"
          size={[1.44, 1.58, 0.22]}
          pos={[-0.9, 2.29, -0.19]}
          overlay={overlay}
          mat={m.zone}
        />
      )}
      {children}
    </group>
  );
}

/** 냉동실 서랍 (앞으로 당겨 나온다) */
function Drawer({
  slot,
  m,
  open,
  instant,
  overlay,
  children,
}: {
  slot: DrawerSlot;
  m: Mats;
  open: boolean;
  instant: boolean;
  overlay: Overlay | null;
  children?: ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  const d = DRAWERS[slot === "freezer_upper" ? "drawerUpper" : "drawerLower"];
  useDamped(open ? FRIDGE.drawerTravel : 0, (v) => g.current && (g.current.position.z = v), {
    lambda: 7,
    instant,
  });
  const frontRef = useCallback(
    (mesh: THREE.Mesh | null) => overlay?.setObject(`drawer:${slot}`, "box", mesh),
    [slot, overlay],
  );
  return (
    <group ref={g} position={[0, d.y, 0]}>
      <Box size={[1.6, 0.02, 0.9]} pos={[0, 0.01, -0.02]} mat={m.icy} />
      <Box size={[0.02, d.h - 0.04, 0.9]} pos={[-0.79, d.h / 2, -0.02]} mat={m.icy} />
      <Box size={[0.02, d.h - 0.04, 0.9]} pos={[0.79, d.h / 2, -0.02]} mat={m.icy} />
      <Box size={[1.6, d.h - 0.04, 0.02]} pos={[0, d.h / 2, -0.46]} mat={m.icy} />
      <mesh ref={frontRef} position={[0, d.h / 2, 0.45]} material={m.body}>
        <boxGeometry args={[1.66, d.h - 0.02, 0.04]} />
      </mesh>
      <Box size={[0.7, 0.05, 0.05]} pos={[0, d.h - 0.08, 0.5]} mat={m.chrome} />
      <Zone id={`slot:${slot}`} {...zoneOf(slot)} overlay={overlay} mat={m.zone} />
      {children}
    </group>
  );
}

function Pantry({
  m,
  overlay,
  children,
}: {
  m: Mats;
  overlay: Overlay | null;
  children?: ReactNode;
}) {
  const y = FRIDGE.height;
  return (
    <group>
      <Box size={[1.56, 0.04, 0.86]} pos={[0, y + 0.02, -0.02]} mat={m.basket} />
      {[-0.78, 0.78].map((x) => (
        <Box key={x} size={[0.04, 0.3, 0.86]} pos={[x, y + 0.15, -0.02]} mat={m.basket} />
      ))}
      {/* 앞쪽 벽은 낮게 해서 안에 든 재료가 보이게 */}
      <Box size={[1.56, 0.3, 0.04]} pos={[0, y + 0.15, -0.45]} mat={m.basket} />
      <Box size={[1.56, 0.1, 0.04]} pos={[0, y + 0.05, 0.41]} mat={m.basket} />
      {[0.03, 0.07].map((dy) => (
        <Box key={dy} size={[1.58, 0.015, 0.045]} pos={[0, y + dy, 0.42]} mat={m.basketDark} />
      ))}
      <Zone id="slot:pantry" {...zoneOf("pantry")} overlay={overlay} mat={m.zone} />
      {children}
    </group>
  );
}

// ── 재료 ──────────────────────────────────────

function Fly({ m, size, reduced }: { m: Mats; size: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock, invalidate }) => {
    if (!g.current || reduced) return;
    const t = clock.elapsedTime * 3;
    g.current.position.set(
      Math.cos(t) * size * 0.6,
      size * 1.1 + Math.sin(t * 2) * 0.04,
      Math.sin(t) * size * 0.6,
    );
    invalidate();
  });
  return (
    <group ref={g} position={[0, size * 1.1, 0]}>
      <mesh material={m.fly} scale={[0.035, 0.03, 0.05]}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh
        material={m.wing}
        position={[0.03, 0.02, 0]}
        rotation={[0, 0, 0.5]}
        scale={[0.04, 0.005, 0.025]}
      >
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
      <mesh
        material={m.wing}
        position={[-0.03, 0.02, 0]}
        rotation={[0, 0, -0.5]}
        scale={[0.04, 0.005, 0.025]}
      >
        <sphereGeometry args={[1, 8, 6]} />
      </mesh>
    </group>
  );
}

function Item({
  item,
  pos,
  size,
  m,
  state,
  overlay,
  frozen,
  row,
}: {
  item: FridgeItem;
  pos: Vec3;
  size: number;
  m: Mats;
  state: WorldState;
  overlay: Overlay | null;
  frozen: boolean;
  row: number;
}) {
  const ingredient = item.ingredientId ? lookup(item.ingredientId) : undefined;
  const { key, spec } = ingredientSpec(item.ingredientId, ingredient?.category);
  const model = useMemo(() => ingredientModel(key, spec), [key, spec]);
  const level = freshness(daysLeft(item.expiresAt, todayIso()));
  const lit = state.highlight ? state.highlight.has(item.id) : null;
  const g = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const popStart = useRef<number | null>(null);
  const ref = useCallback(
    (obj: THREE.Group | null) =>
      overlay?.setObject(`item:${item.id}`, row > 0 ? "head" : "foot", obj),
    [item.id, overlay, row],
  );
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (state.poppingId === item.id) {
      popStart.current = -1;
      invalidate();
    }
  }, [state.poppingId, item.id, invalidate]);

  const wobble = level === "urgent" && ambientMotion(state.reducedMotion);
  useFrame(({ clock }) => {
    const obj = inner.current;
    if (!obj) return;
    const t = clock.elapsedTime;
    // 튀어 오르기
    if (popStart.current !== null) {
      if (popStart.current < 0) popStart.current = t;
      const p = (t - popStart.current) / 0.3;
      obj.position.y = p < 1 ? Math.sin(p * PI) * 0.35 : 0;
      if (p >= 1) popStart.current = null;
      invalidate();
    }
    // 기한이 오늘·내일이면 1.6초마다 살짝 흔들린다
    if (wobble) {
      const c = (t % 1.6) / 1.6;
      obj.rotation.z = c > 0.7 ? Math.sin((c - 0.7) * 40) * 0.12 * (1 - c) * 3 : 0;
      invalidate();
    } else obj.rotation.z = 0;
  });

  return (
    <group ref={g} position={pos}>
      <group ref={ref} scale={size}>
        <group ref={inner}>
          <group
            rotation={
              level === "expired"
                ? [0, 0, PI / 2.3]
                : [0, (item.id.charCodeAt(0) % 7) * 0.3 - 0.9, 0]
            }
            position={level === "expired" ? [0.25, 0, 0] : [0, 0, 0]}
          >
            <primitive object={model} />
          </group>
        </group>
        {frozen && (
          <mesh material={m.frost} position={[0, 0.5, 0]}>
            <boxGeometry args={[1.08, 1.08, 1.08]} />
          </mesh>
        )}
        {lit && (
          <mesh material={m.glow} rotation-x={-PI / 2} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.6, 0.05, 8, 32]} />
          </mesh>
        )}
        {level === "expired" && (
          <Fly m={m} size={1} reduced={!ambientMotion(state.reducedMotion)} />
        )}
      </group>
    </group>
  );
}

function SlotItems({
  slot,
  state,
  m,
  overlay,
  parent,
}: {
  slot: CompartmentSlot;
  state: WorldState;
  m: Mats;
  overlay: Overlay | null;
  parent: string;
}) {
  const items = state.bySlot.get(slot) ?? [];
  const placed = placeItems(slot, items.length);
  return (
    <>
      {items.map((item, i) =>
        placed[i].parent === parent ? (
          <Item
            key={item.id}
            item={item}
            pos={placed[i].pos}
            size={placed[i].size}
            m={m}
            state={state}
            overlay={overlay}
            frozen={item.storage === "freezer"}
            row={placed[i].row}
          />
        ) : null,
      )}
    </>
  );
}

/** 냉장고와 부엌 (인트로와 냉장고 화면이 함께 쓴다) */
export function FridgeWorld({ state, overlay }: { state: WorldState; overlay: Overlay | null }) {
  const m = useMaterials(state.dark);
  const instant = state.reducedMotion;
  return (
    <group>
      <hemisphereLight
        args={[
          state.dark ? "#cbd5e1" : "#ffffff",
          state.dark ? "#3b3026" : "#d6c3a8",
          state.dark ? 0.9 : 1.5,
        ]}
      />
      <directionalLight position={[3, 7, 6]} intensity={state.dark ? 1.1 : 1.7} />
      <directionalLight position={[-4, 3, 4]} intensity={0.45} />
      {/* 보는 쪽에서 비추는 은은한 빛 (냉장고 앞면이 어둡지 않게) */}
      <directionalLight position={[0.5, 2.5, 9]} intensity={state.dark ? 0.5 : 0.9} />
      <Kitchen m={m} />
      <Body m={m} doorOpen={state.doorOpen} overlay={overlay} />
      <SlotItems slot="fridge_top" state={state} m={m} overlay={overlay} parent="body" />
      <SlotItems slot="fridge_middle" state={state} m={m} overlay={overlay} parent="body" />
      <SlotItems slot="fridge_bottom" state={state} m={m} overlay={overlay} parent="body" />
      <SlotItems slot="veg_drawer" state={state} m={m} overlay={overlay} parent="body" />
      {(["freezer_upper", "freezer_lower"] as const).map((s) => (
        <group key={s}>
          <Drawer
            slot={s}
            m={m}
            open={state.drawers[s] && state.doorOpen}
            instant={instant}
            overlay={overlay}
          >
            <SlotItems
              slot={s}
              state={state}
              m={m}
              overlay={overlay}
              parent={s === "freezer_upper" ? "drawerUpper" : "drawerLower"}
            />
          </Drawer>
        </group>
      ))}
      <Door kind="fridge" m={m} open={state.doorOpen} instant={instant} overlay={overlay}>
        <SlotItems slot="fridge_door" state={state} m={m} overlay={overlay} parent="fridgeDoor" />
      </Door>
      <Door kind="freezer" m={m} open={state.doorOpen} instant={instant} overlay={overlay} />
      {state.departure && <Departing key={state.departure.id} d={state.departure} m={m} />}
      <Pantry m={m} overlay={overlay}>
        <SlotItems slot="pantry" state={state} m={m} overlay={overlay} parent="pantry" />
      </Pantry>
    </group>
  );
}

// ── 카메라 ────────────────────────────────────

export interface CameraGoal {
  pos: Vec3;
  look: Vec3;
}

/** 기본 화면: 냉장고 전체 + 열린 문 + 위 바구니 */
export function defaultGoal(aspect: number, fov: number): CameraGoal {
  const d = fitDistance(VIEW_BOX, fov, aspect);
  const cx = (VIEW_BOX.x0 + VIEW_BOX.x1) / 2;
  const cy = (VIEW_BOX.y0 + VIEW_BOX.y1) / 2;
  return { pos: [cx, cy + 0.7, d], look: [cx, cy, 0] };
}

/** 칸 하나를 크게: 칸 영역을 화면에 꽉 차게, 칸의 앞쪽(문 선반은 문 안쪽)에서 본다 */
export function zoneGoal(
  zone: THREE.Object3D,
  aspect: number,
  fov: number,
  from: "front" | "above" = "front",
): CameraGoal {
  zone.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(zone);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  // 문 선반처럼 돌아간 칸은 그 칸이 바라보는 방향에서 본다
  const q = new THREE.Quaternion();
  zone.getWorldQuaternion(q);
  const normal =
    zone.name === "door"
      ? new THREE.Vector3(0, 0, -1).applyQuaternion(q)
      : new THREE.Vector3(0, 0, 1);
  const w = Math.max(size.x, size.z * 0.6);
  const d = Math.max(
    1.6,
    fitDistance({ x0: 0, x1: w, y0: 0, y1: size.y + 0.4 }, fov, aspect, 1.15),
  );
  if (from === "above")
    return { pos: [c.x, c.y + d * 0.75, c.z + d * 0.75], look: [c.x, c.y, c.z] };
  return { pos: [c.x + normal.x * d, c.y + 0.35, c.z + normal.z * d], look: [c.x, c.y, c.z] };
}

/**
 * 카메라를 목표로 부드럽게 옮긴다. 움직이는 동안에만 다시 그린다.
 * 보는 대상(focusKey)이 바뀔 때만 움직이고, 처음 자리 잡기나 화면 크기 변화는 바로 맞춘다
 * (가만히 있는데 계속 그리지 않게).
 */
export function CameraRig({
  goal,
  instant,
  focusKey,
}: {
  goal: CameraGoal;
  instant: boolean;
  focusKey: string;
}) {
  const look = useRef(new THREE.Vector3(...goal.look));
  const snap = useRef(true);
  const lastFocus = useRef(focusKey);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (focusKey === lastFocus.current) snap.current = true;
    lastFocus.current = focusKey;
    invalidate();
  }, [goal, focusKey, invalidate]);
  useFrame(({ camera }, dt) => {
    const to = new THREE.Vector3(...goal.pos);
    const toLook = new THREE.Vector3(...goal.look);
    const k = instant || snap.current ? 1 : 1 - Math.exp(-4 * Math.min(dt, 0.1));
    snap.current = false;
    const p = camera.position;
    if (p.distanceTo(to) > 2e-3 || look.current.distanceTo(toLook) > 2e-3) {
      p.lerp(to, k);
      look.current.lerp(toLook, k);
      invalidate();
    } else {
      p.copy(to);
      look.current.copy(toLook);
    }
    camera.lookAt(look.current);
  });
  return null;
}

/** 장면이 그려질 때마다 DOM 오버레이를 3D 위치에 맞춘다 */
export function OverlaySync({ overlay }: { overlay: Overlay }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const stop = overlay.listen(() => invalidate());
    invalidate();
    return stop;
  }, [overlay, invalidate]);
  const frames = useRef(0);
  useFrame(({ camera, size, gl }) => {
    overlay.sync(camera, size.width, size.height);
    // 성능 확인용: 지금까지 그린 횟수와 직전 장면의 그리기 호출 수 (e2e/performance.spec.ts)
    frames.current++;
    gl.domElement.dataset.frames = String(frames.current);
    gl.domElement.dataset.calls = String(gl.info.render.calls);
  });
  return null;
}
