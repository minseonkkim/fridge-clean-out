"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { renderDpr } from "./layout";
import { FridgeWorld, type WorldState } from "./world";

const INTRO_KEY = "naengteol:intro";

/** 이번 방문(탭)에서 인트로를 이미 봤는지 */
export function introSeen(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(INTRO_KEY) === "seen";
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "seen");
  } catch {
    // 저장하지 못하면 다음에 다시 볼 뿐이다
  }
}

/** 걷기 → 문 열기 → 냉장고 안 보기 (초) */
const WALK_END = 2.6;
const DOOR_AT = 2.7;
const LOOK_END = 4.2;
const FADE_MS = 500;

const start = new THREE.Vector3(0.1, 1.7, 10.5);
const end = new THREE.Vector3(0.15, 2.05, 4.9);
const look = new THREE.Vector3(0.1, 1.85, 0);
const insideLook = new THREE.Vector3(0.1, 2.1, 0);

function IntroCamera({ onDoor, onEnd }: { onDoor: () => void; onEnd: () => void }) {
  const t0 = useRef<number | null>(null);
  const fired = useRef({ door: false, end: false });
  useFrame(({ camera, clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    const w = Math.min(1, t / WALK_END);
    // 걸음: 처음과 끝은 천천히, 머리가 위아래로 살짝 흔들린다
    const ease = w < 0.5 ? 2 * w * w : 1 - Math.pow(-2 * w + 2, 2) / 2;
    camera.position.lerpVectors(start, end, ease);
    camera.position.y += Math.sin(t * 9) * 0.045 * (1 - ease);
    camera.position.x += Math.sin(t * 4.5) * 0.03 * (1 - ease);
    const l = Math.min(1, Math.max(0, (t - DOOR_AT) / 1.2));
    camera.lookAt(new THREE.Vector3().lerpVectors(look, insideLook, l));
    if (t >= DOOR_AT && !fired.current.door) {
      fired.current.door = true;
      onDoor();
    }
    if (t >= LOOK_END && !fired.current.end) {
      fired.current.end = true;
      onEnd();
    }
  });
  return null;
}

/**
 * 앱을 열면 냉장고로 걸어가 문을 여는 인트로 (이번 방문에 한 번).
 * 끝나면 화면이 걷히며 같은 냉장고가 열린 채로 나온다. 건너뛸 수 있다.
 */
export function Intro({ world, onDone }: { world: WorldState; onDone: () => void }) {
  const [doorOpen, setDoorOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDone, FADE_MS);
  };
  return (
    <div
      role="dialog"
      aria-label="냉장고로 가는 중"
      data-intro
      className={`fixed inset-0 z-50 bg-[#f6efe4] transition-opacity dark:bg-[#14161a] ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <Canvas
        flat
        frameloop="always"
        dpr={renderDpr()}
        camera={{ fov: 50, position: start.toArray(), near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: "low-power" }}
        aria-hidden
      >
        <color attach="background" args={[world.dark ? "#14161a" : "#f6efe4"]} />
        <FridgeWorld state={{ ...world, doorOpen }} overlay={null} />
        <IntroCamera onDoor={() => setDoorOpen(true)} onEnd={finish} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+2rem)] text-center text-2xl font-bold text-neutral-800 drop-shadow dark:text-neutral-100">
        냉털 레시피
      </p>
      <button
        type="button"
        onClick={finish}
        className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] min-h-11 rounded-full bg-white/90 px-5 text-sm font-semibold text-neutral-800 shadow-lg dark:bg-neutral-800/90 dark:text-neutral-100"
      >
        건너뛰기
      </button>
    </div>
  );
}
