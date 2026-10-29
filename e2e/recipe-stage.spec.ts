import { expect, test } from "./fixtures";

test.describe("조리 과정 3D", () => {
  test("단계마다 동작(썰기·볶기…)과 그 단계의 재료를 3D 장면으로 보여 주고, 단계를 넘길 수 있다", async ({
    page,
  }) => {
    await page.goto("/recipes/kimchi_fried_rice");
    const stage = page.getByRole("region", { name: "조리 과정 3D" });
    await expect(stage).toBeVisible();

    // 1단계: 김치와 햄, 양파를 잘게 썬다 → 썰기
    await expect(stage).toContainText("1/4 · 썰기");
    await expect(stage).toContainText("김치와 햄, 양파를 잘게 썬다.");
    await expect(stage).toContainText("이 단계 재료: 배추김치, 햄, 양파");
    await expect(stage).toHaveAttribute("data-action", "chop");
    await expect(stage.getByRole("button", { name: "이전 단계" })).toBeDisabled();

    await stage.getByRole("button", { name: "다음 단계" }).click();
    await expect(stage).toContainText("2/4 · 볶기");
    await expect(stage).toHaveAttribute("data-action", "stirfry");

    // 아래 단계 목록의 번호를 눌러도 장면이 바뀐다
    await page.getByRole("button", { name: "4단계 3D로 보기" }).click();
    await expect(stage).toContainText("4/4");
    await expect(page.getByRole("button", { name: "4단계 3D로 보기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(stage.getByRole("button", { name: "다음 단계" })).toBeDisabled();
  });

  test("가전이 필요한 단계는 그 가전 장면이다", async ({ page }) => {
    await page.goto("/recipes/air_fryer_wings");
    await page.getByRole("button", { name: "2단계 3D로 보기" }).click();
    await expect(page.getByRole("region", { name: "조리 과정 3D" })).toHaveAttribute(
      "data-action",
      "air_fryer",
    );
  });
});
