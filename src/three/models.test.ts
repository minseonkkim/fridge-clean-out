import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CATEGORY_SPEC, INGREDIENT_SPEC } from "@/data/ingredient-art";
import { ingredientModel } from "./models";

function bounds(obj: THREE.Object3D) {
  obj.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(obj);
}

describe("재료 3D 모델", () => {
  it("모든 재료·분류 설계도로 모델을 만들 수 있고, 크기가 1에 맞춰져 바닥에 선다", () => {
    const bad: string[] = [];
    for (const [key, spec] of [
      ...Object.entries(INGREDIENT_SPEC),
      ...Object.entries(CATEGORY_SPEC),
    ]) {
      const b = bounds(ingredientModel(key, spec));
      const size = b.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      const finite = [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite);
      if (!finite || Math.abs(longest - 1) > 0.01 || Math.abs(b.min.y) > 0.01)
        bad.push(`${key} ${longest.toFixed(2)} ${b.min.y.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });

  it("같은 재료 모델은 도형과 재질을 함께 쓴다 (복제해도 GPU 자원이 늘지 않는다)", () => {
    const meshes = (o: THREE.Object3D) => {
      const out: THREE.Mesh[] = [];
      o.traverse((c) => c instanceof THREE.Mesh && out.push(c));
      return out;
    };
    const a = meshes(ingredientModel("apple", INGREDIENT_SPEC.apple));
    const b = meshes(ingredientModel("apple", INGREDIENT_SPEC.apple));
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((m) => m.geometry)).toEqual(b.map((m) => m.geometry));
    expect(a.map((m) => m.material)).toEqual(b.map((m) => m.material));
  });
});

describe("재료 3D 모델 그리기 비용", () => {
  it("재료 하나는 그리기 호출(메시) 4번 이하로 그린다 (재료 200개도 가볍게)", () => {
    const heavy: string[] = [];
    for (const [key, spec] of Object.entries(INGREDIENT_SPEC)) {
      let meshes = 0;
      ingredientModel(key, spec).traverse((o) => {
        if (o instanceof THREE.Mesh) meshes++;
      });
      if (meshes > 4) heavy.push(`${key}: ${meshes}`);
    }
    expect(heavy).toEqual([]);
  });
});
