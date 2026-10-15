"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FridgeItem, ItemPatch, NewItemInput, Preferences } from "@/lib/domain/fridge";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { TRIAL_UPLOADED_EVENT } from "@/lib/trial/upload";
import { SupabaseRepository } from "./supabase-repo";
import { TrialRepository } from "./trial-repo";
import type { CookUsage, FridgeRepository, FridgeSnapshot } from "./types";

type Status = "loading" | "ready" | "error";

interface FridgeContextValue {
  status: Status;
  error: string | null;
  mode: FridgeRepository["mode"] | null;
  snapshot: FridgeSnapshot | null;
  reload(): Promise<void>;
  addItems(inputs: NewItemInput[]): Promise<FridgeItem[]>;
  updateItem(itemId: string, patch: ItemPatch): Promise<FridgeItem>;
  closeItem(itemId: string, status: "used_up" | "discarded"): Promise<void>;
  savePreferences(patch: Partial<Preferences>): Promise<void>;
  cook(recipeId: string, usages: CookUsage[], servings?: number): Promise<void>;
}

const FridgeContext = createContext<FridgeContextValue | null>(null);

/**
 * 냉장고 데이터를 화면에 공급한다.
 * 로그인 상태면 Supabase, 아니면 브라우저 체험 저장소를 쓴다.
 */
export function FridgeProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<FridgeRepository | null>(() =>
    hasSupabaseEnv() ? null : new TrialRepository(),
  );
  const [snapshot, setSnapshot] = useState<FridgeSnapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  // 로그인 상태에 따라 저장소를 고른다.
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setRepo((current) => {
        const userId = session?.user.id;
        if (userId) {
          return current?.mode === "account" ? current : new SupabaseRepository(supabase, userId);
        }
        return current?.mode === "trial" ? current : new TrialRepository();
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    if (!repo) return;
    setStatus("loading");
    try {
      setSnapshot(await repo.load());
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [repo]);

  // 체험 데이터가 계정으로 옮겨지면 다시 불러온다.
  useEffect(() => {
    const onUploaded = () => void reload();
    window.addEventListener(TRIAL_UPLOADED_EVENT, onUploaded);
    return () => window.removeEventListener(TRIAL_UPLOADED_EVENT, onUploaded);
  }, [reload]);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    repo.load().then(
      (s) => {
        if (cancelled) return;
        setSnapshot(s);
        setError(null);
        setStatus("ready");
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repo]);

  const value = useMemo<FridgeContextValue>(() => {
    function need(): FridgeRepository {
      if (!repo) throw new Error("냉장고를 아직 불러오는 중입니다.");
      return repo;
    }
    const patchItems = (fn: (items: FridgeItem[]) => FridgeItem[]) =>
      setSnapshot((s) => (s ? { ...s, items: fn(s.items) } : s));

    return {
      status,
      error,
      mode: repo?.mode ?? null,
      snapshot,
      reload,
      async addItems(inputs) {
        const created = await need().addItems(inputs);
        patchItems((items) => [...items, ...created]);
        return created;
      },
      async updateItem(itemId, patch) {
        const updated = await need().updateItem(itemId, patch);
        patchItems((items) => items.map((i) => (i.id === itemId ? updated : i)));
        return updated;
      },
      async closeItem(itemId, itemStatus) {
        await need().closeItem(itemId, itemStatus);
        patchItems((items) => items.filter((i) => i.id !== itemId));
      },
      async savePreferences(patch) {
        const preferences = await need().savePreferences(patch);
        setSnapshot((s) => (s ? { ...s, preferences } : s));
      },
      async cook(recipeId, usages, servings) {
        await need().cook(recipeId, usages, servings);
        await reload();
      },
    };
  }, [repo, snapshot, status, error, reload]);

  return <FridgeContext value={value}>{children}</FridgeContext>;
}

export function useFridge(): FridgeContextValue {
  const ctx = use(FridgeContext);
  if (!ctx) throw new Error("useFridge는 FridgeProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
