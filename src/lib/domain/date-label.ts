import { diffDays } from "./expiry";
import type { IsoDate } from "./fridge";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** "오늘", "내일", "모레", 그 밖은 "10월 18일 (토)" */
export function dayLabel(date: IsoDate, today: IsoDate): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}
