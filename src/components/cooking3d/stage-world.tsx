"use client";

import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ingredientSpec } from "@/data/ingredient-art";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import type { CookAction } from "@/lib/cooking/step-action";
import { DROP_MS, STAGGER_MS, type PotIngredient } from "@/components/cook-pot";
import { ingredientModel } from "@/three/models";

const PI = Math.PI;

/** 장면에서 쓰는 재질 (한 번만 만든다) */
const M = {
  counter: new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.4 }),
  counterEdge: new THREE.MeshStandardMaterial({ color: "#d8cfc2", roughness: 0.5 }),
  wall: new THREE.MeshStandardMaterial({ color: "#efe7db", roughness: 0.95 }),
  tile: new THREE.MeshStandardMaterial({ color: "#e2d8c9", roughness: 0.9 }),
  board: new THREE.MeshStandardMaterial({ color: "#c99a5c", roughness: 0.75 }),
  blade: new THREE.MeshStandardMaterial({ color: "#d5dde3", roughness: 0.15, metalness: 0.85 }),
  handle: new THREE.MeshStandardMaterial({ color: "#3e2a1e", roughness: 0.6 }),
  pot: new THREE.MeshStandardMaterial({ color: "#e05a47", roughness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: "#b8c2cb", roughness: 0.25, metalness: 0.75 }),
  pan: new THREE.MeshStandardMaterial({ color: "#2f3439", roughness: 0.45, metalness: 0.3 }),
  water: new THREE.MeshStandardMaterial({
    color: "#9fd3ea",
    roughness: 0.1,
    transparent: true,
    opacity: 0.75,
  }),
  broth: new THREE.MeshStandardMaterial({
    color: "#e8a35b",
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
  }),
  oil: new THREE.MeshStandardMaterial({
    color: "#e9b949",
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  }),
  burner: new THREE.MeshStandardMaterial({ color: "#3a3f45", roughness: 0.6 }),
  flame: new THREE.MeshStandardMaterial({
    color: "#5aa9ff",
    emissive: "#2f7bff",
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.85,
  }),
  steam: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  }),
  bubble: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
  }),
  bowl: new THREE.MeshStandardMaterial({ color: "#f5f7f8", roughness: 0.3 }),
  plate: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.25 }),
  spoon: new THREE.MeshStandardMaterial({ color: "#c9a26b", roughness: 0.6 }),
  appliance: new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.35 }),
  applianceDark: new THREE.MeshStandardMaterial({ color: "#2b2f35", roughness: 0.4 }),
  glow: new THREE.MeshStandardMaterial({
    color: "#ffcf6e",
    emissive: "#ffb020",
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.55,
  }),
  clockFace: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }),
  clockRim: new THREE.MeshStandardMaterial({ color: "#ef5350", roughness: 0.4 }),
  hand: new THREE.MeshStandardMaterial({ color: "#37474f" }),
  spark: new THREE.MeshStandardMaterial({
    color: "#ffd54f",
    emissive: "#ffb300",
    emissiveIntensity: 1.2,
  }),
};

/** 재료 모델 (크기 s, 바닥이 position에 닿게) */
function Food({ food, s = 0.5, ...rest }: { food: string; s?: number } & ThreeElements["group"]) {
  const ing = INGREDIENT_BY_ID.get(food);
  const { key, spec } = ingredientSpec(food, ing?.category);
  const model = useMemo(() => ingredientModel(key, spec), [key, spec]);
  return (
    <group {...rest}>
      <primitive object={model} scale={s} />
    </group>
  );
}

/** 움직임이 있는 장면이면 계속 그린다 (움직임 줄이기면 멈춘 한 장면) */
/**
 * 움직임 한 장면. 움직이지 않을 때(움직임 줄이기)도 처음 한 번은 같은 함수로 자리를 잡아
 * 김·거품 같은 조각이 기본 크기로 화면을 가리지 않게 한다.
 */
function useTick(play: boolean, fn: (t: number, dt: number) => void) {
  const invalidate = useThree((s) => s.invalidate);
  const posed = useRef(false);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(({ clock }, dt) => {
    if (!play) {
      if (!posed.current) {
        posed.current = true;
        fn(0.6, 0);
        invalidate();
      }
      return;
    }
    fn(clock.elapsedTime, Math.min(dt, 0.05));
    invalidate();
  });
}

function Counter() {
  return (
    <group>
      <mesh position={[0, -0.12, 0]} material={M.counter} receiveShadow>
        <boxGeometry args={[6, 0.24, 3]} />
      </mesh>
      <mesh position={[0, -0.25, 1.5]} material={M.counterEdge}>
        <boxGeometry args={[6, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0, 1.5, -1.4]} material={M.wall}>
        <planeGeometry args={[8, 4]} />
      </mesh>
      {[0.35, 0.85, 1.35, 1.85].map((y) => (
        <mesh key={y} position={[0, y, -1.39]} material={M.tile}>
          <planeGeometry args={[8, 0.02]} />
        </mesh>
      ))}
    </group>
  );
}

function Burner({ play, strong = false }: { play: boolean; strong?: boolean }) {
  const flames = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    flames.current?.children.forEach((f, i) => {
      f.scale.y = (strong ? 1.3 : 1) * (0.8 + Math.sin(t * 18 + i * 1.7) * 0.25);
    });
  });
  return (
    <group>
      <mesh position={[0, 0.03, 0]} material={M.burner}>
        <cylinderGeometry args={[0.75, 0.8, 0.06, 32]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation-x={PI / 2} material={M.burner}>
        <torusGeometry args={[0.45, 0.04, 8, 32]} />
      </mesh>
      <group ref={flames}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.42, 0.13, Math.sin(a) * 0.42]}
              material={M.flame}
            >
              <coneGeometry args={[0.04, 0.14, 8]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function Pot({ liquid, children }: { liquid: THREE.Material; children?: ReactNode }) {
  const profile = useMemo(
    () =>
      [
        [0.62, 0.1],
        [0.66, 0.12],
        [0.68, 0.75],
        [0.72, 0.8],
        [0.65, 0.8],
        [0.6, 0.15],
        [0, 0.15],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  return (
    <group position={[0, 0.06, 0]}>
      <mesh material={M.pot} castShadow>
        <latheGeometry args={[profile, 40]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.8, 0.62, 0]} material={M.pot}>
          <boxGeometry args={[0.18, 0.06, 0.16]} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation-x={-PI / 2} material={liquid}>
        <circleGeometry args={[0.6, 32]} />
      </mesh>
      {children}
    </group>
  );
}

function Pan({ children, deep = false }: { children?: ReactNode; deep?: boolean }) {
  const profile = useMemo(
    () =>
      [
        [0.75, 0.05],
        [0.8, 0.07],
        [0.88, deep ? 0.3 : 0.2],
        [0.84, deep ? 0.3 : 0.2],
        [0.72, 0.09],
        [0, 0.09],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [deep],
  );
  return (
    <group position={[0, 0.08, 0]}>
      <mesh material={M.pan} castShadow>
        <latheGeometry args={[profile, 40]} />
      </mesh>
      <mesh position={[1.25, 0.2, 0]} rotation-z={0.12} material={M.handle}>
        <boxGeometry args={[0.8, 0.07, 0.12]} />
      </mesh>
      {children}
    </group>
  );
}

/** 위로 올라가며 사라지는 김 */
function Steam({
  play,
  count = 6,
  y = 0.9,
  spread = 0.4,
}: {
  play: boolean;
  count?: number;
  y?: number;
  spread?: number;
}) {
  const g = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    g.current?.children.forEach((c, i) => {
      const p = (t * 0.35 + i / count) % 1;
      c.position.set(
        Math.sin(i * 2.3 + t) * spread * (0.3 + p),
        y + p * 1.2,
        Math.cos(i * 1.7) * spread * 0.4,
      );
      c.scale.setScalar(0.12 + p * 0.25);
      ((c as THREE.Mesh).material as THREE.Material).opacity = 0.45 * (1 - p);
    });
  });
  const mats = useMemo(() => Array.from({ length: count }, () => M.steam.clone()), [count]);
  return (
    <group ref={g}>
      {mats.map((m, i) => (
        <mesh key={i} material={m} position={[0, y, 0]}>
          <sphereGeometry args={[1, 12, 10]} />
        </mesh>
      ))}
    </group>
  );
}

/** 국물에서 올라오는 거품 */
function Bubbles({
  play,
  y,
  r,
  fast = false,
}: {
  play: boolean;
  y: number;
  r: number;
  fast?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    g.current?.children.forEach((c, i) => {
      const p = (t * (fast ? 2.2 : 1.1) + i * 0.37) % 1;
      const a = i * 2.4;
      c.position.set(
        Math.cos(a) * r * ((i % 3) / 3 + 0.2),
        y + p * 0.05,
        Math.sin(a) * r * ((i % 3) / 3 + 0.2),
      );
      c.scale.setScalar(0.025 + p * 0.03);
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={M.bubble} position={[0, y, 0]}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Spread({
  ids,
  r,
  y,
  s,
  bob = 0,
  play,
  t0 = 0,
}: {
  ids: string[];
  r: number;
  y: number;
  s: number;
  bob?: number;
  play: boolean;
  t0?: number;
}) {
  const g = useRef<THREE.Group>(null);
  useTick(play && bob > 0, (t) => {
    g.current?.children.forEach((c, i) => {
      c.position.y = y + Math.sin(t * 3 + i + t0) * bob;
      c.rotation.y = t * 0.6 + i;
    });
  });
  return (
    <group ref={g}>
      {ids.map((id, i) => {
        const a = (i / Math.max(1, ids.length)) * PI * 2 + 0.4;
        const rr = ids.length === 1 ? 0 : r;
        return (
          <Food
            key={`${id}-${i}`}
            food={id}
            s={s}
            position={[Math.cos(a) * rr, y, Math.sin(a) * rr]}
          />
        );
      })}
    </group>
  );
}

// ── 동작별 장면 ───────────────────────────────

function ChopScene({ ids, play }: { ids: string[]; play: boolean }) {
  const knife = useRef<THREE.Group>(null);
  const slices = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    const c = (t * 1.6) % 1;
    if (knife.current) {
      knife.current.position.y = 0.55 + Math.abs(Math.sin(t * 6)) * 0.35;
      knife.current.position.x = 0.2 + c * 0.6;
    }
    slices.current?.children.forEach((s, i) => (s.visible = i < Math.floor(c * 5)));
  });
  const main = ids[0];
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={M.board} castShadow>
        <boxGeometry args={[2.4, 0.12, 1.4]} />
      </mesh>
      {main && <Food food={main} s={0.7} position={[-0.25, 0.12, 0]} />}
      <group ref={slices}>
        {Array.from({ length: 5 }, (_, i) => (
          <Food
            key={i}
            food={main ?? ids[0]}
            s={0.22}
            position={[0.3 + i * 0.16, 0.12, 0.35]}
            rotation={[0, 0, PI / 2]}
          />
        ))}
      </group>
      {ids.slice(1, 4).map((id, i) => (
        <Food key={id} food={id} s={0.45} position={[-1.6 + i * 0.05, 0, -0.6 + i * 0.6]} />
      ))}
      <group ref={knife} position={[0.4, 0.7, 0]}>
        <mesh position={[0, 0, 0]} material={M.blade} castShadow>
          <boxGeometry args={[0.06, 0.32, 0.9]} />
        </mesh>
        <mesh position={[0, 0.06, -0.62]} material={M.handle}>
          <boxGeometry args={[0.08, 0.12, 0.4]} />
        </mesh>
      </group>
    </group>
  );
}

function BoilScene({
  ids,
  play,
  liquid = M.broth,
  fast = false,
}: {
  ids: string[];
  play: boolean;
  liquid?: THREE.Material;
  fast?: boolean;
}) {
  return (
    <group>
      <Burner play={play} strong={fast} />
      <Pot liquid={liquid}>
        <Spread ids={ids} r={0.3} y={0.5} s={0.45} bob={0.04} play={play} />
        <Bubbles play={play} y={0.62} r={0.55} fast={fast} />
      </Pot>
      <Steam play={play} y={0.95} />
    </group>
  );
}

function StirFryScene({ ids, play }: { ids: string[]; play: boolean }) {
  const pan = useRef<THREE.Group>(null);
  const food = useRef<THREE.Group>(null);
  const spatula = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    if (pan.current) pan.current.rotation.z = Math.sin(t * 4) * 0.08;
    food.current?.children.forEach((c, i) => {
      const p = (t * 1.3 + i * 0.27) % 1;
      c.position.y = 0.15 + Math.max(0, Math.sin(p * PI)) * 0.55;
      c.rotation.x = p * PI * 2;
    });
    if (spatula.current) spatula.current.rotation.y = Math.sin(t * 3) * 0.6;
  });
  return (
    <group>
      <Burner play={play} strong />
      <group ref={pan}>
        <Pan>
          <group ref={food}>
            {ids.map((id, i) => (
              <Food
                key={`${id}-${i}`}
                food={id}
                s={0.42}
                position={[Math.cos(i * 2.1) * 0.38, 0.15, Math.sin(i * 2.1) * 0.32]}
              />
            ))}
          </group>
        </Pan>
      </group>
      <group ref={spatula} position={[0, 0.5, 0]}>
        <mesh position={[0.25, 0.25, 0.1]} rotation-z={0.9} material={M.spoon}>
          <boxGeometry args={[0.7, 0.05, 0.08]} />
        </mesh>
      </group>
      <Steam play={play} count={4} y={0.5} spread={0.5} />
    </group>
  );
}

function GrillScene({ ids, play }: { ids: string[]; play: boolean }) {
  const flip = useRef<THREE.Group>(null);
  const sparks = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    const c = (t * 0.5) % 1;
    if (flip.current) {
      const f = c > 0.75 ? (c - 0.75) / 0.25 : 0;
      flip.current.position.y = 0.15 + Math.sin(f * PI) * 0.5;
      flip.current.rotation.x = f * PI;
    }
    sparks.current?.children.forEach((s, i) => {
      const p = (t * 2 + i * 0.3) % 1;
      s.position.set(Math.cos(i * 2.2) * 0.5 * p, 0.2 + p * 0.25, Math.sin(i * 2.2) * 0.45 * p);
      s.scale.setScalar(0.02 * (1 - p));
    });
  });
  return (
    <group>
      <Burner play={play} />
      <Pan>
        <group ref={flip} position={[0, 0.15, 0]}>
          {ids[0] && <Food food={ids[0]} s={0.75} />}
        </group>
        {ids.slice(1, 3).map((id, i) => (
          <Food key={id} food={id} s={0.3} position={[i ? 0.45 : -0.45, 0.1, 0.2]} />
        ))}
        <group ref={sparks}>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} material={M.spark}>
              <sphereGeometry args={[1, 6, 4]} />
            </mesh>
          ))}
        </group>
      </Pan>
    </group>
  );
}

function MixScene({ ids, play }: { ids: string[]; play: boolean }) {
  const swirl = useRef<THREE.Group>(null);
  const spoon = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    if (swirl.current) swirl.current.rotation.y = t * 1.6;
    if (spoon.current) spoon.current.rotation.y = -t * 1.6;
  });
  const profile = useMemo(
    () =>
      [
        [0.3, 0],
        [0.75, 0.15],
        [0.9, 0.55],
        [0.86, 0.56],
        [0.7, 0.18],
        [0, 0.14],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  return (
    <group>
      <mesh material={M.bowl} castShadow>
        <latheGeometry args={[profile, 40]} />
      </mesh>
      <group ref={swirl}>
        <Spread ids={ids} r={0.35} y={0.2} s={0.42} play={false} />
      </group>
      <group ref={spoon}>
        <group position={[0.35, 0.55, 0]} rotation={[0, 0, 0.5]}>
          <mesh material={M.spoon}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 8]} />
          </mesh>
          <mesh position={[0, -0.6, 0]} scale={[1, 0.4, 1]} material={M.spoon}>
            <sphereGeometry args={[0.12, 12, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function SoakScene({ ids, play }: { ids: string[]; play: boolean }) {
  const hand = useRef<THREE.Mesh>(null);
  useTick(play, (t) => {
    if (hand.current) hand.current.rotation.z = -t * 1.5;
  });
  const profile = useMemo(
    () =>
      [
        [0.3, 0],
        [0.75, 0.15],
        [0.9, 0.55],
        [0.86, 0.56],
        [0.7, 0.18],
        [0, 0.14],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  return (
    <group>
      <group position={[-0.4, 0, 0]}>
        <mesh material={M.bowl}>
          <latheGeometry args={[profile, 40]} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation-x={-PI / 2} material={M.water}>
          <circleGeometry args={[0.8, 32]} />
        </mesh>
        <Spread ids={ids} r={0.3} y={0.2} s={0.3} bob={0.02} play={play} />
      </group>
      <group position={[1.2, 0.75, -0.3]}>
        <mesh rotation-x={PI / 2} material={M.clockRim}>
          <cylinderGeometry args={[0.42, 0.42, 0.12, 32]} />
        </mesh>
        <mesh position={[0, 0, 0.065]} material={M.clockFace}>
          <circleGeometry args={[0.36, 32]} />
        </mesh>
        <mesh ref={hand} position={[0, 0, 0.08]} material={M.hand}>
          <boxGeometry args={[0.04, 0.3, 0.02]} />
        </mesh>
      </group>
    </group>
  );
}

function AddScene({ ids, play }: { ids: string[]; play: boolean }) {
  const drops = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    drops.current?.children.forEach((c, i) => {
      const p = (t * 0.6 + i / Math.max(1, ids.length)) % 1;
      c.position.y = 2.2 - p * 1.7;
      c.position.x = Math.sin(i * 2) * 0.2;
      c.rotation.x = p * PI;
      c.visible = p < 0.95;
    });
  });
  return (
    <group>
      <Burner play={play} />
      <Pot liquid={M.broth}>
        <Bubbles play={play} y={0.62} r={0.55} />
      </Pot>
      <group ref={drops}>
        {ids.map((id, i) => (
          <Food key={`${id}-${i}`} food={id} s={0.45} position={[0, 1.6, 0]} />
        ))}
      </group>
    </group>
  );
}

function ServeScene({ ids, play }: { ids: string[]; play: boolean }) {
  const turn = useRef<THREE.Group>(null);
  useTick(play, (t) => {
    if (turn.current) turn.current.rotation.y = t * 0.4;
  });
  return (
    <group ref={turn}>
      <mesh position={[0, 0.03, 0]} material={M.plate} castShadow>
        <cylinderGeometry args={[1.0, 0.8, 0.06, 40]} />
      </mesh>
      <mesh position={[0, 0.065, 0]} material={M.plate}>
        <cylinderGeometry args={[0.75, 0.75, 0.01, 40]} />
      </mesh>
      <Spread ids={ids} r={0.38} y={0.07} s={0.55} play={false} />
    </group>
  );
}

function ApplianceScene({
  ids,
  play,
  kind,
}: {
  ids: string[];
  play: boolean;
  kind: "microwave" | "air_fryer" | "oven";
}) {
  const plate = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  useTick(play, (t) => {
    if (plate.current) plate.current.rotation.y = t * 1.2;
    if (glow.current)
      (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.7 + Math.sin(t * 5) * 0.3;
  });
  const isFryer = kind === "air_fryer";
  return (
    <group>
      {isFryer ? (
        <group>
          <mesh position={[0, 0.75, 0]} material={M.applianceDark} castShadow>
            <boxGeometry args={[1.4, 1.5, 1.3]} />
          </mesh>
          <mesh position={[0, 0.5, 0.66]} material={M.applianceDark}>
            <boxGeometry args={[1.1, 0.7, 0.1]} />
          </mesh>
          <mesh position={[0, 1.25, 0.66]} material={M.glow} ref={glow}>
            <boxGeometry args={[0.6, 0.12, 0.02]} />
          </mesh>
          <group position={[0, 0.25, 1.1]} ref={plate}>
            <Spread ids={ids} r={0.25} y={0} s={0.28} play={false} />
          </group>
        </group>
      ) : (
        <group>
          <mesh
            position={[0, 0.7, -0.1]}
            material={kind === "oven" ? M.applianceDark : M.appliance}
            castShadow
          >
            <boxGeometry args={[2.2, 1.4, 1.4]} />
          </mesh>
          <mesh position={[-0.25, 0.7, 0.62]} material={M.glow} ref={glow}>
            <boxGeometry args={[1.4, 1.0, 0.02]} />
          </mesh>
          <mesh position={[0.82, 0.7, 0.62]} material={M.applianceDark}>
            <boxGeometry args={[0.4, 1.1, 0.02]} />
          </mesh>
          <group position={[-0.25, 0.25, -0.05]} ref={plate}>
            <mesh material={M.plate}>
              <cylinderGeometry args={[0.55, 0.55, 0.03, 32]} />
            </mesh>
            <Spread ids={ids} r={0.25} y={0.02} s={0.28} play={false} />
          </group>
        </group>
      )}
    </group>
  );
}

/** 조리 동작 하나를 보여 주는 장면 */
export function CookingScene({
  action,
  ids,
  play,
}: {
  action: CookAction;
  ids: string[];
  play: boolean;
}) {
  const scene = (() => {
    switch (action) {
      case "chop":
        return <ChopScene ids={ids} play={play} />;
      case "boil":
        return <BoilScene ids={ids} play={play} />;
      case "fry":
        return <BoilScene ids={ids} play={play} liquid={M.oil} fast />;
      case "steam":
        return (
          <group>
            <BoilScene ids={[]} play={play} liquid={M.water} />
            <group position={[0, 0.95, 0]}>
              <mesh material={M.board}>
                <cylinderGeometry args={[0.7, 0.7, 0.35, 32, 1, true]} />
              </mesh>
              <Spread ids={ids} r={0.3} y={-0.1} s={0.3} play={false} />
            </group>
            <Steam play={play} count={8} y={1.2} />
          </group>
        );
      case "stirfry":
        return <StirFryScene ids={ids} play={play} />;
      case "grill":
        return <GrillScene ids={ids} play={play} />;
      case "mix":
        return <MixScene ids={ids} play={play} />;
      case "soak":
        return <SoakScene ids={ids} play={play} />;
      case "add":
        return <AddScene ids={ids} play={play} />;
      case "microwave":
      case "air_fryer":
      case "oven":
        return <ApplianceScene ids={ids} play={play} kind={action} />;
      default:
        return <ServeScene ids={ids} play={play} />;
    }
  })();
  return (
    <group>
      <hemisphereLight args={["#ffffff", "#d9c9b3", 1.4]} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <directionalLight position={[0, 2, 8]} intensity={0.6} />
      <Counter />
      {scene}
    </group>
  );
}

/** 요리 완료: 재료가 하나씩 냄비로 떨어지고 끓는다 (한 번만) */
export function PotDrop({ ingredients }: { ingredients: PotIngredient[] }) {
  const drops = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const ms = (clock.elapsedTime - start.current) * 1000;
    drops.current?.children.forEach((c, i) => {
      const p = Math.min(1, Math.max(0, (ms - i * STAGGER_MS) / DROP_MS));
      // 위에서 포물선을 그리며 떨어져 냄비 속으로 사라진다
      c.position.set(
        Math.sin(i * 2.1) * 0.9 * (1 - p),
        2.4 - p * 1.95 + Math.sin(p * PI) * 0.5,
        Math.cos(i * 2.1) * 0.4 * (1 - p),
      );
      c.rotation.set(p * PI * 1.5, p * 2, 0);
      c.visible = p < 1;
    });
  });
  return (
    <group>
      <hemisphereLight args={["#ffffff", "#d9c9b3", 1.4]} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <directionalLight position={[0, 2, 8]} intensity={0.6} />
      <Counter />
      <Burner play strong />
      <Pot liquid={M.broth}>
        <Bubbles play y={0.62} r={0.55} fast />
      </Pot>
      <Steam play count={8} y={0.95} spread={0.5} />
      <group ref={drops}>
        {ingredients.map((ing) => (
          <PotFood key={ing.key} ingredientId={ing.ingredientId} category={ing.category} />
        ))}
      </group>
    </group>
  );
}

function PotFood({ ingredientId, category }: Pick<PotIngredient, "ingredientId" | "category">) {
  const { key, spec } = ingredientSpec(ingredientId, category);
  const model = useMemo(() => ingredientModel(key, spec), [key, spec]);
  return (
    <group position={[0, 2.4, 0]}>
      <primitive object={model} scale={0.55} />
    </group>
  );
}
