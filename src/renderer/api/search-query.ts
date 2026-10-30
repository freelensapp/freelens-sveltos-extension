export interface SearchTerm {
  /** Lower-cased field or label name, `undefined` for free text. */
  key?: string;
  value: string;
}

export interface SearchTarget {
  /** Values scanned by free text terms. */
  text: (string | undefined)[];
  /** Values addressable as `key: value`, keys must be lower-cased. */
  fields: Record<string, string | undefined>;
}

/** Parses `cloudProvider: aws, tier: dev` into comma separated, ANDed terms. */
export function parseSearchQuery(input: string): SearchTerm[] {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(":");

      if (separator < 0) return { value: part.toLowerCase() };

      return {
        key: part.slice(0, separator).trim().toLowerCase(),
        value: part
          .slice(separator + 1)
          .trim()
          .toLowerCase(),
      };
    });
}

export function matchesSearchQuery(terms: SearchTerm[], target: SearchTarget): boolean {
  return terms.every((term) => {
    if (term.key) {
      const value = target.fields[term.key];

      return value !== undefined && value.toLowerCase().includes(term.value);
    }

    return [...target.text, ...Object.values(target.fields)].some((value) =>
      (value ?? "").toLowerCase().includes(term.value),
    );
  });
}

export function toSearchFields(entries: Record<string, string | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), value]));
}
