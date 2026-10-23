import Link from "next/link";
import { LoginButtons } from "./login/login-buttons";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { FridgeDemo } from "./fridge-demo";
import { LandingRedirect } from "./landing-redirect";

const VALUES = [
  { title: "등록이 쉬워요", body: "이름만 넣으면 냉장·냉동·실온별 기한이 자동으로 정해져요." },
  { title: "보면 바로 알아요", body: "냉장고 문을 열면 상해 가는 재료가 먼저 눈에 띄어요." },
  {
    title: "버리지 않게 돼요",
    body: "오늘 한 끼가 아니라 며칠 동안 무엇을 먹을지 순서를 짜 줘요.",
  },
  { title: "덜 사요", body: "요리가 막히면 가장 적게 사서 가장 많이 살리는 재료를 알려 줘요." },
];

/** 랜딩 (기획서 4장): 문이 열리는 냉장고 데모, "로그인 없이 시작" / 소셜 로그인 */
export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 pt-12 pb-16">
      <LandingRedirect />
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-bold">냉털 레시피</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          유통기한 급한 재료부터 다 먹는
          <br />
          며칠치 식단과 최소 장보기
        </p>
      </header>

      <FridgeDemo />

      <div className="flex flex-col gap-3">
        <Link
          href="/fridge"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white"
        >
          로그인 없이 시작
        </Link>
        <LoginButtons enabled={hasSupabaseEnv()} next="/fridge" />
      </div>

      <ul className="flex flex-col gap-4">
        {VALUES.map((v) => (
          <li key={v.title}>
            <p className="font-semibold">{v.title}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{v.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
