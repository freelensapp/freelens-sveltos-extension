import { Common } from "@freelensapp/extensions";
import React from "react";

/** An invalid pattern must not hide metadata, so it falls back to showing every key. */
export function createMetadataFilter(pattern: string | undefined): (key: string) => boolean {
  if (!pattern?.trim()) return () => true;

  try {
    const regexp = new RegExp(pattern);

    return (key) => regexp.test(key);
  } catch {
    return () => true;
  }
}
export function isValidMetadataFilter(pattern: string | undefined): boolean {
  if (!pattern?.trim()) return true;

  try {
    new RegExp(pattern);

    return true;
  } catch {
    return false;
  }
}

export type MetadataFilterFetcher = () => Promise<string | undefined>;

let fetcher: MetadataFilterFetcher | undefined;

export function setMetadataFilterFetcher(value: MetadataFilterFetcher): void {
  fetcher = value;
}

/** The preferences store does not sync into cluster frames, so the pattern comes from the main process. */
export function useMetadataFilter(): (key: string) => boolean {
  const [pattern, setPattern] = React.useState<string>();

  React.useEffect(() => {
    let active = true;

    fetcher?.()
      .then((value) => {
        if (active) setPattern(value);
      })
      .catch((error) => {
        Common.logger.warn(`[@freelensapp/sveltos-extension]: cannot read the metadata filter: ${error}`);
      });

    return () => {
      active = false;
    };
  }, []);

  return createMetadataFilter(pattern);
}
