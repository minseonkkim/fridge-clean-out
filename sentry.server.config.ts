import * as Sentry from "@sentry/nextjs";

// DSN이 비어 있으면 Sentry는 아무 데이터도 보내지 않는다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // 무료 플랜(5M spans) 안에서 머물도록 낮게 둔다.
  tracesSampleRate: 0.1,
});
