import Link from "next/link";
import { Suspense } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginButtons } from "./login-buttons";

export const metadata = { title: "로그인 · 냉털 레시피" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">냉털 레시피</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          로그인하면 내 냉장고가 저장되고 다른 기기에서도 이어서 쓸 수 있어요.
        </p>
      </header>

      <Suspense fallback={<LoginButtons enabled={false} />}>
        <LoginArea searchParams={searchParams} />
      </Suspense>

      <Link
        href="/fridge"
        className="min-h-11 content-center text-center text-neutral-600 underline underline-offset-4 dark:text-neutral-300"
      >
        로그인 없이 시작
      </Link>
    </main>
  );
}

async function LoginArea({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          로그인에 실패했습니다: {error}
        </p>
      )}
      <LoginButtons next={next} enabled={hasSupabaseEnv()} />
    </div>
  );
}
