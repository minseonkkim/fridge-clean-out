"use client";

import { useLayoutEffect, useRef } from "react";
import { UiArt } from "@/components/ui-art";

export interface PotIngredient {
  key: string;
  /** 재료 그림 주소 (ingredientArtUrl) */
  icon: string;
  /** 재료가 출발하는 화면 위치 */
  from: { x: number; y: number; width: number; height: number };
}

const FLY_MS = 650;
const STAGGER_MS = 90;

/**
 * 요리 완료: 쓸 재료가 냄비로 모여든 뒤 끓는다 (기획서 3.2절).
 * 움직임 줄이기 설정이면 그리지 않고 바로 끝낸다.
 */
export function CookPot({
  ingredients,
  onDone,
}: {
  ingredients: PotIngredient[];
  onDone: () => void;
}) {
  const potRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLSpanElement>());
  const doneRef = useRef(onDone);
  useLayoutEffect(() => {
    doneRef.current = onDone;
  });

  useLayoutEffect(() => {
    const pot = potRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!pot || reduce || typeof pot.animate !== "function") {
      doneRef.current();
      return;
    }
    const p = pot.getBoundingClientRect();
    const px = p.left + p.width / 2;
    const py = p.top + p.height * 0.35;
    const anims = ingredients.map((ing, i) => {
      const el = itemRefs.current.get(ing.key)!;
      const dx = px - (ing.from.x + ing.from.width / 2);
      const dy = py - (ing.from.y + ing.from.height / 2);
      return el.animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(1.1)`, opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0 },
        ],
        {
          duration: FLY_MS,
          delay: i * STAGGER_MS,
          easing: "cubic-bezier(0.3, 0.6, 0.4, 1)",
          fill: "both",
        },
      );
    });
    const bubble = pot.animate(
      [
        { transform: "scale(1) rotate(0deg)" },
        { transform: "scale(1.12) rotate(-4deg)" },
        { transform: "scale(1.05) rotate(4deg)" },
        { transform: "scale(1) rotate(0deg)" },
      ],
      { duration: 420, delay: FLY_MS + (ingredients.length - 1) * STAGGER_MS, easing: "ease-out" },
    );
    bubble.onfinish = () => doneRef.current();
    return () => {
      anims.forEach((a) => a.cancel());
      bubble.cancel();
    };
  }, [ingredients]);

  return (
    <div
      aria-hidden
      data-cook-pot
      className="pointer-events-none fixed inset-0 z-50 bg-black/20 motion-reduce:hidden"
    >
      {ingredients.map((ing) => (
        <span
          key={ing.key}
          ref={(el) => {
            if (el) itemRefs.current.set(ing.key, el);
            else itemRefs.current.delete(ing.key);
          }}
          data-pot-ingredient
          className="absolute flex items-center justify-center"
          style={{
            left: ing.from.x,
            top: ing.from.y,
            width: ing.from.width,
            height: ing.from.height,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 코드로 만든 SVG data URL */}
          <img src={ing.icon} alt="" className="size-10" />
        </span>
      ))}
      <div
        ref={potRef}
        className="absolute bottom-1/3 left-1/2 -ml-14 flex size-28 items-center justify-center"
      >
        <UiArt name="pot" className="size-28" />
      </div>
    </div>
  );
}
