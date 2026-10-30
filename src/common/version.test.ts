import { describe, expect, it } from "vitest";
import { compareVersions, isStableVersion, isUpdateAvailable } from "./version";

describe("isStableVersion", () => {
  it("accepts semver tags with or without the v prefix", () => {
    expect(isStableVersion("v1.14.0")).toBe(true);
    expect(isStableVersion("1.14.0")).toBe(true);
  });

  it("rejects pre-releases and anything else", () => {
    expect(isStableVersion("v1.15.0-rc1")).toBe(false);
    expect(isStableVersion("main")).toBe(false);
  });
});

describe("compareVersions", () => {
  it("orders semver tags with or without the v prefix", () => {
    expect(compareVersions("v0.57.0", "v0.56.9")).toBeGreaterThan(0);
    expect(compareVersions("0.56.0", "v0.57.0")).toBeLessThan(0);
    expect(compareVersions("v1.0.0", "v1.0.0")).toBe(0);
  });

  it("treats unparseable tags as equal", () => {
    expect(compareVersions("main", "v1.0.0")).toBe(0);
  });
});

describe("isUpdateAvailable", () => {
  it("reports an update only when the latest tag is newer", () => {
    expect(isUpdateAvailable("v1.13.0", "v1.14.0")).toBe(true);
    expect(isUpdateAvailable("v1.14.0", "v1.14.0")).toBe(false);
    expect(isUpdateAvailable("v1.15.0", "v1.14.0")).toBe(false);
  });

  it("reports no update when a version is unknown", () => {
    expect(isUpdateAvailable(undefined, "v1.14.0")).toBe(false);
    expect(isUpdateAvailable("v1.14.0", undefined)).toBe(false);
  });
});
