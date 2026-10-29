import type { Ingredient, Recipe, Tool } from "@/lib/domain/types";

/**
 * 조리 단계를 3D로 보여 주기 위한 동작 분류.
 * 레시피 232개의 단계를 하나씩 연출할 수는 없으므로, 단계 문장에서 동작을 읽어 몇 가지 장면으로 나눈다.
 */
export type CookAction =
  | "chop" // 썰기·다지기
  | "boil" // 끓이기·삶기·데치기
  | "stirfry" // 볶기
  | "grill" // 굽기·부치기
  | "fry" // 튀기기
  | "steam" // 찌기
  | "mix" // 섞기·무치기·버무리기
  | "soak" // 불리기·재우기·절이기·식히기 (기다리기)
  | "add" // 넣기
  | "serve" // 담기·올리기·곁들이기
  | Tool; // 전자레인지·에어프라이어·오븐

/** 먼저 맞는 규칙이 이긴다: 가전 → 튀기기 → 볶기 → 굽기 → 끓이기 → 찌기 → 썰기 → 섞기 → 기다리기 → 넣기 → 담기 */
const RULES: [CookAction, RegExp][] = [
  ["microwave", /전자레인지/],
  ["air_fryer", /에어프라이어/],
  ["oven", /오븐/],
  ["fry", /튀기|튀겨|튀긴|튀김옷/],
  ["stirfry", /볶|스크램블|익힌|익혀/],
  ["grill", /굽|구워|구운|부치|부쳐|부친|지지|노릇/],
  ["boil", /끓|삶|데치|데쳐|데친|우려|육수|졸이|졸여|졸인|조리/],
  ["steam", /찌[고는다]|쪄|찜기|찐다/],
  [
    "chop",
    /씻|닦|짠다|짜고|짜서|떼고|떼어|빼고|뺀다|썰|썬다|썬 |다지|다져|다진다|자르|잘라|자른|깍둑|송송|어슷|손질|껍질|갈라|발라|뜯|으깨/,
  ],
  [
    "mix",
    /양념장?을 만|간한다|간해|섞|무치|무쳐|무친|버무|비벼|비비|비빈|저어|젓|풀어|치대|반죽|갈아|간다/,
  ],
  [
    "soak",
    /불리|불려|불린|재우|재워|재운|절이|절여|절인|담가|해감|식히|식혀|식힌|숙성|두고|둔다|기다/,
  ],
  ["add", /넣/],
  ["serve", /올리|올린|담|곁들|뿌리|뿌린|붓|부어|두르|얹/],
];

export function classifyStep(text: string): CookAction {
  for (const [action, re] of RULES) if (re.test(text)) return action;
  return "serve";
}

/** 동작별 화면에 띄우는 짧은 이름 */
export const ACTION_LABEL: Record<CookAction, string> = {
  chop: "썰기",
  boil: "끓이기",
  stirfry: "볶기",
  grill: "굽기",
  fry: "튀기기",
  steam: "찌기",
  mix: "섞기",
  soak: "기다리기",
  add: "넣기",
  serve: "담기",
  microwave: "전자레인지",
  air_fryer: "에어프라이어",
  oven: "오븐",
};

/**
 * 단계 문장에 나오는 이 레시피의 재료. 이름·별칭이 문장에 있으면 그 재료로 본다.
 * 하나도 없으면 기본 양념이 아닌 필수 재료 앞의 두 개를 쓴다 (장면이 비지 않게).
 */
export function stepIngredients(
  recipe: Recipe,
  stepText: string,
  lookup: (id: string) => Ingredient | undefined,
  max = 4,
): string[] {
  const found: string[] = [];
  for (const ri of recipe.ingredients) {
    const ing = lookup(ri.ingredientId);
    if (!ing || found.includes(ing.id)) continue;
    const words = [ing.name, ...ing.aliases].filter((w) => w.length >= 1);
    // 한 글자 이름(무·파·김·깨·배·감·밤·쌀·콩·팥·마·잣·쑥·게)은 다른 낱말 속에 섞이기 쉬워 앞뒤가 낱말 경계일 때만 본다
    const hit = words.some((w) =>
      w.length === 1
        ? new RegExp(`(^|[\\s,·(])${w}([\\s,·)를을과와이가는은에도의]|$)`).test(stepText)
        : stepText.includes(w),
    );
    if (hit) found.push(ing.id);
  }
  // 양념(간장·소금 등)보다 진짜 재료를 먼저 보여 준다. 양념만 나오는 단계면 양념을 보여 준다.
  const main = found.filter((id) => !lookup(id)?.isPantryStaple);
  if (main.length > 0) return main.slice(0, max);
  if (found.length > 0) return found.slice(0, Math.min(max, 2));
  return recipe.ingredients
    .filter((ri) => ri.required && !lookup(ri.ingredientId)?.isPantryStaple)
    .map((ri) => ri.ingredientId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .slice(0, 2);
}
