import { describe, expect, it } from "vitest";
import { reuseUnchanged } from "./reuse-unchanged";

describe("reuseUnchanged", () => {
  it("returns the previous array when nothing changed", () => {
    const previous = [
      { id: "a", status: "Provisioned" },
      { id: "b", status: "Provisioning" },
    ];
    const next = previous.map((item) => ({ ...item }));

    expect(reuseUnchanged(previous, next)).toBe(previous);
  });

  it("keeps unchanged objects and takes the changed ones", () => {
    const previous = [
      { id: "a", status: "Provisioned" },
      { id: "b", status: "Provisioning" },
    ];
    const result = reuseUnchanged(previous, [
      { id: "a", status: "Provisioned" },
      { id: "b", status: "Provisioned" },
    ]);

    expect(result).not.toBe(previous);
    expect(result[0]).toBe(previous[0]);
    expect(result[1]).not.toBe(previous[1]);
    expect(result[1].status).toBe("Provisioned");
  });

  it("detects added, removed and reordered items", () => {
    const previous = [{ id: "a" }, { id: "b" }];

    expect(reuseUnchanged(previous, [{ id: "a" }])).toEqual([{ id: "a" }]);
    expect(reuseUnchanged(previous, [{ id: "b" }, { id: "a" }])).toEqual([previous[1], previous[0]]);
    expect(reuseUnchanged(previous, [{ id: "a" }, { id: "b" }, { id: "c" }])).toHaveLength(3);
  });

  it("treats a removed field as a change", () => {
    const previous = [{ id: "a", message: "boom" as string | undefined }];

    expect(reuseUnchanged(previous, [{ id: "a", message: undefined }])[0]).not.toBe(previous[0]);
  });
});
