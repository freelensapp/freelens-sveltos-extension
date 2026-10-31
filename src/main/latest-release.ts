import { compareVersions, isStableVersion } from "../common/version";
import { httpGet } from "./http";

// The Atom feed is not subject to the 60 requests per hour of the REST API, which
// is shared by every client behind the same address.
const latestReleaseUrl = "https://github.com/projectsveltos/sveltos/releases.atom";

/** Sveltos releases are not frequent, one lookup a day is plenty and keeps GitHub happy. */
export const latestReleaseTtl = 24 * 60 * 60 * 1000;

export interface LatestReleaseRequest {
  force: boolean;
}

/** The IPC wrapper may or may not prepend the Electron event, so find the payload by shape. */
export function findLatestReleaseRequest(args: unknown[]): LatestReleaseRequest | undefined {
  return args.find(
    (arg): arg is LatestReleaseRequest =>
      typeof arg === "object" && arg !== null && typeof (arg as LatestReleaseRequest).force === "boolean",
  );
}

export function isLatestReleaseFresh(checkedAt: number | undefined, now = Date.now()): boolean {
  return checkedAt !== undefined && now - checkedAt < latestReleaseTtl;
}

/** Entry ids look like `tag:github.com,2008:Repository/582340985/v1.14.0`. */
export function parseLatestReleaseTag(feed: string): string | undefined {
  const tags = [...feed.matchAll(/<id>tag:github\.com,\d+:Repository\/\d+\/([^<]+)<\/id>/g)].map((match) => match[1]);

  return tags.filter(isStableVersion).sort((a, b) => compareVersions(b, a))[0];
}

/**
 * Runs in the main process on purpose: the renderer goes through the Chromium
 * network stack, which honours the Freelens proxy settings and the page CSP.
 */
export async function fetchLatestSveltosRelease(insecureTls = false): Promise<string | undefined> {
  const response = await httpGet(latestReleaseUrl, { accept: "application/atom+xml", insecureTls });

  if (response.status !== 200) throw new Error(`GitHub responded with ${response.status}`);

  return parseLatestReleaseTag(response.body.toString("utf8"));
}
