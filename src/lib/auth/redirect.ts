export const DEFAULT_AFTER_LOGIN = "/fridge";

/**
 * 로그인 후 돌아갈 경로를 검사한다. 같은 사이트 안의 상대 경로만 허용한다.
 * "//evil.com", "/\evil.com", "https://evil.com" 같은 값으로 외부에 보내는 열린 리다이렉트를 막는다.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith("/")) return DEFAULT_AFTER_LOGIN;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  // 제어 문자나 역슬래시가 섞이면 브라우저가 다르게 해석할 수 있다.
  if (/[\\\u0000-\u001f]/.test(next)) return DEFAULT_AFTER_LOGIN;
  return next;
}
