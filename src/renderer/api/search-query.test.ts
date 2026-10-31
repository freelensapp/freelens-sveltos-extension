import { describe, expect, it } from "vitest";
import { matchesSearchQuery, parseSearchQuery, toSearchFields } from "./search-query";

describe("parseSearchQuery", () => {
  it("splits comma separated key/value pairs", () => {
    expect(parseSearchQuery("cloudProvider: aws, tier: dev")).toEqual([
      { key: "cloudprovider", value: "aws" },
      { key: "tier", value: "dev" },
    ]);
  });

  it("keeps bare words as free text terms", () => {
    expect(parseSearchQuery("prod, tier: dev")).toEqual([{ value: "prod" }, { key: "tier", value: "dev" }]);
  });

  it("ignores empty segments", () => {
    expect(parseSearchQuery("  ,  , tier: dev ")).toEqual([{ key: "tier", value: "dev" }]);
  });
});

describe("matchesSearchQuery", () => {
  const target = {
    text: ["cluster-a"],
    fields: toSearchFields({ name: "cluster-a", cloudProvider: "aws", tier: "dev" }),
  };

  it("requires every term to match", () => {
    expect(matchesSearchQuery(parseSearchQuery("cloudProvider: aws, tier: dev"), target)).toBe(true);
    expect(matchesSearchQuery(parseSearchQuery("cloudProvider: aws, tier: prod"), target)).toBe(false);
  });

  it("is case insensitive on both key and value", () => {
    expect(matchesSearchQuery(parseSearchQuery("CLOUDPROVIDER: AWS"), target)).toBe(true);
  });

  it("matches partially so a bare key means the field is present", () => {
    expect(matchesSearchQuery(parseSearchQuery("tier:"), target)).toBe(true);
    expect(matchesSearchQuery(parseSearchQuery("region:"), target)).toBe(false);
  });

  it("scans text and fields for free text terms", () => {
    expect(matchesSearchQuery(parseSearchQuery("cluster-a"), target)).toBe(true);
    expect(matchesSearchQuery(parseSearchQuery("aws"), target)).toBe(true);
    expect(matchesSearchQuery(parseSearchQuery("gcp"), target)).toBe(false);
  });

  it("matches everything when the query is empty", () => {
    expect(matchesSearchQuery(parseSearchQuery("   "), target)).toBe(true);
  });
});
