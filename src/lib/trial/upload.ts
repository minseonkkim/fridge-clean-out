import type { SupabaseClient } from "@supabase/supabase-js";
import { clearTrial, hasTrialData, loadTrial, type TrialData } from "./trial-store";

/** 업로드가 끝나면 window에 보내는 이벤트. 냉장고 화면이 듣고 다시 불러온다. */
export const TRIAL_UPLOADED_EVENT = "naengteol:trial-uploaded";

export interface UploadResult {
  items: number;
  events: number;
  shopping: number;
  preferences: boolean;
}

type RpcClient = Pick<SupabaseClient, "rpc">;

interface Deps {
  load?: () => TrialData;
  clear?: () => void;
}

/**
 * 체험 데이터를 로그인한 계정으로 올린다. 성공하면 브라우저의 체험 데이터를 지운다.
 * 올릴 데이터가 없으면 null. 실패하면 체험 데이터를 그대로 두고 예외를 던진다 (다음에 다시 시도).
 * 서버 함수가 id 기준으로 중복을 막으므로 여러 번 불려도 안전하다.
 */
export async function uploadTrialData(
  supabase: RpcClient,
  { load = loadTrial, clear = clearTrial }: Deps = {},
): Promise<UploadResult | null> {
  const trial = load();
  if (!hasTrialData(trial)) return null;

  const { data, error } = await supabase.rpc("import_trial_data", { p_payload: trial });
  if (error) throw new Error(`체험 데이터를 옮기지 못했습니다: ${error.message}`);

  clear();
  return data as UploadResult;
}
