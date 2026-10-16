import { describe, expect, it } from "vitest";
import { josa } from "./korean";

describe("josa", () => {
  it.each([
    ["양파", "양파를"],
    ["돼지고기", "돼지고기를"],
    ["두부", "두부를"],
    ["김치", "김치를"],
    ["계란", "계란을"],
    ["떡볶이떡", "떡볶이떡을"],
    ["Spam", "Spam을(를)"],
  ])("%s → %s", (word, expected) => {
    expect(josa(word, "을", "를")).toBe(expected);
  });
});
