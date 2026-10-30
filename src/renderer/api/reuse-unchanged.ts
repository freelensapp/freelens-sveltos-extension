function shallowEqual(a: object, b: object): boolean {
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);

  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key]);
}

/**
 * Keeps the previous object of every item whose fields did not change, and the previous array when
 * nothing changed at all. Stores replace every object on a reload, this lets memoized rows skip work.
 */
export function reuseUnchanged<Item extends { id: string }>(previous: readonly Item[], next: Item[]): Item[] {
  const byId = new Map(previous.map((item) => [item.id, item]));
  let changed = previous.length !== next.length;

  const result = next.map((item, index) => {
    const old = byId.get(item.id);

    if (old && shallowEqual(old, item)) {
      if (previous[index] !== old) changed = true;

      return old;
    }

    changed = true;

    return item;
  });

  return changed ? result : (previous as Item[]);
}
