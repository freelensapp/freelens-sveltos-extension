/** Problems first, then work in progress, then the settled states. */
const statusOrder = [
  "Failed",
  "FailedNonRetriable",
  "Conflict",
  "Provisioning",
  "Blocked",
  "Pending",
  "Removing",
  "AgentRemoving",
  "Paused",
  "Provisioned",
  "Removed",
];

export const unknownStatus = "Unknown";

export interface StatusCount {
  status: string;
  count: number;
}

/** Statuses actually present in the items, so the filter never offers an option that matches nothing. */
export function countByStatus<Item>(items: Item[], statusOf: (item: Item) => string | undefined): StatusCount[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const status = statusOf(item) ?? unknownStatus;

    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  const rank = (status: string) => {
    const index = statusOrder.indexOf(status);

    return index === -1 ? statusOrder.length : index;
  };

  return [...counts]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => rank(a.status) - rank(b.status) || a.status.localeCompare(b.status));
}

/** An empty filter matches everything. */
export function matchesStatus(status: string | undefined, filter: string): boolean {
  return !filter || (status ?? unknownStatus) === filter;
}
