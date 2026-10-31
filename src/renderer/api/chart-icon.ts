import { Common } from "@freelensapp/extensions";
import React from "react";

import type { ChartIconResult } from "../../common/chart-icons";

export type ChartIconFetcher = (iconUrl: string) => Promise<ChartIconResult>;

let fetcher: ChartIconFetcher | undefined;

export function setChartIconFetcher(value: ChartIconFetcher): void {
  fetcher = value;
}

const cache = new Map<string, string | undefined>();
const inFlight = new Map<string, Promise<string | undefined>>();

function load(iconUrl: string): Promise<string | undefined> {
  const running = inFlight.get(iconUrl);

  if (running) return running;

  if (!fetcher) {
    Common.logger.warn(`[@freelensapp/sveltos-extension]: chart icon fetcher is not registered yet`);
    return Promise.resolve(undefined);
  }

  const pending = fetcher(iconUrl)
    .catch((error): ChartIconResult => {
      Common.logger.warn(`[@freelensapp/sveltos-extension]: cannot inline ${iconUrl}: ${error}`);
      return {};
    })
    .then((result) => {
      if (!result.icon) {
        Common.logger.info(
          `[@freelensapp/sveltos-extension]: no logo from ${iconUrl} (${result.reason ?? "unknown reason"})`,
        );
      }

      cache.set(iconUrl, result.icon);
      inFlight.delete(iconUrl);

      return result.icon;
    });

  inFlight.set(iconUrl, pending);

  return pending;
}

/** Inlines the chart logo Sveltos reports, `undefined` until it is known or when unavailable. */
export function useChartIcon(iconUrl?: string): string | undefined {
  const [icon, setIcon] = React.useState<string | undefined>(() => (iconUrl ? cache.get(iconUrl) : undefined));

  React.useEffect(() => {
    if (!iconUrl || cache.has(iconUrl)) {
      setIcon(iconUrl ? cache.get(iconUrl) : undefined);
      return;
    }

    let active = true;

    void load(iconUrl).then((value) => {
      if (active) setIcon(value);
    });

    return () => {
      active = false;
    };
  }, [iconUrl]);

  return icon;
}
