import { describe, expect, it } from "vitest";
import { emptyUiSettings, findUiSettingsRequest, mergeUiSettings, normalizeUiSettings } from "./ui-settings";

describe("normalizeUiSettings", () => {
  it("drops malformed entries", () => {
    expect(
      normalizeUiSettings({
        hiddenColumns: { addons: ["version", 3, null], broken: "nope" },
        collapsed: { helmRelease: true, other: "yes" },
      }),
    ).toEqual({ hiddenColumns: { addons: ["version"] }, collapsed: { helmRelease: true }, shardColors: {} });
    expect(normalizeUiSettings({ shardColors: { a: "#12abEF", b: "red", c: "#fff;}", d: "" } }).shardColors).toEqual({
      a: "#12abEF",
      d: "",
    });
    expect(normalizeUiSettings(null)).toEqual(emptyUiSettings());
    expect(normalizeUiSettings([])).toEqual(emptyUiSettings());
  });
});

describe("mergeUiSettings", () => {
  it("replaces only the tables and sections in the patch", () => {
    const current = {
      hiddenColumns: { clusters: ["age"], addons: ["version"] },
      collapsed: { helmRelease: true },
      shardColors: { aws: "#ff0000" },
    };

    expect(mergeUiSettings(current, { hiddenColumns: { addons: [] } })).toEqual({
      hiddenColumns: { clusters: ["age"], addons: [] },
      collapsed: { helmRelease: true },
      shardColors: { aws: "#ff0000" },
    });
    expect(mergeUiSettings(current, { collapsed: { helmRelease: false } }).collapsed).toEqual({ helmRelease: false });
    expect(mergeUiSettings(current, { shardColors: { azure: "#00ff00" } }).shardColors).toEqual({
      aws: "#ff0000",
      azure: "#00ff00",
    });
    expect(mergeUiSettings(current, { shardColors: { aws: "" } }).shardColors).toEqual({});
    expect(mergeUiSettings(current, undefined)).toEqual(current);
  });
});

describe("findUiSettingsRequest", () => {
  it("finds the request among the IPC arguments", () => {
    const request = { uiSettings: true as const, patch: { collapsed: { a: true } } };

    expect(findUiSettingsRequest([{}, request])).toBe(request);
    expect(findUiSettingsRequest([{ force: true }])).toBeUndefined();
  });
});
