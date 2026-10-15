import type { Ingredient } from "./types";

/**
 * 재료 이름·별칭 자동완성 (기획서 F1).
 * - 띄어쓰기·대소문자 무시
 * - 초성 검색: "ㅇㅍ" → 양파
 * - 입력 중간 상태: "양ㅍ" → 양파 (마지막 글자가 아직 자음만 입력된 경우)
 * - 별칭으로 찾으면 어떤 별칭이 맞았는지 함께 돌려준다 (삼겹살 → 돼지고기)
 */

const CHOSUNG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

function isJamoConsonant(ch: string): boolean {
  return ch >= "ㄱ" && ch <= "ㅎ";
}

function chosungOf(ch: string): string | null {
  const code = ch.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return CHOSUNG[Math.floor((code - HANGUL_START) / 588)];
}

export function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** 한 글자 비교: 질의 글자가 자음만이면 대상 글자의 초성과 비교한다. */
function charMatches(target: string, query: string): boolean {
  if (target === query) return true;
  return isJamoConsonant(query) && chosungOf(target) === query;
}

function matchesAt(target: string, query: string, start: number): boolean {
  if (start + query.length > target.length) return false;
  for (let i = 0; i < query.length; i++) {
    if (!charMatches(target[start + i], query[i])) return false;
  }
  return true;
}

function startsWithHangul(target: string, query: string): boolean {
  return matchesAt(target, query, 0);
}

function includesHangul(target: string, query: string): boolean {
  for (let i = 1; i + query.length <= target.length; i++) {
    if (matchesAt(target, query, i)) return true;
  }
  return false;
}

export interface SearchHit {
  ingredient: Ingredient;
  /** 별칭으로 찾았을 때 그 별칭 */
  matchedAlias: string | null;
  score: number;
}

interface Entry {
  ingredient: Ingredient;
  term: string;
  norm: string;
  isAlias: boolean;
  order: number;
}

export interface IngredientIndex {
  search(query: string, limit?: number): SearchHit[];
  /** 정확히 이름이나 별칭이 같은 재료 */
  exact(text: string): Ingredient | undefined;
}

export function buildIngredientIndex(ingredients: Ingredient[]): IngredientIndex {
  const entries: Entry[] = [];
  const exactMap = new Map<string, Ingredient>();
  ingredients.forEach((ingredient, order) => {
    for (const [term, isAlias] of [
      [ingredient.name, false] as const,
      ...ingredient.aliases.map((a) => [a, true] as const),
    ]) {
      const norm = normalize(term);
      entries.push({ ingredient, term, norm, isAlias, order });
      if (!exactMap.has(norm)) exactMap.set(norm, ingredient);
    }
  });

  function scoreOf(entry: Entry, q: string): number | null {
    const alias = entry.isAlias ? 1 : 0;
    if (entry.norm === q) return 0 + alias;
    if (entry.norm.startsWith(q)) return 2 + alias;
    if (startsWithHangul(entry.norm, q)) return 4 + alias;
    if (entry.norm.includes(q)) return 6 + alias;
    if (includesHangul(entry.norm, q)) return 8 + alias;
    return null;
  }

  return {
    search(query, limit = 8) {
      const q = normalize(query);
      if (!q) return [];
      const best = new Map<string, SearchHit & { order: number; length: number }>();
      for (const entry of entries) {
        const score = scoreOf(entry, q);
        if (score === null) continue;
        const prev = best.get(entry.ingredient.id);
        if (!prev || score < prev.score) {
          best.set(entry.ingredient.id, {
            ingredient: entry.ingredient,
            matchedAlias: entry.isAlias ? entry.term : null,
            score,
            order: entry.order,
            length: entry.norm.length,
          });
        }
      }
      return [...best.values()]
        .sort((a, b) => a.score - b.score || a.length - b.length || a.order - b.order)
        .slice(0, limit)
        .map(({ ingredient, matchedAlias, score }) => ({ ingredient, matchedAlias, score }));
    },
    exact(text) {
      return exactMap.get(normalize(text));
    },
  };
}
