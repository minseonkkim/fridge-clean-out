"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { addDays, todayIso } from "@/lib/domain/expiry";
import type { CompartmentSlot, FridgeItem } from "@/lib/domain/fridge";
import { groupBySlot } from "@/lib/domain/fridge-view";
import { renderDpr } from "./layout";
import { FridgeWorld } from "./world";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

/** 데모 냉장고에 넣어 둘 재료 (기한은 오늘 기준 며칠 뒤) */
const SAMPLE: [string, number][] = [
  ["mung_bean_sprouts", 1],
  ["tofu", 2],
  ["egg", 20],
  ["kimchi", 40],
  ["milk", 6],
  ["apple", 14],
  ["green_onion", 9],
  ["pork", 3],
  ["dumplings", 120],
  ["onion", 25],
  ["soy_sauce", 300],
];

/** 랜딩의 3D 냉장고 데모 (누르면 문이 열린다) */
export default function DemoScene({
  open,
  reducedMotion,
}: {
  open: boolean;
  reducedMotion: boolean;
}) {
  const bySlot = useMemo(() => {
    const today = todayIso();
    const items: FridgeItem[] = SAMPLE.map(([id, days], i) => {
      const ing = lookup(id)!;
      return {
        id: `demo-${i}`,
        ingredientId: id,
        customName: null,
        slot: null,
        storage: ing.defaultStorage,
        quantity: ing.usePerRecipe,
        unit: ing.defaultUnit,
        purchasedAt: today,
        expiresAt: addDays(today, days),
        expiresManual: false,
        memo: null,
        status: "active",
        closedAt: null,
        createdAt: today,
        updatedAt: today,
      };
    });
    const map = new Map<CompartmentSlot, FridgeItem[]>();
    for (const s of groupBySlot(items, lookup)) map.set(s.slot, s.items);
    return map;
  }, []);
  return (
    <Canvas
      flat
      frameloop="demand"
      resize={{ scroll: false }}
      dpr={renderDpr()}
      camera={{ fov: 36, position: [0.25, 2.6, 7.4], near: 0.1, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(0.15, 1.85, 0)}
      gl={{ antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <color attach="background" args={["#f6efe4"]} />
      <FridgeWorld
        state={{
          bySlot,
          doorOpen: open,
          drawers: { freezer_upper: false, freezer_lower: false },
          highlight: null,
          poppingId: null,
          reducedMotion,
          dark: false,
        }}
        overlay={null}
      />
    </Canvas>
  );
}
