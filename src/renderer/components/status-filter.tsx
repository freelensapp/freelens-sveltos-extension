import { Renderer } from "@freelensapp/extensions";
import styles from "./dashboard.module.scss";

import type { StatusCount } from "../api/status-filter";

const {
  Component: { Select },
} = Renderer;

/** Sentinel for "every status", `Select` needs a concrete value. */
export const allStatuses = "";

export interface StatusFilterProps {
  id: string;
  value: string;
  counts: StatusCount[];
  onChange: (value: string) => void;
}

export function StatusFilter({ id, value, counts, onChange }: StatusFilterProps) {
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const options = [
    { value: allStatuses, label: `All statuses (${total})` },
    ...counts.map(({ status, count }) => ({ value: status, label: `${status} (${count})` })),
  ];

  // Keep a selected status that no longer matches anything visible, so the choice is not silently dropped.
  if (value !== allStatuses && !counts.some(({ status }) => status === value)) {
    options.push({ value, label: `${value} (0)` });
  }

  return (
    <Select
      id={id}
      className={styles.statusSelect}
      options={options}
      value={value}
      onChange={(option) => onChange(option?.value ?? allStatuses)}
    />
  );
}
