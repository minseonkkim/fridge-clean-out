"use client";

import { useId, useMemo, useReducer, useState } from "react";
import { INGREDIENTS } from "@/data/ingredients";
import {
  addItemFormReducer,
  initialAddItemForm,
  validateAddItem,
} from "@/lib/domain/add-item-form";
import { bulkToInputs, parseBulk } from "@/lib/domain/bulk-parse";
import { dDayLabel, diffDays, todayIso } from "@/lib/domain/expiry";
import { buildIngredientIndex } from "@/lib/domain/search";
import { CATEGORY_LABEL, STORAGE_LABEL, STORAGES, UNIT_LABEL, type Unit } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";
import { BottomSheet } from "./bottom-sheet";
import { RecentPurchases } from "./recent-purchases";
import { Segmented } from "./segmented";

const index = buildIngredientIndex(INGREDIENTS);
const STORAGE_OPTIONS = STORAGES.map((s) => ({ value: s, label: STORAGE_LABEL[s] }));
const UNITS = Object.keys(UNIT_LABEL) as Unit[];

type Mode = "single" | "bulk";
const MODE_OPTIONS = [
  { value: "single", label: "하나씩" },
  { value: "bulk", label: "한 번에 여러 개" },
] as const;

export function AddItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addItems } = useFridge();
  const [mode, setMode] = useState<Mode>("single");
  const [bulkText, setBulkText] = useState("");
  const [state, dispatch] = useReducer(addItemFormReducer, todayIso(), initialAddItemForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bulkEntries = useMemo(() => parseBulk(bulkText, index), [bulkText]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  /** 시트를 연 뒤 넣은 재료 (연속 등록 확인용) */
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const ids = {
    name: useId(),
    list: useId(),
    qty: useId(),
    unit: useId(),
    bought: useId(),
    exp: useId(),
  };

  const suggestions = useMemo(
    () =>
      state.ingredient && state.query === state.ingredient.name ? [] : index.search(state.query, 6),
    [state.query, state.ingredient],
  );
  const left = diffDays(todayIso(), state.expiresAt);

  function close() {
    dispatch({ type: "reset", today: todayIso() });
    setBulkText("");
    setError(null);
    onClose();
  }

  async function submit() {
    let inputs;
    if (mode === "bulk") {
      if (bulkEntries.length === 0) {
        setError("넣을 재료를 입력해 주세요.");
        return;
      }
      inputs = bulkToInputs(bulkEntries, todayIso());
    } else {
      const result = validateAddItem(state);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      inputs = [result.input];
    }
    setSaving(true);
    try {
      await addItems(inputs);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="재료 추가"
      footer={
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="min-h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {saving
            ? "넣는 중…"
            : mode === "bulk" && bulkEntries.length > 0
              ? `${bulkEntries.length}개 냉장고에 넣기`
              : "냉장고에 넣기"}
        </button>
      }
    >
      <div className="mb-4">
        <Segmented
          label="입력 방식"
          value={mode}
          options={MODE_OPTIONS}
          onChange={(value) => {
            setMode(value);
            setError(null);
          }}
        />
      </div>

      {justAdded.length > 0 && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          방금 넣음: {justAdded.join(", ")}
        </p>
      )}

      {mode === "bulk" ? (
        <BulkPanel text={bulkText} onChange={setBulkText} error={error} />
      ) : (
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {!state.query && (
            <RecentPurchases onAdded={(label) => setJustAdded((list) => [...list, label])} />
          )}

          {/* 이름 + 자동완성 */}
          <div className="relative flex flex-col gap-1">
            <label htmlFor={ids.name} className="text-sm font-semibold">
              이름
            </label>
            <input
              id={ids.name}
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls={ids.list}
              aria-autocomplete="list"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="예: 양파, 삼겹살, ㄷㅂ"
              value={state.query}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onChange={(e) => {
                dispatch({
                  type: "query",
                  value: e.target.value,
                  exact: index.exact(e.target.value),
                });
                setShowSuggestions(true);
                setError(null);
              }}
              className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id={ids.list}
                role="listbox"
                className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
              >
                {suggestions.map(({ ingredient, matchedAlias }) => (
                  <li
                    key={ingredient.id}
                    role="option"
                    aria-selected={state.ingredient?.id === ingredient.id}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        dispatch({ type: "select", ingredient });
                        setShowSuggestions(false);
                      }}
                      className="flex min-h-11 w-full items-center justify-between px-3 text-left"
                    >
                      <span>
                        {matchedAlias ? (
                          <>
                            {matchedAlias}{" "}
                            <span className="text-neutral-400">→ {ingredient.name}</span>
                          </>
                        ) : (
                          ingredient.name
                        )}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {CATEGORY_LABEL[ingredient.category]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {state.query.trim() && !state.ingredient && (
              <p className="text-xs text-neutral-500">
                사전에 없는 재료로 등록돼요. 기한은 기본값으로 정해요.
              </p>
            )}
          </div>

          {/* 보관 방식 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">보관 방식</span>
            <Segmented
              label="보관 방식"
              value={state.storage}
              options={STORAGE_OPTIONS}
              onChange={(value) => dispatch({ type: "storage", value })}
            />
            {state.expiry.basis === "not_recommended" && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {STORAGE_LABEL[state.storage]} 보관은 권장하지 않아요. 기한은{" "}
                {STORAGE_LABEL[state.ingredient!.defaultStorage]} 기준으로 계산했어요.
              </p>
            )}
          </div>

          {/* 수량 + 단위 */}
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.qty} className="text-sm font-semibold">
                수량
              </label>
              <input
                id={ids.qty}
                inputMode="decimal"
                value={state.quantity}
                onChange={(e) => dispatch({ type: "quantity", value: e.target.value })}
                className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.unit} className="text-sm font-semibold">
                단위
              </label>
              <select
                id={ids.unit}
                value={state.unit}
                onChange={(e) => dispatch({ type: "unit", value: e.target.value as Unit })}
                className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABEL[u]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 구매일 + 기한 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.bought} className="text-sm font-semibold">
                구매일
              </label>
              <input
                id={ids.bought}
                type="date"
                value={state.purchasedAt}
                max={todayIso()}
                onChange={(e) =>
                  e.target.value && dispatch({ type: "purchasedAt", value: e.target.value })
                }
                className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={ids.exp} className="text-sm font-semibold">
                기한 <span className="font-normal text-neutral-500">({dDayLabel(left)})</span>
              </label>
              <input
                id={ids.exp}
                type="date"
                value={state.expiresAt}
                min={state.purchasedAt}
                onChange={(e) =>
                  e.target.value && dispatch({ type: "expiresAt", value: e.target.value })
                }
                className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
          <p className="-mt-3 text-xs text-neutral-500">
            {state.expiresManual ? (
              <>
                직접 정한 기한이에요.{" "}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resetExpiry" })}
                  className="underline underline-offset-2"
                >
                  권장 기한으로 되돌리기
                </button>
              </>
            ) : (
              "기한은 권장값이에요. 포장지에 표시된 기한이 있으면 그 날짜로 고쳐 주세요."
            )}
          </p>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </BottomSheet>
  );
}

function BulkPanel({
  text,
  onChange,
  error,
}: {
  text: string;
  onChange: (text: string) => void;
  error: string | null;
}) {
  const id = useId();
  const today = todayIso();
  const entries = useMemo(() => parseBulk(text, index), [text]);
  const inputs = useMemo(() => bulkToInputs(entries, today), [entries, today]);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-semibold">
        산 재료를 쉼표나 줄바꿈으로 적어 주세요
      </label>
      <textarea
        id={id}
        rows={3}
        value={text}
        placeholder="양파 3, 두부 1, 계란 10, 돼지고기 600g"
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
      />
      {entries.length > 0 && (
        <ul
          aria-label="넣을 재료 미리보기"
          className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800"
        >
          {entries.map((entry, i) => (
            <li
              key={`${entry.raw}-${i}`}
              className="flex min-h-11 items-center justify-between gap-2 text-sm"
            >
              <span>
                {entry.ingredient?.name ?? entry.name}
                {!entry.ingredient && (
                  <span className="ml-1 text-xs text-amber-700">(사전에 없음)</span>
                )}
              </span>
              <span className="text-neutral-500">
                {entry.quantity}
                {UNIT_LABEL[entry.unit]} · {STORAGE_LABEL[inputs[i].storage]} ·{" "}
                {dDayLabel(diffDays(today, inputs[i].expiresAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-500">
        오늘 산 것으로 보고 기본 보관 방식과 권장 기한으로 넣어요. 넣은 뒤에 하나씩 고칠 수 있어요.
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
