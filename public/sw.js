/* 냉털 레시피 서비스 워커 (기획서 4.2절, 결정 D7)
 *
 * - 설치할 때 앱 셸(탭 화면)·매니페스트·아이콘을 미리 캐시한다.
 * - 빌드 정적 파일(/_next/static, 파일 이름에 해시가 있음)·아이콘·시작 화면은 캐시 우선.
 * - 화면(HTML)과 그 밖의 같은 출처 GET은 네트워크 우선, 실패하면 캐시로 응답한다.
 * - 다른 출처(Supabase 등), 로그인 콜백, Sentry 터널은 건드리지 않는다.
 *
 * 앱을 배포할 때마다 VERSION을 올릴 필요는 없다. 화면은 네트워크 우선이라 항상 새 버전을 받고,
 * 정적 파일은 이름이 바뀐다. 캐시 구조를 바꿀 때만 올린다.
 */
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const PAGE_CACHE = `pages-${VERSION}`;

const SHELL = [
  "/",
  "/fridge",
  "/plan",
  "/shopping",
  "/my",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const BYPASS = [/^\/auth\//, /^\/monitoring/, /^\/sw\.js$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      (await caches.open(PAGE_CACHE)).put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached =
      (await caches.match(request, { ignoreSearch: true })) ||
      (fallbackUrl && (await caches.match(fallbackUrl)));
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS.some((re) => re.test(url.pathname))) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/splash/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    // 처음 보는 화면을 오프라인에서 열면 냉장고 화면을 대신 보여 준다.
    event.respondWith(networkFirst(request, "/fridge"));
    return;
  }

  event.respondWith(networkFirst(request));
});
