import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  // 소스맵 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 동작한다. 없으면 조용히 건너뛴다.
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // 광고 차단기를 우회해 에러를 보내는 터널 경로
  tunnelRoute: "/monitoring",
  // 번들에서 로거 코드를 제거한다.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
