"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { INGREDIENT_SPEC } from "@/data/ingredient-art";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { ingredientModel } from "@/three/models";

const COLS = 16;

export default function ModelGallery() {
  const items = useMemo(
    () =>
      Object.entries(INGREDIENT_SPEC).map(([id, spec], i) => ({
        id,
        name: INGREDIENT_BY_ID.get(id)?.name ?? id,
        obj: ingredientModel(id, spec),
        x: (i % COLS) * 1.5 - (COLS * 1.5) / 2,
        z: Math.floor(i / COLS) * 1.6,
      })),
    [],
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "#eef2f4" }}>
      <Canvas camera={{ position: [0, 14, 22], fov: 40 }} dpr={1.5}>
        <hemisphereLight args={["#ffffff", "#c8d0d4", 1.6]} />
        <directionalLight position={[5, 10, 8]} intensity={1.6} />
        {items.map((it) => (
          <group key={it.id} position={[it.x, 0, it.z]}>
            <primitive object={it.obj} />
            <Html
              position={[0, -0.05, 0.6]}
              center
              style={{ fontSize: 9, whiteSpace: "nowrap", color: "#333" }}
            >
              {it.name}
            </Html>
          </group>
        ))}
        <OrbitControls target={[0, 0, 12]} />
      </Canvas>
    </div>
  );
}
