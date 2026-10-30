import { Common } from "@freelensapp/extensions";
import { action, observable } from "mobx";
import { emptyUiSettings, mergeUiSettings, normalizeUiSettings, type UiSettings } from "../../common/ui-settings";

import type { UiSettingsRequest } from "../../common/ui-settings";

export type UiSettingsFetcher = (request: UiSettingsRequest) => Promise<unknown>;

const localStorageKey = "freelens-sveltos-extension:ui-settings";

let fetcher: UiSettingsFetcher | undefined;
let synced = false;

function readLocal(): UiSettings {
  try {
    return normalizeUiSettings(JSON.parse(window.localStorage.getItem(localStorageKey) ?? "null"));
  } catch {
    return emptyUiSettings();
  }
}

function writeLocal(settings: UiSettings): void {
  try {
    window.localStorage.setItem(localStorageKey, JSON.stringify(settings));
  } catch {
    // Storage can be full or disabled, main still keeps the setting.
  }
}

/** The local copy avoids a flash of the default layout while main answers. */
const state = observable.box<UiSettings>(typeof window === "undefined" ? emptyUiSettings() : readLocal(), {
  deep: false,
});

const replace = action((settings: UiSettings) => {
  state.set(settings);
  writeLocal(settings);
});

export function setUiSettingsFetcher(value: UiSettingsFetcher): void {
  fetcher = value;
  synced = false;
}

/** Main owns the settings, so a change made in another cluster frame is picked up on the next page mount. */
export function syncUiSettings(): void {
  if (synced || !fetcher) return;

  synced = true;
  fetcher({ uiSettings: true })
    .then((remote) => replace(normalizeUiSettings(remote)))
    .catch((error) => {
      synced = false;
      Common.logger.warn(`[@freelensapp/sveltos-extension]: cannot read the dashboard settings: ${error}`);
    });
}

function update(patch: Partial<UiSettings>): void {
  replace(mergeUiSettings(state.get(), patch));
  fetcher?.({ uiSettings: true, patch }).catch((error) => {
    Common.logger.warn(`[@freelensapp/sveltos-extension]: cannot save the dashboard settings: ${error}`);
  });
}

export function getHiddenColumns(tableId: string): string[] {
  return state.get().hiddenColumns[tableId] ?? [];
}

export function setColumnHidden(tableId: string, columnId: string, hidden: boolean): void {
  const current = getHiddenColumns(tableId).filter((id) => id !== columnId);

  update({ hiddenColumns: { [tableId]: hidden ? [...current, columnId] : current } });
}

export function isSectionCollapsed(sectionId: string, defaultValue = false): boolean {
  return state.get().collapsed[sectionId] ?? defaultValue;
}

export function setSectionCollapsed(sectionId: string, collapsed: boolean): void {
  update({ collapsed: { [sectionId]: collapsed } });
}
