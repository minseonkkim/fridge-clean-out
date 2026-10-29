"use client";

import { Canvas } from "@react-three/fiber";
import type { PotIngredient } from "@/components/cook-pot";
import { renderDpr } from "@/components/fridge3d/layout";
import { PotDrop } from "./stage-world";

/** 요리 완료 냄비 장면 (화면 전체) */
export default function PotScene({ ingredients }: { ingredients: PotIngredient[] }) {
  return (
    <Canvas
      flat
      frameloop="always"
      dpr={renderDpr()}
      camera={{ fov: 40, position: [0, 3.0, 3.8], near: 0.1, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.6, 0)}
      gl={{ antialias: true, powerPreference: "low-power" }}
    >
      <color attach="background" args={["#f6efe4"]} />
      <PotDrop ingredients={ingredients} />
    </Canvas>
  );
}
