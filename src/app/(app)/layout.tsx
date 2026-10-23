import { TabBar } from "@/components/tab-bar";
import { FridgeProvider } from "@/lib/repo/fridge-context";

/** 탭 화면(냉장고·식단·장보기·마이)이 같은 냉장고 데이터를 공유한다. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <FridgeProvider>
      {children}
      <TabBar />
    </FridgeProvider>
  );
}
