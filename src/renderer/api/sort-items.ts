export type SortOrder = "asc" | "desc";

/** Stable sort that reads every sort key once, the host table matches rows to items in O(n²) instead. */
export function sortItems<Item>(items: Item[], key: (item: Item) => string | number, order: SortOrder): Item[] {
  const direction = order === "asc" ? 1 : -1;

  return items
    .map((item) => ({ item, key: key(item) }))
    .sort((a, b) => (a.key < b.key ? -direction : a.key > b.key ? direction : 0))
    .map(({ item }) => item);
}
