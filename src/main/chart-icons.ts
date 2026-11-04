import { httpGet } from "./http";

import type { ChartIconResult } from "../common/chart-icons";

/** `fetch` reports every network problem as "fetch failed", the detail is in `cause`. */
function describeError(error: unknown): string {
  const cause = (error as { cause?: unknown } | undefined)?.cause;

  return cause ? `${error} (${cause})` : String(error);
}

/** How long an HTTP error is kept, so a 404 is not asked for on every render and a 429 or 5xx is retried. */
export const failureTtlMs = 5 * 60 * 1000;

const cache = new Map<string, { result: ChartIconResult; expiresAt: number }>();

/**
 * Inlines the chart logo Sveltos reports in ClusterConfiguration as a data URL.
 * Runs in the main process, out of reach of the page CSP of the renderer.
 */
export async function fetchChartIcon(iconUrl: string): Promise<ChartIconResult> {
  const cached = cache.get(iconUrl);

  if (cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const image = await httpGet(iconUrl);
    const result: ChartIconResult =
      image.status === 200
        ? { icon: `data:${image.contentType || "image/png"};base64,${image.body.toString("base64")}` }
        : { reason: `${iconUrl} responded ${image.status}` };

    cache.set(iconUrl, { result, expiresAt: result.icon ? Infinity : Date.now() + failureTtlMs });

    return result;
  } catch (error) {
    // Network failures are transient, report them without caching so the next render retries.
    return { reason: describeError(error) };
  }
}
