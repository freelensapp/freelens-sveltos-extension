/** Layout choices the user makes in the dashboard, persisted so they survive restarts and apply to every cluster. */
export interface UiSettings {
  /** Hidden column ids per table id. */
  hiddenColumns: Record<string, string[]>;
  /** Collapsed state per section id, absent keys use the section default. */
  collapsed: Record<string, boolean>;
  /** `#rrggbb` per shard key, `""` for the default shard; an empty color in a patch removes the entry. */
  shardColors: Record<string, string>;
}

/** Without a patch the request only reads the current settings. */
export interface UiSettingsRequest {
  uiSettings: true;
  patch?: Partial<UiSettings>;
}

export function emptyUiSettings(): UiSettings {
  return { hiddenColumns: {}, collapsed: {}, shardColors: {} };
}

const hexColor = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Settings come from disk and from other processes, anything malformed is dropped instead of trusted. */
export function normalizeUiSettings(value: unknown): UiSettings {
  const settings = emptyUiSettings();

  if (!isRecord(value)) return settings;

  if (isRecord(value.hiddenColumns)) {
    for (const [tableId, columns] of Object.entries(value.hiddenColumns)) {
      if (Array.isArray(columns)) {
        settings.hiddenColumns[tableId] = columns.filter((column): column is string => typeof column === "string");
      }
    }
  }

  if (isRecord(value.collapsed)) {
    for (const [section, collapsed] of Object.entries(value.collapsed)) {
      if (typeof collapsed === "boolean") settings.collapsed[section] = collapsed;
    }
  }

  if (isRecord(value.shardColors)) {
    for (const [shard, color] of Object.entries(value.shardColors)) {
      if (typeof color === "string" && (color === "" || hexColor.test(color))) settings.shardColors[shard] = color;
    }
  }

  return settings;
}

/** Merges per key, so two windows changing different tables do not overwrite each other. */
export function mergeUiSettings(current: UiSettings, patch: Partial<UiSettings> | undefined): UiSettings {
  const normalized = normalizeUiSettings(patch);

  return {
    hiddenColumns: { ...current.hiddenColumns, ...normalized.hiddenColumns },
    collapsed: { ...current.collapsed, ...normalized.collapsed },
    shardColors: Object.fromEntries(
      Object.entries({ ...current.shardColors, ...normalized.shardColors }).filter(([, color]) => color !== ""),
    ),
  };
}

export function findUiSettingsRequest(args: unknown[]): UiSettingsRequest | undefined {
  return args.find((arg): arg is UiSettingsRequest => isRecord(arg) && arg.uiSettings === true);
}
