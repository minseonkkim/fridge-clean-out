# 냉털 레시피

내 냉장고를 화면 속 냉장고로 옮겨 두고, 유통기한이 급한 재료부터 다 먹을 수 있도록 며칠치 식단과 최소 장보기를 짜 주는 모바일 퍼스트 PWA.

- 기획: [docs/냉털 레시피 서비스 기획서.md](docs/냉털%20레시피%20서비스%20기획서.md)
- 진행 상황: [docs/로드맵 체크리스트.md](docs/로드맵%20체크리스트.md)
- 환경 설정: [docs/개발 환경 설정.md](docs/개발%20환경%20설정.md)

## 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Sentry · Vitest · Vercel

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase 값을 채운다. 비워 두면 체험 모드만 동작
npm run dev
```

## 스크립트

| 명령             | 설명                                  |
| ---------------- | ------------------------------------- |
| `npm run dev`    | 개발 서버                             |
| `npm run build`  | 프로덕션 빌드                         |
| `npm run check`  | 린트 + 타입 검사 + 포맷 검사 + 테스트 |
| `npm run test`   | Vitest 단위 테스트                    |
| `npm run format` | Prettier로 포맷                       |

## 브랜치·커밋 규칙

- `main`은 항상 배포 가능한 상태로 둔다. Vercel이 `main` 푸시마다 배포한다.
- 기능은 `feat/<이름>` 브랜치에서 작업하고 PR로 합친다. 혼자 작업할 때는 작은 단위로 `main`에 바로 커밋해도 된다.
- 커밋 메시지는 Conventional Commits(`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`)를 따르고 본문은 한국어로 쓴다.
- 커밋 전에 `npm run check`가 통과해야 한다.
