import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { type Addon, type AddonType, addonTypes, filterAddons, updateLabel } from "../api/addons";
import { countByStatus, matchesStatus } from "../api/status-filter";
import { AddonIcon } from "./addon-icon";
import { useColumnResize } from "./column-resize";
import styles from "./dashboard.module.scss";
import { LastUpdate } from "./last-update";
import { useLatest, useRowCache } from "./row-cache";
import { StatusChip, statusTone } from "./status-chip";
import { allStatuses, StatusFilter } from "./status-filter";
import { ColumnsMenu, type TableColumn, useHiddenColumns, useTableSort } from "./table-columns";
import { type ViewMode, ViewToggle } from "./view-toggle";

const { observer } = MobxReact;

const {
  Component: { Icon, SearchInput, Table, TableCell, TableHead, TableRow },
} = Renderer;

function UpdateChip({ addon }: { addon: Addon }) {
  if (addon.updateAvailable === undefined) return <>-</>;

  const latest = addon.latestVersion ?? addon.latestPatchVersion;
  const tooltip = [
    addon.latestVersion ? `Latest: ${addon.latestVersion}` : undefined,
    addon.latestPatchVersion ? `Latest patch: ${addon.latestPatchVersion}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      className={`${styles.status} ${addon.updateAvailable ? styles.statusWarn : styles.statusOk}`}
      title={tooltip || undefined}
    >
      <Icon material={addon.updateAvailable ? "upgrade" : "check_circle"} small />
      {addon.updateAvailable ? latest : "Up to date"}
    </span>
  );
}

const sortingCallbacks = {
  name: (addon: Addon) => addon.name,
  type: (addon: Addon) => addon.type,
  namespace: (addon: Addon) => addon.namespace ?? "",
  version: (addon: Addon) => addon.version ?? "",
  appVersion: (addon: Addon) => addon.appVersion ?? "",
  update: (addon: Addon) => updateLabel(addon) ?? "",
  cluster: (addon: Addon) => addon.clusterName,
  profile: (addon: Addon) => addon.profile ?? "",
  status: (addon: Addon) => addon.status ?? "",
  updated: (addon: Addon) => addon.lastAppliedTime ?? "",
};

interface AddonColumn extends TableColumn {
  sortBy: keyof typeof sortingCallbacks;
  className?: string;
  render: (addon: Addon) => React.ReactNode;
}

const columns: AddonColumn[] = [
  {
    id: "type",
    title: "Type",
    sortBy: "type",
    className: styles.cellMedium,
    render: (addon) => (
      <span className={styles.addonName}>
        <AddonIcon type={addon.type} iconUrl={addon.icon} small tooltip={addon.source} />
        {addon.type}
      </span>
    ),
  },
  {
    id: "name",
    title: "Name",
    sortBy: "name",
    className: styles.cellName,
    render: (addon) => (
      <span className={styles.cellText} title={addon.source ? `${addon.name}\n${addon.source}` : addon.name}>
        {addon.name}
      </span>
    ),
  },
  {
    id: "namespace",
    title: "Namespace",
    sortBy: "namespace",
    className: styles.cellMedium,
    render: (addon) => addon.namespace ?? "-",
  },
  {
    id: "version",
    title: "Version",
    sortBy: "version",
    className: styles.cellMedium,
    render: (addon) => addon.version ?? "-",
  },
  {
    id: "appVersion",
    title: "AppVersion",
    sortBy: "appVersion",
    className: styles.cellMedium,
    render: (addon) => addon.appVersion ?? "-",
  },
  {
    id: "update",
    title: "Update",
    sortBy: "update",
    className: styles.cellMedium,
    render: (addon) => <UpdateChip addon={addon} />,
  },
  {
    id: "cluster",
    title: "Cluster",
    sortBy: "cluster",
    className: styles.cellMedium,
    render: (addon) => addon.clusterName,
  },
  {
    id: "profile",
    title: "Profile",
    sortBy: "profile",
    className: styles.cellMedium,
    render: (addon) => addon.profile ?? "-",
  },
  {
    id: "status",
    title: "Status",
    sortBy: "status",
    className: styles.cellMedium,
    render: (addon) => <StatusChip status={addon.status} tooltip={addon.message} />,
  },
  {
    id: "updated",
    title: "Last Update",
    sortBy: "updated",
    className: styles.cellMedium,
    render: (addon) => <LastUpdate timestamp={addon.lastAppliedTime} />,
  },
];

const tableId = "sveltosAddonsTable";

export interface AddonsViewProps {
  addons: Addon[];
  subtitle: string;
  selectedAddonId?: string;
  onAddonSelect?: (addon: Addon) => void;
}

export const AddonsView = observer(({ addons, subtitle, selectedAddonId, onAddonSelect }: AddonsViewProps) => {
  const [view, setView] = React.useState<ViewMode>("table");
  const [type, setType] = React.useState<AddonType | "All">("All");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState(allStatuses);
  const { headProps, cellClass, widthStyle } = useColumnResize();
  const hidden = useHiddenColumns(tableId);
  const cachedRow = useRowCache<Addon>();
  const onSelect = useLatest(onAddonSelect);
  const select = React.useCallback((addon: Addon) => onSelect.current?.(addon), [onSelect]);
  const matching = React.useMemo(() => filterAddons(addons, type, search), [addons, type, search]);
  const statusCounts = React.useMemo(() => countByStatus(matching, (addon) => addon.status), [matching]);
  const visible = React.useMemo(
    () => (status === allStatuses ? matching : matching.filter((addon) => matchesStatus(addon.status, status))),
    [matching, status],
  );
  const shown = columns.filter((column) => !hidden.has(column.id));
  const layoutKey = shown.map((column) => column.id).join(",");
  const { sorted, sortHeadProps } = useTableSort(visible, sortingCallbacks, "name");

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Add-ons</h3>
        <span className={styles.sectionSubtitle}>
          {subtitle} · {visible.length} of {addons.length}
        </span>
        <div className={styles.spacer} />
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            {(["All", ...addonTypes] as const).map((option) => (
              <button
                type="button"
                key={option}
                className={`${styles.viewToggleButton} ${type === option ? styles.viewToggleButtonActive : ""}`}
                onClick={() => setType(option)}
              >
                {option !== "All" ? <AddonIcon type={option} small /> : null}
                {option}
              </button>
            ))}
          </div>
          <StatusFilter id="sveltosAddonStatus" value={status} counts={statusCounts} onChange={setStatus} />
          <SearchInput
            className={styles.searchWide}
            value={search}
            onChange={(value: string) => setSearch(value)}
            placeholder="version: 1.2, profile: kyverno"
            title="Filter by field, comma separated. Bare words search everywhere."
          />
          <ViewToggle value={view} onChange={setView} />
          {view === "table" ? <ColumnsMenu tableId={tableId} columns={columns} /> : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>No add-ons deployed for the current selection.</div>
      ) : view === "cards" ? (
        <div className={styles.cards}>
          {visible.map((addon) => (
            <AddonCard key={addon.id} addon={addon} selected={addon.id === selectedAddonId} onSelect={select} />
          ))}
        </div>
      ) : (
        <div className={styles.tableScroll}>
          {widthStyle}
          <Table className={styles.table} tableId={tableId} selectable scrollable={false} virtual={false}>
            <TableHead sticky={false}>
              {shown.map((column) => (
                <TableCell
                  key={column.id}
                  className={`${column.className ?? ""} ${cellClass(column.id)}`}
                  {...sortHeadProps(column.sortBy)}
                  {...headProps(column.id)}
                >
                  {column.title}
                </TableCell>
              ))}
            </TableHead>
            {sorted.map((addon) => {
              const selected = addon.id === selectedAddonId;

              return cachedRow(addon, `${selected}|${layoutKey}`, () => (
                <TableRow key={addon.id} nowrap selected={selected} onClick={() => select(addon)}>
                  {shown.map((column) => (
                    <TableCell key={column.id} className={`${column.className ?? ""} ${cellClass(column.id)}`}>
                      {column.render(addon)}
                    </TableCell>
                  ))}
                </TableRow>
              ));
            })}
          </Table>
        </div>
      )}
    </div>
  );
});

const AddonCard = React.memo(function AddonCard({
  addon,
  selected,
  onSelect,
}: {
  addon: Addon;
  selected?: boolean;
  onSelect?: (addon: Addon) => void;
}) {
  const tone = statusTone(addon.status);
  const toneClass = tone === "error" ? styles.cardError : tone === "ok" ? styles.cardOk : styles.cardWarn;

  return (
    <div
      className={`${styles.card} ${toneClass} ${onSelect ? styles.cardClickable : ""} ${
        selected ? styles.cardSelected : ""
      }`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(addon)}
      onKeyDown={(event) => {
        if (onSelect && (event.key === "Enter" || event.key === " ")) onSelect(addon);
      }}
    >
      <div className={styles.cardHeader}>
        <AddonIcon type={addon.type} iconUrl={addon.icon} tooltip={addon.source} />
        <div className={styles.cardHeading}>
          <span className={styles.cardName}>{addon.name}</span>
          <span className={styles.cardSubtitle}>{addon.namespace ?? addon.type}</span>
        </div>
      </div>

      <div className={styles.chips}>
        <StatusChip status={addon.status} tooltip={addon.message} />
        {addon.version ? (
          <span className={styles.chip}>
            <span className={styles.chipLabel}>Version</span>
            {addon.version}
          </span>
        ) : null}
        {addon.updateAvailable !== undefined ? <UpdateChip addon={addon} /> : null}
      </div>

      <div className={styles.chips}>
        <span className={styles.chip}>
          <span className={styles.chipLabel}>Cluster</span>
          {addon.clusterName}
        </span>
        {addon.profile ? (
          <span className={styles.chip}>
            <span className={styles.chipLabel}>Profile</span>
            {addon.profile}
          </span>
        ) : null}
        {addon.lastAppliedTime ? (
          <span className={styles.chip}>
            <span className={styles.chipLabel}>Updated</span>
            <LastUpdate timestamp={addon.lastAppliedTime} />
          </span>
        ) : null}
      </div>

      {addon.source ? <span className={styles.cardSubtitle}>{addon.source}</span> : null}
    </div>
  );
});
