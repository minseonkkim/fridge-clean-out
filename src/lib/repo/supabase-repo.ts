import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemPatch, NewItemInput, Preferences } from "@/lib/domain/fridge";
import {
  CompartmentMap,
  itemFromRow,
  preferencesFromRow,
  rowFromNewItem,
  rowFromPatch,
  rowFromPreferences,
  shoppingFromRow,
  type CompartmentRow,
  type FridgeItemRow,
  type PreferencesRow,
  type ShoppingItemRow,
} from "./supabase-mapping";
import type { CookUsage, FridgeRepository, FridgeSnapshot } from "./types";

function fail(action: string, error: { message: string } | null): never {
  throw new Error(`${action}에 실패했습니다: ${error?.message ?? "알 수 없는 오류"}`);
}

/**
 * 로그인 사용자의 냉장고 저장소. 브라우저에서 supabase-js로 바로 읽고 쓴다.
 * 권한은 RLS가, 이력은 DB 트리거가 처리한다.
 */
export class SupabaseRepository implements FridgeRepository {
  readonly mode = "account" as const;
  private fridgeId: string | null = null;
  private compartments = new CompartmentMap([]);
  private preferences: Preferences | null = null;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  /** 내 기본 냉장고(소유 중 가장 오래된 것)와 칸 구조를 읽는다. */
  private async ensureFridge(): Promise<string> {
    if (this.fridgeId) return this.fridgeId;
    const { data: fridge, error } = await this.supabase
      .from("fridges")
      .select("id")
      .eq("owner_id", this.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (error || !fridge) fail("냉장고 불러오기", error);

    const { data: rows, error: cErr } = await this.supabase
      .from("compartments")
      .select("id, slot")
      .eq("fridge_id", fridge.id)
      .returns<CompartmentRow[]>();
    if (cErr) fail("칸 불러오기", cErr);

    this.fridgeId = fridge.id;
    this.compartments = new CompartmentMap(rows ?? []);
    return fridge.id;
  }

  async load(): Promise<FridgeSnapshot> {
    const fridgeId = await this.ensureFridge();
    const [items, shopping, prefs] = await Promise.all([
      this.supabase
        .from("fridge_items")
        .select("*")
        .eq("fridge_id", fridgeId)
        .eq("status", "active")
        .order("expires_at")
        .returns<FridgeItemRow[]>(),
      this.supabase
        .from("shopping_items")
        .select("*")
        .eq("fridge_id", fridgeId)
        .order("created_at")
        .returns<ShoppingItemRow[]>(),
      this.supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle<PreferencesRow>(),
    ]);
    if (items.error) fail("재료 불러오기", items.error);
    if (shopping.error) fail("장보기 목록 불러오기", shopping.error);
    if (prefs.error) fail("설정 불러오기", prefs.error);

    this.preferences = preferencesFromRow(prefs.data);
    return {
      items: (items.data ?? []).map((r) => itemFromRow(r, this.compartments)),
      shopping: (shopping.data ?? []).map(shoppingFromRow),
      preferences: this.preferences,
    };
  }

  async addItems(inputs: NewItemInput[]) {
    const fridgeId = await this.ensureFridge();
    const { data, error } = await this.supabase
      .from("fridge_items")
      .insert(inputs.map((i) => rowFromNewItem(i, fridgeId, this.compartments)))
      .select("*")
      .returns<FridgeItemRow[]>();
    if (error) fail("재료 등록", error);
    return (data ?? []).map((r) => itemFromRow(r, this.compartments));
  }

  async updateItem(itemId: string, patch: ItemPatch) {
    await this.ensureFridge();
    const { data, error } = await this.supabase
      .from("fridge_items")
      .update(rowFromPatch(patch, this.compartments))
      .eq("id", itemId)
      .select("*")
      .single<FridgeItemRow>();
    if (error || !data) fail("재료 수정", error);
    return itemFromRow(data, this.compartments);
  }

  async closeItem(itemId: string, status: "used_up" | "discarded") {
    await this.ensureFridge();
    const update: Partial<FridgeItemRow> = { status, closed_at: new Date().toISOString() };
    if (status === "used_up") update.quantity = 0;
    const { data, error } = await this.supabase
      .from("fridge_items")
      .update(update)
      .eq("id", itemId)
      .eq("status", "active")
      .select("*")
      .single<FridgeItemRow>();
    if (error || !data) fail(status === "used_up" ? "다 씀 처리" : "버림 처리", error);
    return itemFromRow(data, this.compartments);
  }

  async savePreferences(patch: Partial<Preferences>) {
    const next = { ...(this.preferences ?? preferencesFromRow(null)), ...patch };
    const { data, error } = await this.supabase
      .from("user_preferences")
      .upsert(rowFromPreferences(this.userId, next))
      .select("*")
      .single<PreferencesRow>();
    if (error) fail("설정 저장", error);
    this.preferences = preferencesFromRow(data);
    return this.preferences;
  }

  async cook(recipeId: string, usages: CookUsage[], servings = 1) {
    const fridgeId = await this.ensureFridge();
    const { error } = await this.supabase.rpc("cook_recipe", {
      p_fridge_id: fridgeId,
      p_recipe_id: recipeId,
      p_usages: usages.map((u) => ({ item_id: u.itemId, amount: u.amount })),
      p_servings: servings,
    });
    if (error) fail("요리 완료 처리", error);
  }
}
