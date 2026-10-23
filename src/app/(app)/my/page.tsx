import { AccountActions } from "./account-actions";
import { PreferencesSection } from "./preferences-section";

export const metadata = { title: "마이 · 냉털 레시피" };

export default function MyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-6 pb-28">
      <h1 className="text-xl font-bold">마이</h1>
      <section aria-labelledby="account-heading" className="flex flex-col gap-3">
        <h2 id="account-heading" className="font-semibold text-neutral-500">
          계정
        </h2>
        <AccountActions />
      </section>
      <PreferencesSection />
    </main>
  );
}
