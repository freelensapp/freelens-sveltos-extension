import { describe, expect, it } from "vitest";
import { countByStatus, matchesStatus } from "./status-filter";

describe("countByStatus", () => {
  it("counts every status and sorts problems first", () => {
    const items = ["Provisioned", "Failed", "Provisioned", undefined, "Provisioning", "Custom"];

    expect(countByStatus(items, (status) => status)).toEqual([
      { status: "Failed", count: 1 },
      { status: "Provisioning", count: 1 },
      { status: "Provisioned", count: 2 },
      { status: "Custom", count: 1 },
      { status: "Unknown", count: 1 },
    ]);
  });
});

describe("matchesStatus", () => {
  it("matches everything without a filter and maps a missing status to Unknown", () => {
    expect(matchesStatus("Failed", "")).toBe(true);
    expect(matchesStatus("Failed", "Failed")).toBe(true);
    expect(matchesStatus("Provisioned", "Failed")).toBe(false);
    expect(matchesStatus(undefined, "Unknown")).toBe(true);
  });
});
