import type { Metadata, Viewport } from "next";
import { TrialUploader } from "@/components/trial-uploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "냉털 레시피",
  description: "유통기한 급한 재료부터 다 먹는 며칠치 식단과 최소 장보기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
