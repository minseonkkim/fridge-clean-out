import { FridgeProvider } from "@/lib/repo/fridge-context";

export const metadata = { title: "처음 설정 · 냉털 레시피" };

export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return <FridgeProvider>{children}</FridgeProvider>;
}
