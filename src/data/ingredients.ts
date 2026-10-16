import type { Ingredient, IngredientCategory, Storage, Unit } from "../lib/domain/types.ts";

/**
 * 재료 사전 (MVP 목표 150종 이상).
 *
 * 이 파일이 원본이다. DB 시드는 `npm run gen:seed`로 이 파일에서 생성한다.
 *
 * 보관 일수 기준
 * - 사 온 상태(통째, 미개봉) 그대로 그 방식으로 보관했을 때의 권장 일수다.
 * - 개봉 후 냉장 보관이 기본인 소스류는 냉장 일수에 개봉 후 기준을 쓴다.
 * - 0은 그 방식을 권장하지 않는다는 뜻이다 (예: 감자 냉장, 두부 실온).
 * - 값은 일반적인 보관 지침을 보수적으로(짧게) 잡은 것이다. 출처는 모두 'manual'이며,
 *   식약처·USDA FoodKeeper 대조는 로드맵의 후속 항목이다.
 */

type Days = [fridge: number, freezer: number, room: number];

interface Options {
  staple?: boolean;
}

function ing(
  id: string,
  name: string,
  category: IngredientCategory,
  defaultUnit: Unit,
  usePerRecipe: number,
  [fridge, freezer, room]: Days,
  defaultStorage: Storage,
  aliases: string[] = [],
  options: Options = {},
): Ingredient {
  return {
    id,
    name,
    category,
    aliases,
    defaultUnit,
    usePerRecipe,
    shelfDays: { fridge, freezer, room },
    defaultStorage,
    iconKey: id,
    source: "manual",
    isPantryStaple: options.staple ?? false,
  };
}

const staple: Options = { staple: true };

export const INGREDIENTS: Ingredient[] = [
  // ── 채소 ────────────────────────────────────
  ing("onion", "양파", "vegetable", "ea", 0.5, [30, 180, 30], "room", ["햇양파", "적양파"]),
  ing("green_onion", "대파", "vegetable", "ea", 0.5, [14, 90, 0], "fridge", ["파", "흰대파"]),
  ing("scallion", "쪽파", "vegetable", "bunch", 0.3, [7, 60, 0], "fridge", ["실파"]),
  ing("garlic", "마늘", "vegetable", "g", 15, [21, 180, 0], "fridge", ["깐마늘", "통마늘"]),
  ing(
    "minced_garlic",
    "다진 마늘",
    "vegetable",
    "g",
    15,
    [14, 90, 0],
    "fridge",
    ["간마늘"],
    staple,
  ),
  ing("ginger", "생강", "vegetable", "g", 10, [21, 180, 0], "fridge", ["다진 생강"]),
  ing("potato", "감자", "vegetable", "ea", 1, [0, 0, 30], "room", ["햇감자", "알감자"]),
  ing("sweet_potato", "고구마", "vegetable", "ea", 1, [0, 0, 21], "room", [
    "밤고구마",
    "호박고구마",
  ]),
  ing("carrot", "당근", "vegetable", "ea", 0.5, [21, 180, 0], "fridge", ["흙당근"]),
  ing("cabbage", "양배추", "vegetable", "ea", 0.25, [21, 60, 0], "fridge", ["양배추 반통"]),
  ing("red_cabbage", "적양배추", "vegetable", "ea", 0.25, [21, 0, 0], "fridge", ["적채"]),
  ing("napa_cabbage", "배추", "vegetable", "ea", 0.25, [14, 0, 0], "fridge", [
    "알배추",
    "알배기배추",
  ]),
  ing("radish", "무", "vegetable", "ea", 0.25, [14, 60, 0], "fridge", ["무우", "조선무"]),
  ing("young_radish", "열무", "vegetable", "g", 200, [4, 0, 0], "fridge"),
  ing("zucchini", "애호박", "vegetable", "ea", 0.5, [7, 60, 0], "fridge", ["호박", "주키니"]),
  ing("kabocha", "단호박", "vegetable", "ea", 0.5, [7, 90, 30], "room", ["밤호박"]),
  ing("cucumber", "오이", "vegetable", "ea", 1, [7, 0, 0], "fridge", ["백오이", "취청오이"]),
  ing("eggplant", "가지", "vegetable", "ea", 1, [5, 60, 0], "fridge"),
  ing("bell_pepper", "파프리카", "vegetable", "ea", 0.5, [10, 90, 0], "fridge", ["피망"]),
  ing("green_chili", "풋고추", "vegetable", "ea", 2, [10, 90, 0], "fridge", [
    "꽈리고추",
    "오이고추",
  ]),
  ing("cheongyang_chili", "청양고추", "vegetable", "ea", 2, [14, 180, 0], "fridge", [
    "고추",
    "홍고추",
  ]),
  ing("spinach", "시금치", "vegetable", "bunch", 1, [5, 60, 0], "fridge", ["포항초", "섬초"]),
  ing("lettuce", "상추", "vegetable", "g", 100, [5, 0, 0], "fridge", [
    "쌈채소",
    "로메인",
    "적상추",
  ]),
  ing("perilla_leaf", "깻잎", "vegetable", "pack", 0.5, [5, 0, 0], "fridge", ["들깻잎"]),
  ing("bean_sprouts", "콩나물", "vegetable", "g", 200, [3, 0, 0], "fridge"),
  ing("mung_bean_sprouts", "숙주", "vegetable", "g", 200, [2, 0, 0], "fridge", ["숙주나물"]),
  ing("broccoli", "브로콜리", "vegetable", "ea", 0.5, [7, 180, 0], "fridge"),
  ing("tomato", "토마토", "vegetable", "ea", 1, [7, 60, 5], "fridge", ["완숙토마토", "찰토마토"]),
  ing("cherry_tomato", "방울토마토", "vegetable", "g", 150, [10, 0, 3], "fridge", [
    "대추방울토마토",
  ]),
  ing("enoki", "팽이버섯", "vegetable", "pack", 1, [5, 30, 0], "fridge", ["팽이"]),
  ing("shiitake", "표고버섯", "vegetable", "g", 50, [7, 90, 0], "fridge", ["표고"]),
  ing("oyster_mushroom", "느타리버섯", "vegetable", "g", 100, [5, 30, 0], "fridge", ["느타리"]),
  ing("king_oyster", "새송이버섯", "vegetable", "ea", 1, [10, 30, 0], "fridge", ["새송이"]),
  ing("button_mushroom", "양송이버섯", "vegetable", "g", 100, [5, 30, 0], "fridge", ["양송이"]),
  ing("corn", "옥수수", "vegetable", "ea", 1, [3, 180, 1], "fridge", ["찰옥수수"]),
  ing("garlic_chives", "부추", "vegetable", "g", 100, [5, 30, 0], "fridge", ["정구지", "영양부추"]),
  ing("crown_daisy", "쑥갓", "vegetable", "g", 50, [4, 0, 0], "fridge"),
  ing("minari", "미나리", "vegetable", "g", 100, [5, 0, 0], "fridge"),
  ing("lotus_root", "연근", "vegetable", "g", 150, [10, 90, 0], "fridge"),
  ing("burdock", "우엉", "vegetable", "g", 100, [14, 90, 0], "fridge"),
  ing("bok_choy", "청경채", "vegetable", "g", 100, [5, 0, 0], "fridge"),
  ing("celery", "셀러리", "vegetable", "bunch", 0.2, [14, 0, 0], "fridge"),
  ing("asparagus", "아스파라거스", "vegetable", "g", 100, [4, 180, 0], "fridge"),
  ing("kale", "케일", "vegetable", "g", 50, [5, 0, 0], "fridge"),
  ing("bracken", "고사리", "vegetable", "g", 100, [5, 90, 0], "fridge", [
    "삶은 고사리",
    "고사리나물",
  ]),
  ing("bellflower_root", "도라지", "vegetable", "g", 100, [7, 0, 0], "fridge", ["깐도라지"]),
  ing("cilantro", "고수", "vegetable", "g", 20, [5, 0, 0], "fridge", ["실란트로"]),

  // ── 과일 ────────────────────────────────────
  ing("apple", "사과", "fruit", "ea", 1, [30, 0, 7], "fridge", ["부사", "홍로"]),
  ing("banana", "바나나", "fruit", "ea", 1, [0, 90, 5], "room"),
  ing("strawberry", "딸기", "fruit", "g", 200, [3, 180, 0], "fridge", ["설향"]),
  ing("orange", "오렌지", "fruit", "ea", 1, [21, 0, 7], "fridge"),
  ing("lemon", "레몬", "fruit", "ea", 0.5, [21, 90, 7], "fridge", ["라임"]),
  ing("grape", "포도", "fruit", "g", 300, [5, 180, 0], "fridge", ["샤인머스캣", "거봉", "청포도"]),
  ing("pear", "배", "fruit", "ea", 0.5, [30, 0, 7], "fridge", ["신고배"]),
  ing("kiwi", "키위", "fruit", "ea", 1, [21, 0, 5], "fridge", ["골드키위", "참다래"]),
  ing("blueberry", "블루베리", "fruit", "g", 100, [7, 180, 0], "fridge", ["냉동 블루베리"]),
  ing("mandarin", "귤", "fruit", "ea", 2, [14, 0, 7], "room", ["감귤", "한라봉", "천혜향"]),
  ing("peach", "복숭아", "fruit", "ea", 1, [5, 90, 2], "fridge", ["천도복숭아", "백도", "황도"]),
  ing("watermelon", "수박", "fruit", "g", 500, [5, 0, 7], "fridge", ["조각수박"]),
  ing("avocado", "아보카도", "fruit", "ea", 0.5, [5, 90, 4], "room"),
  ing("persimmon", "감", "fruit", "ea", 1, [14, 90, 7], "room", ["단감", "홍시", "연시"]),

  // ── 육류 ────────────────────────────────────
  ing("pork", "돼지고기", "meat", "g", 300, [3, 90, 0], "fridge", [
    "삼겹살",
    "목살",
    "앞다리살",
    "뒷다리살",
    "오겹살",
    "항정살",
    "제육용",
    "돼지목살",
  ]),
  ing("pork_mince", "다진 돼지고기", "meat", "g", 200, [2, 90, 0], "fridge", [
    "돼지 다짐육",
    "다진고기",
  ]),
  ing("pork_ribs", "돼지갈비", "meat", "g", 500, [3, 120, 0], "fridge", ["등갈비", "쪽갈비"]),
  ing("beef", "소고기", "meat", "g", 200, [3, 120, 0], "fridge", [
    "쇠고기",
    "불고기용",
    "차돌박이",
    "등심",
    "안심",
    "양지",
    "우둔",
    "국거리",
  ]),
  ing("beef_mince", "다진 소고기", "meat", "g", 150, [2, 90, 0], "fridge", ["소 다짐육"]),
  ing("chicken", "닭고기", "meat", "g", 500, [2, 270, 0], "fridge", ["생닭", "닭볶음탕용", "닭"]),
  ing("chicken_breast", "닭가슴살", "meat", "g", 200, [2, 270, 0], "fridge", ["닭안심"]),
  ing("chicken_thigh", "닭다리살", "meat", "g", 300, [2, 270, 0], "fridge", ["닭다리", "닭정육"]),
  ing("chicken_wings", "닭날개", "meat", "g", 300, [2, 270, 0], "fridge", ["닭봉", "윙"]),
  ing("duck", "오리고기", "meat", "g", 300, [3, 180, 0], "fridge", ["생오리"]),

  // ── 해산물 ──────────────────────────────────
  ing("mackerel", "고등어", "seafood", "ea", 1, [2, 90, 0], "fridge", [
    "자반고등어",
    "고등어 필렛",
  ]),
  ing("hairtail", "갈치", "seafood", "g", 300, [2, 90, 0], "fridge"),
  ing("pollack", "동태", "seafood", "g", 400, [2, 90, 0], "freezer", ["명태", "생태", "코다리"]),
  ing("salmon", "연어", "seafood", "g", 200, [2, 90, 0], "fridge", ["생연어", "연어회"]),
  ing("squid", "오징어", "seafood", "ea", 1, [2, 90, 0], "fridge", ["한치", "손질 오징어"]),
  ing("octopus", "낙지", "seafood", "ea", 1, [2, 90, 0], "fridge", ["주꾸미", "문어"]),
  ing("shrimp", "새우", "seafood", "g", 200, [2, 180, 0], "freezer", [
    "칵테일새우",
    "대하",
    "흰다리새우",
    "냉동새우",
  ]),
  ing("clam", "바지락", "seafood", "g", 300, [2, 90, 0], "fridge", ["조개", "모시조개"]),
  ing("mussel", "홍합", "seafood", "g", 500, [2, 90, 0], "fridge"),
  ing("oyster", "굴", "seafood", "g", 200, [2, 90, 0], "fridge", ["생굴"]),
  ing("dried_anchovy", "멸치", "seafood", "g", 30, [90, 365, 30], "fridge", [
    "볶음멸치",
    "국물멸치",
    "잔멸치",
  ]),
  ing("dried_pollack", "북어채", "seafood", "g", 50, [90, 365, 60], "fridge", ["황태채", "북어"]),
  ing("seaweed", "미역", "seafood", "g", 20, [0, 0, 180], "room", ["건미역", "자른미역"]),
  ing("kelp", "다시마", "seafood", "g", 10, [0, 0, 365], "room", ["국물용 다시마"]),
  ing("laver", "김", "seafood", "pack", 1, [0, 90, 60], "room", ["조미김", "김밥김", "구운김"]),

  // ── 계란·유제품 ─────────────────────────────
  ing("egg", "계란", "egg_dairy", "ea", 2, [35, 0, 0], "fridge", ["달걀", "유정란", "왕란"]),
  ing("quail_egg", "메추리알", "egg_dairy", "ea", 10, [14, 0, 0], "fridge", ["깐메추리알"]),
  ing("milk", "우유", "egg_dairy", "ml", 200, [7, 0, 0], "fridge", ["흰우유", "저지방우유"]),
  ing("butter", "버터", "egg_dairy", "g", 10, [60, 180, 0], "fridge", ["무염버터", "가염버터"]),
  ing("cheese_slice", "슬라이스 치즈", "egg_dairy", "ea", 1, [30, 0, 0], "fridge", [
    "체다치즈",
    "치즈",
  ]),
  ing("mozzarella", "모짜렐라 치즈", "egg_dairy", "g", 100, [21, 180, 0], "fridge", ["피자치즈"]),
  ing("parmesan", "파마산 치즈", "egg_dairy", "g", 10, [90, 0, 0], "fridge", ["파르메산"]),
  ing("yogurt", "요거트", "egg_dairy", "ea", 1, [14, 0, 0], "fridge", [
    "요구르트",
    "플레인요거트",
    "그릭요거트",
  ]),
  ing("cream", "생크림", "egg_dairy", "ml", 100, [7, 0, 0], "fridge", ["휘핑크림"]),
  ing("cream_cheese", "크림치즈", "egg_dairy", "g", 30, [21, 0, 0], "fridge"),

  // ── 두부·콩 ─────────────────────────────────
  ing("tofu", "두부", "tofu_bean", "pack", 0.5, [5, 60, 0], "fridge", [
    "부침두부",
    "찌개두부",
    "모두부",
  ]),
  ing("soft_tofu", "순두부", "tofu_bean", "pack", 1, [5, 0, 0], "fridge", ["연두부"]),
  ing("fried_tofu", "유부", "tofu_bean", "g", 50, [14, 90, 0], "fridge", ["유부초밥"]),
  ing("soybean", "콩", "tofu_bean", "g", 50, [0, 365, 180], "room", ["서리태", "검은콩", "백태"]),

  // ── 곡류·면 ─────────────────────────────────
  ing("rice", "쌀", "grain_noodle", "g", 160, [0, 0, 90], "room", ["백미", "현미", "잡곡"]),
  ing("cooked_rice", "밥", "grain_noodle", "ea", 1, [3, 30, 0], "fridge", ["찬밥", "냉동밥"]),
  ing("instant_rice", "즉석밥", "grain_noodle", "ea", 1, [0, 0, 180], "room", ["햇반", "공기밥"]),
  ing("ramen", "라면", "grain_noodle", "ea", 1, [0, 0, 180], "room", ["라면사리", "봉지라면"]),
  ing("somyeon", "소면", "grain_noodle", "g", 100, [0, 0, 365], "room", ["국수", "중면"]),
  ing("udon", "우동면", "grain_noodle", "ea", 1, [30, 90, 0], "fridge", ["우동사리"]),
  ing("spaghetti", "스파게티면", "grain_noodle", "g", 100, [0, 0, 365], "room", ["파스타", "펜네"]),
  ing("buckwheat_noodle", "메밀면", "grain_noodle", "g", 100, [0, 0, 365], "room", [
    "메밀국수",
    "냉면",
  ]),
  ing("glass_noodles", "당면", "grain_noodle", "g", 100, [0, 0, 365], "room"),
  ing("rice_cake", "떡볶이떡", "grain_noodle", "g", 300, [7, 90, 2], "fridge", [
    "가래떡",
    "밀떡",
    "쌀떡",
  ]),
  ing("sliced_rice_cake", "떡국떡", "grain_noodle", "g", 200, [5, 90, 0], "fridge", ["떡국용 떡"]),
  ing("bread", "식빵", "grain_noodle", "ea", 2, [0, 90, 4], "room", ["빵", "통밀빵"]),
  ing("tortilla", "또띠아", "grain_noodle", "ea", 2, [14, 90, 0], "fridge"),
  ing("flour", "밀가루", "grain_noodle", "g", 100, [0, 0, 180], "room", [
    "중력분",
    "부침가루",
    "튀김가루",
  ]),
  ing("bread_crumbs", "빵가루", "grain_noodle", "g", 50, [0, 90, 90], "room"),
  ing("oats", "오트밀", "grain_noodle", "g", 40, [0, 0, 180], "room", ["귀리", "오트"]),

  // ── 가공식품 ────────────────────────────────
  ing("ham", "햄", "processed", "g", 100, [7, 60, 0], "fridge", ["슬라이스햄", "김밥햄"]),
  ing("canned_ham", "캔햄", "processed", "ea", 0.5, [5, 60, 365], "room", ["스팸", "런천미트"]),
  ing("sausage", "소시지", "processed", "g", 100, [10, 60, 0], "fridge", [
    "비엔나소시지",
    "프랑크소시지",
  ]),
  ing("bacon", "베이컨", "processed", "g", 60, [7, 30, 0], "fridge"),
  ing("fish_cake", "어묵", "processed", "g", 150, [7, 60, 0], "fridge", ["오뎅", "사각어묵"]),
  ing("crab_stick", "맛살", "processed", "g", 80, [7, 60, 0], "fridge", ["게맛살", "크래미"]),
  ing("tuna_can", "참치캔", "processed", "ea", 1, [3, 0, 365], "room", ["참치", "통조림참치"]),
  ing("canned_corn", "옥수수콘", "processed", "ea", 0.5, [3, 0, 365], "room", [
    "스위트콘",
    "콘옥수수",
  ]),
  ing("dumplings", "만두", "processed", "g", 300, [0, 180, 0], "freezer", [
    "냉동만두",
    "물만두",
    "교자",
  ]),
  ing("smoked_duck", "훈제오리", "processed", "g", 200, [14, 60, 0], "fridge"),
  ing("nuggets", "치킨너겟", "processed", "g", 200, [0, 180, 0], "freezer", ["너겟"]),
  ing("frozen_veg", "냉동 믹스채소", "processed", "g", 100, [0, 240, 0], "freezer", ["믹스베지"]),

  // ── 김치·반찬 ───────────────────────────────
  ing("kimchi", "배추김치", "side_kimchi", "g", 200, [60, 0, 0], "fridge", [
    "김치",
    "묵은지",
    "신김치",
  ]),
  ing("kkakdugi", "깍두기", "side_kimchi", "g", 150, [30, 0, 0], "fridge"),
  ing("chonggak_kimchi", "총각김치", "side_kimchi", "g", 150, [30, 0, 0], "fridge", ["알타리김치"]),
  ing("yeolmu_kimchi", "열무김치", "side_kimchi", "g", 150, [14, 0, 0], "fridge"),
  ing("pickled_radish", "단무지", "side_kimchi", "g", 50, [30, 0, 0], "fridge"),
  ing("jangjorim", "장조림", "side_kimchi", "g", 100, [7, 0, 0], "fridge", ["메추리알 장조림"]),
  ing("side_dish", "밑반찬", "side_kimchi", "g", 100, [5, 0, 0], "fridge", ["반찬", "나물"]),

  // ── 양념·소스 (staple = 기본 양념, 있다고 가정) ─────────
  ing(
    "soy_sauce",
    "간장",
    "sauce",
    "ml",
    15,
    [0, 0, 365],
    "room",
    ["진간장", "양조간장", "국간장"],
    staple,
  ),
  ing("gochujang", "고추장", "sauce", "g", 15, [365, 0, 0], "fridge", [], staple),
  ing("doenjang", "된장", "sauce", "g", 15, [365, 0, 0], "fridge", ["재래된장"], staple),
  ing("gochugaru", "고춧가루", "sauce", "g", 5, [180, 365, 0], "fridge", [], staple),
  ing("salt", "소금", "sauce", "g", 3, [0, 0, 1095], "room", ["천일염", "꽃소금"], staple),
  ing("sugar", "설탕", "sauce", "g", 10, [0, 0, 1095], "room", ["백설탕", "황설탕"], staple),
  ing("black_pepper", "후추", "sauce", "g", 1, [0, 0, 730], "room", ["후춧가루"], staple),
  ing("sesame_oil", "참기름", "sauce", "ml", 5, [0, 0, 365], "room", [], staple),
  ing(
    "cooking_oil",
    "식용유",
    "sauce",
    "ml",
    15,
    [0, 0, 365],
    "room",
    ["카놀라유", "포도씨유", "올리브유"],
    staple,
  ),
  ing("vinegar", "식초", "sauce", "ml", 10, [0, 0, 730], "room", ["사과식초"], staple),
  ing("sesame_seeds", "깨", "sauce", "g", 2, [0, 180, 180], "room", ["참깨", "통깨"], staple),
  ing("cooking_wine", "맛술", "sauce", "ml", 15, [0, 0, 365], "room", ["미림", "미향"], staple),
  ing(
    "oligosaccharide",
    "올리고당",
    "sauce",
    "ml",
    15,
    [0, 0, 365],
    "room",
    ["물엿", "조청"],
    staple,
  ),
  ing("perilla_oil", "들기름", "sauce", "ml", 5, [90, 0, 0], "fridge"),
  ing("ssamjang", "쌈장", "sauce", "g", 15, [180, 0, 0], "fridge"),
  ing("oyster_sauce", "굴소스", "sauce", "ml", 10, [180, 0, 0], "fridge"),
  ing("fish_sauce", "액젓", "sauce", "ml", 10, [365, 0, 0], "fridge", ["멸치액젓", "까나리액젓"]),
  ing("mayonnaise", "마요네즈", "sauce", "g", 15, [60, 0, 0], "fridge", ["마요"]),
  ing("ketchup", "케첩", "sauce", "g", 15, [180, 0, 0], "fridge", ["토마토케첩"]),
  ing("mustard", "머스터드", "sauce", "g", 5, [180, 0, 0], "fridge", ["연겨자", "겨자"]),
  ing("curry_powder", "카레가루", "sauce", "g", 50, [0, 0, 365], "room", ["카레", "고형카레"]),
  ing("soup_stock", "조미료", "sauce", "g", 5, [0, 0, 365], "room", [
    "다시다",
    "치킨스톡",
    "코인육수",
  ]),
  ing("starch", "전분", "sauce", "g", 10, [0, 0, 365], "room", ["감자전분", "녹말가루"]),

  // ── 음료·기타 ───────────────────────────────
  ing("soy_milk", "두유", "beverage", "ml", 200, [7, 0, 90], "room"),
  ing("juice", "주스", "beverage", "ml", 200, [7, 0, 0], "fridge", ["오렌지주스", "사과주스"]),
  ing("honey", "꿀", "etc", "g", 10, [0, 0, 730], "room", ["벌꿀"]),
  ing("nuts", "견과류", "etc", "g", 20, [90, 180, 60], "room", ["아몬드", "호두", "땅콩"]),
];

export const INGREDIENT_BY_ID: ReadonlyMap<string, Ingredient> = new Map(
  INGREDIENTS.map((i) => [i.id, i]),
);
