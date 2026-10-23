import type {
  FridgeItem,
  ItemPatch,
  NewItemInput,
  NewShoppingInput,
  Preferences,
  ShoppingItem,
} from "@/lib/domain/fridge";
import type { RecentPurchase } from "@/lib/domain/recent";
import type { CookUsage } from "@/lib/trial/trial-store";

export type { CookUsage };

export interface FridgeSnapshot {
  /** 냉장고에 있는(active) 재료 */
  items: FridgeItem[];
  shopping: ShoppingItem[];
  preferences: Preferences;
}

/**
 * 냉장고 데이터 접근. 체험 모드(브라우저 저장소)와 계정 모드(Supabase)가 같은 모양이다.
 * 화면은 이 인터페이스만 쓴다.
 */
export interface FridgeRepository {
  readonly mode: "trial" | "account";
  load(): Promise<FridgeSnapshot>;
  addItems(inputs: NewItemInput[]): Promise<FridgeItem[]>;
  updateItem(itemId: string, patch: ItemPatch): Promise<FridgeItem>;
  closeItem(itemId: string, status: "used_up" | "discarded"): Promise<FridgeItem>;
  savePreferences(patch: Partial<Preferences>): Promise<Preferences>;
  cook(recipeId: string, usages: CookUsage[], servings?: number): Promise<void>;
  /** 최근 산 재료 (다 쓰거나 버린 것 포함, 중복 없이) */
  recentPurchases(limit?: number): Promise<RecentPurchase[]>;
  /** 장보기 목록에 담는다. 아직 안 산 같은 재료는 건너뛴다. 담긴 항목을 돌려준다. */
  addShopping(inputs: NewShoppingInput[]): Promise<ShoppingItem[]>;
  setShoppingChecked(id: string, checked: boolean): Promise<void>;
  removeShopping(ids: string[]): Promise<void>;
}
