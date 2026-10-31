import { describe, expect, it } from "vitest";
import {
  findLatestReleaseRequest,
  isLatestReleaseFresh,
  latestReleaseTtl,
  parseLatestReleaseTag,
} from "./latest-release";

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>tag:github.com,2008:https://github.com/projectsveltos/sveltos/releases</id>
  <entry>
    <id>tag:github.com,2008:Repository/582340985/v1.13.0</id>
    <title>v1.13.0</title>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/582340985/v1.14.0</id>
    <title>v1.14.0</title>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/582340985/v1.15.0-rc1</id>
    <title>v1.15.0-rc1</title>
  </entry>
</feed>`;

describe("parseLatestReleaseTag", () => {
  it("returns the highest stable tag regardless of the feed order", () => {
    expect(parseLatestReleaseTag(feed)).toBe("v1.14.0");
  });

  it("ignores the feed id, which is not a release", () => {
    expect(parseLatestReleaseTag(`<id>tag:github.com,2008:https://github.com/a/b/releases</id>`)).toBeUndefined();
  });

  it("returns undefined for an empty feed", () => {
    expect(parseLatestReleaseTag("")).toBeUndefined();
  });
});

describe("findLatestReleaseRequest", () => {
  const request = { force: true };

  it("finds the payload whether or not the event is prepended", () => {
    expect(findLatestReleaseRequest([request])).toBe(request);
    expect(findLatestReleaseRequest([{ sender: {} }, request])).toBe(request);
  });

  it("ignores arguments that are not a request", () => {
    expect(findLatestReleaseRequest([{ sender: {} }])).toBeUndefined();
    expect(findLatestReleaseRequest([])).toBeUndefined();
  });
});

describe("isLatestReleaseFresh", () => {
  const now = 1_800_000_000_000;

  it("is fresh within the time to live", () => {
    expect(isLatestReleaseFresh(now - 1000, now)).toBe(true);
    expect(isLatestReleaseFresh(now - latestReleaseTtl + 1000, now)).toBe(true);
  });

  it("expires after the time to live", () => {
    expect(isLatestReleaseFresh(now - latestReleaseTtl - 1000, now)).toBe(false);
  });

  it("is never fresh without a previous check", () => {
    expect(isLatestReleaseFresh(undefined, now)).toBe(false);
  });
});
