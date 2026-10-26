import { expect, test } from "@playwright/test";

/**
 * 완료 기준 1: 재료 등록 → 플랜 확인 → 요리 완료 → 장보기까지 목록 화면만으로 끝까지 동작한다.
 * (로그인은 Supabase 연결 뒤에 확인한다. 여기서는 체험 모드로 같은 흐름을 검증한다.)
 */
test("처음부터 끝까지: 등록 → 식단 → 요리 완료 → 장보기 → 냉장고에 넣기", async ({ page }) => {
  // 1. 랜딩에서 시작
  await page.goto("/");
  await page.getByRole("link", { name: "로그인 없이 시작" }).click();
  await expect(page).toHaveURL(/\/fridge$/);

  // 2. 재료 등록 (한 번에 여러 개)
  await page.getByRole("button", { name: "재료 추가" }).click();
  const sheet = page.getByRole("dialog", { name: "재료 추가" });
  await sheet.getByRole("radio", { name: "한 번에 여러 개" }).click();
  await sheet.getByRole("textbox").fill("김치 500g, 돼지고기 150g, 숙주 200g, 계란 10");
  await sheet.getByRole("button", { name: "4개 냉장고에 넣기" }).click();
  await expect(page.getByText("재료 4개")).toBeVisible();

  // 3. 식단 확인
  const nav = page.getByRole("navigation", { name: "주 메뉴" });
  await nav.getByRole("link", { name: "식단" }).click();
  await expect(page.getByRole("region", { name: "요약" })).toContainText(/\d일 동안 \d+끼 가능/);

  // 4. 김치찌개 요리 완료 → 돼지고기를 다 씀
  await page.goto("/recipes/kimchi_stew");
  await page.getByRole("button", { name: "요리 완료" }).click();
  await page
    .getByRole("dialog", { name: "이 재료를 냉장고에서 뺄게요" })
    .getByRole("button", { name: "김치찌개 완료" })
    .click();
  await expect(page.getByRole("status", { name: "요리 완료 결과" })).toContainText("완료!");

  // 5. 김치찌개를 다시 하려면 고기가 필요하다 → 레시피에서 바로 장보기에 담는다
  await expect(page.getByRole("status", { name: "요리 가능 여부" })).toHaveText(
    "필수 재료 1가지가 없어요",
  );
  await page.getByRole("button", { name: /부족한 재료 장보기에 담기/ }).click();
  await expect(page.getByRole("status", { name: "장보기 담기 결과" })).toHaveText(
    "장보기 목록에 1개 담았어요.",
  );
  await nav.getByRole("link", { name: "장보기" }).click();
  const list = page.getByRole("list", { name: "장보기 목록" });
  await expect(list).toContainText("돼지고기");

  // 6. 장 보고 냉장고에 넣기
  await list.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "체크한 1개 냉장고에 넣기" }).click();
  await nav.getByRole("link", { name: "냉장고" }).click();
  await expect(page.getByRole("region", { name: /아래 선반/ })).toContainText("돼지고기");
});
