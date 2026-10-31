import { httpGet } from "./http";

export interface ChartIconRequest {
  iconUrl: string;
}

export interface ChartIconResult {
  icon?: string;
  /** Why the logo could not be inlined, so a blocked download is not silently ignored. */
  reason?: string;
}

/** The IPC wrapper may or may not prepend the Electron event, so find the payload by shape. */
export function findChartIconRequest(args: unknown[]): ChartIconRequest | undefined {
  return args.find(
    (arg): arg is ChartIconRequest =>
      typeof arg === "object" && arg !== null && typeof (arg as ChartIconRequest).iconUrl === "string",
  );
}

/** `fetch` reports every network problem as "fetch failed", the detail is in `cause`. */
function describeError(error: unknown): string {
  const cause = (error as { cause?: unknown } | undefined)?.cause;

  return cause ? `${error} (${cause})` : String(error);
}

const cache = new Map<string, ChartIconResult>();

/**
 * Inlines the chart logo Sveltos reports in ClusterConfiguration as a data URL.
 * Runs in the main process because the renderer network stack is subject to the
 * Freelens proxy settings and the page CSP.
 */
export async function fetchChartIcon(iconUrl: string, insecureTls = false): Promise<ChartIconResult> {
  const cached = cache.get(iconUrl);

  if (cached) return cached;

  try {
    const image = await httpGet(iconUrl, { insecureTls });
    const result: ChartIconResult =
      image.status === 200
        ? { icon: `data:${image.contentType || "image/png"};base64,${image.body.toString("base64")}` }
        : { reason: `${iconUrl} responded ${image.status}` };

    cache.set(iconUrl, result);

    return result;
  } catch (error) {
    // Network failures are transient, report them without caching so the next render retries.
    return { reason: describeError(error) };
  }
}
