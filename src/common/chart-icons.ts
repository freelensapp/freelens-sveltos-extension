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
