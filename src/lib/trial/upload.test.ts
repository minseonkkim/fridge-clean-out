import { describe, expect, it, vi } from "vitest";
import { addItems, emptyTrial } from "./trial-store";
import { uploadTrialData } from "./upload";

const trial = addItems(emptyTrial(), [
  {
    ingredientId: "egg",
    storage: "fridge",
    quantity: 10,
    unit: "ea",
    purchasedAt: "2026-10-15",
    expiresAt: "2026-11-19",
  },
]);

describe("uploadTrialData", () => {
  it("올릴 데이터가 없으면 서버를 부르지 않는다", async () => {
    const rpc = vi.fn();
    const result = await uploadTrialData({ rpc } as never, { load: emptyTrial, clear: vi.fn() });
    expect(result).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("성공하면 체험 데이터를 지운다", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { items: 1, events: 1, shopping: 0, preferences: false },
      error: null,
    });
    const clear = vi.fn();
    const result = await uploadTrialData({ rpc } as never, { load: () => trial, clear });
    expect(rpc).toHaveBeenCalledWith("import_trial_data", { p_payload: trial });
    expect(result?.items).toBe(1);
    expect(clear).toHaveBeenCalledOnce();
  });

  it("실패하면 체험 데이터를 남기고 예외를 던진다", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "network" } });
    const clear = vi.fn();
    await expect(uploadTrialData({ rpc } as never, { load: () => trial, clear })).rejects.toThrow(
      /network/,
    );
    expect(clear).not.toHaveBeenCalled();
  });
});
