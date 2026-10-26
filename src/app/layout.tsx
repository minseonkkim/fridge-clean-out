import type { Metadata, Viewport } from "next";
import { TrialUploader } from "@/components/trial-uploader";
import "./globals.css";
import { THEME_COLOR } from "./manifest";
import { splashStartupImages } from "./splash-screens";

export const metadata: Metadata = {
  title: "냉털 레시피",
  description: "유통기한 급한 재료부터 다 먹는 며칠치 식단과 최소 장보기",
  applicationName: "냉털 레시피",
  // iOS 홈 화면에 추가했을 때 앱처럼 보이게 한다.
  appleWebApp: {
    capable: true,
    title: "냉털",
    statusBarStyle: "default",
    startupImage: splashStartupImages(),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <TrialUploader />
      </body>
    </html>
  );
}
