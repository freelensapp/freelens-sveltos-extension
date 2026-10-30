import { describe, expect, it } from "vitest";
import { createMetadataFilter, isValidMetadataFilter } from "./metadata-filter";

describe("createMetadataFilter", () => {
  it("keeps every key when no pattern is set", () => {
    const filter = createMetadataFilter(undefined);

    expect(filter("env")).toBe(true);
    expect(createMetadataFilter("   ")("env")).toBe(true);
  });

  it("keeps only the keys matching the pattern", () => {
    const filter = createMetadataFilter("^projectsveltos\\.io/");

    expect(filter("projectsveltos.io/cluster-name")).toBe(true);
    expect(filter("kubectl.kubernetes.io/last-applied-configuration")).toBe(false);
  });

  it("matches anywhere in the key, as a plain regular expression does", () => {
    const filter = createMetadataFilter("tier|env");

    expect(filter("my-tier")).toBe(true);
    expect(filter("region")).toBe(false);
  });

  it("falls back to showing everything when the pattern is invalid", () => {
    const filter = createMetadataFilter("[unterminated");

    expect(filter("anything")).toBe(true);
  });
});

describe("isValidMetadataFilter", () => {
  it("accepts an empty pattern and a valid one", () => {
    expect(isValidMetadataFilter(undefined)).toBe(true);
    expect(isValidMetadataFilter("^env")).toBe(true);
  });

  it("rejects a malformed pattern", () => {
    expect(isValidMetadataFilter("[unterminated")).toBe(false);
  });
});
