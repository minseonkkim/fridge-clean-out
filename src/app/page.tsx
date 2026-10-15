import { redirect } from "next/navigation";

/** 랜딩 화면은 화면 뼈대 단계에서 만든다. 그 전까지는 냉장고 홈으로 보낸다. */
export default function Home() {
  redirect("/fridge");
}
