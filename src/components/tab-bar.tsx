"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/fridge", label: "냉장고", icon: "🧊" },
  { href: "/plan", label: "식단", icon: "🍱" },
  { href: "/shopping", label: "장보기", icon: "🛒" },
  { href: "/my", label: "마이", icon: "🙂" },
] as const;

/** 레시피 상세는 식단에서 들어가므로 식단 탭으로 본다. */
function activeTab(pathname: string): string | null {
  if (pathname.startsWith("/recipes/")) return "/plan";
  return TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href ?? null;
}

/** 하단 탭바 (기획서 4장, 4.1절 한 손 조작). */
export function TabBar() {
  const pathname = usePathname();
  const active = activeTab(pathname);

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const current = tab.href === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  current ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-500"
                }`}
              >
                <span aria-hidden className="text-xl">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
