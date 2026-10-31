import React from "react";

/**
 * Caches the rendered row of every item, keyed by object identity plus a string of whatever else the row
 * depends on. The host table reconciles every row on each render, handing back the same element lets
 * React skip the unchanged ones.
 */
export function useRowCache<Item extends object>() {
  const cache = React.useRef(new WeakMap<Item, { key: string; element: React.ReactElement }>());

  return React.useCallback((item: Item, key: string, render: () => React.ReactElement) => {
    const hit = cache.current.get(item);

    if (hit?.key === key) return hit.element;

    const element = render();

    cache.current.set(item, { key, element });

    return element;
  }, []);
}

/** Keeps a callback stable for cached rows while still calling the latest version. */
export function useLatest<Value>(value: Value): React.MutableRefObject<Value> {
  const ref = React.useRef(value);

  ref.current = value;

  return ref;
}
