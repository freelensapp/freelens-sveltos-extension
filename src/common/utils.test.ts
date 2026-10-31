import { describe, expect, it } from "vitest";
import { maybe } from "./utils";

// This file is a minimal template for unit tests in this extension. Copy it
// next to the module you want to cover (as `<module>.test.ts`) and adapt the
// cases below. Tests run with `pnpm test:unit` (vitest).

describe("maybe", () => {
  it("returns the value when the wrapped function succeeds", () => {
    expect(maybe(() => 42)).toBe(42);
  });

  it("returns null when the wrapped function throws", () => {
    expect(
      maybe(() => {
        throw new Error("boom");
      }),
    ).toBeNull();
  });

  it("preserves falsy values returned by the wrapped function", () => {
    expect(maybe(() => 0)).toBe(0);
    expect(maybe(() => "")).toBe("");
    expect(maybe(() => false)).toBe(false);
  });
});
