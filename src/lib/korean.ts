/** 마지막 글자에 받침이 있는지. 한글이 아니면 null. */
function hasFinalConsonant(word: string): boolean | null {
  const last = word.trim().at(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

/**
 * 받침에 맞는 조사를 붙인다. josa("양파", "을", "를") → "양파를"
 * 한글로 끝나지 않으면 "을(를)"처럼 둘 다 쓴다.
 */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const final = hasFinalConsonant(word);
  if (final === null) return `${word}${withFinal}(${withoutFinal})`;
  return `${word}${final ? withFinal : withoutFinal}`;
}
