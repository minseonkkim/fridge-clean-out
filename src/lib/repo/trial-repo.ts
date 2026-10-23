import type { ItemPatch, NewItemInput, NewShoppingInput, Preferences } from "@/lib/domain/fridge";
import { recentPurchases } from "@/lib/domain/recent";
import {
  activeItems,
  addItems,
  addShoppingItems,
  removeShoppingItems,
  setShoppingChecked,
  closeItem,
  cookRecipe,
  loadTrial,
  saveTrial,
  updateItem,
  updatePreferences,
  type CookUsage,
  type TrialData,
} from "@/lib/trial/trial-store";
import type { FridgeRepository, FridgeSnapshot } from "./types";

interface Persistence {
  load: () => TrialData;
  save: (data: TrialData) => unknown;
}

/** 비로그인 체험 모드 저장소 (브라우저 localStorage) */
export class TrialRepository implements FridgeRepository {
  readonly mode = "trial" as const;
  private data: TrialData;

  constructor(private readonly persistence: Persistence = { load: loadTrial, save: saveTrial }) {
    this.data = persistence.load();
  }

  private commit(next: TrialData) {
    this.data = next;
    this.persistence.save(next);
  }

  async load(): Promise<FridgeSnapshot> {
    this.data = this.persistence.load();
    return {
      items: activeItems(this.data),
      shopping: this.data.shopping,
      preferences: this.data.preferences,
    };
  }

  async addItems(inputs: NewItemInput[]) {
    const before = new Set(this.data.items.map((i) => i.id));
    this.commit(addItems(this.data, inputs));
    return this.data.items.filter((i) => !before.has(i.id));
  }

  async updateItem(itemId: string, patch: ItemPatch) {
    this.commit(updateItem(this.data, itemId, patch));
    return this.data.items.find((i) => i.id === itemId)!;
  }

  async closeItem(itemId: string, status: "used_up" | "discarded") {
    this.commit(closeItem(this.data, itemId, status));
    return this.data.items.find((i) => i.id === itemId)!;
  }

  async savePreferences(patch: Partial<Preferences>) {
    this.commit(updatePreferences(this.data, patch));
    return this.data.preferences;
  }

  async cook(recipeId: string, usages: CookUsage[]) {
    this.commit(cookRecipe(this.data, recipeId, usages));
  }

  async recentPurchases(limit?: number) {
    return recentPurchases(this.data.items, limit);
  }

  async addShopping(inputs: NewShoppingInput[]) {
    const before = new Set(this.data.shopping.map((s) => s.id));
    this.commit(addShoppingItems(this.data, inputs));
    return this.data.shopping.filter((s) => !before.has(s.id));
  }

  async setShoppingChecked(id: string, checked: boolean) {
    this.commit(setShoppingChecked(this.data, id, checked));
  }

  async removeShopping(ids: string[]) {
    this.commit(removeShoppingItems(this.data, ids));
  }
}
