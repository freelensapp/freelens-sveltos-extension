import { Common, Main } from "@freelensapp/extensions";
import { findChartIconRequest } from "../common/chart-icons";
import { findHelmReleaseRequest } from "../common/helm-release";
import {
  chartIconChannel,
  helmReleaseChannel,
  latestReleaseChannel,
  metadataFilterChannel,
  uiSettingsChannel,
} from "../common/ipc-channels";
import { SveltosPreferencesStore } from "../common/store";
import { emptyUiSettings, findUiSettingsRequest, mergeUiSettings } from "../common/ui-settings";
import { fetchChartIcon } from "./chart-icons";
import { fetchHelmRelease } from "./helm-release";
import { fetchLatestSveltosRelease, findLatestReleaseRequest, isLatestReleaseFresh } from "./latest-release";

const preferences = () => SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>();

async function getLatestRelease(force: boolean): Promise<string | undefined> {
  const store = preferences();

  if (!force && isLatestReleaseFresh(store.latestReleaseCheckedAt)) return store.latestRelease;

  const tag = await fetchLatestSveltosRelease();

  store.latestRelease = tag;
  store.latestReleaseCheckedAt = Date.now();

  return tag;
}

class SveltosIpcMain extends Main.Ipc {
  constructor(extension: Main.LensExtension) {
    super(extension);
    this.handle(latestReleaseChannel, (...args: unknown[]) =>
      getLatestRelease(findLatestReleaseRequest(args)?.force ?? false),
    );
    // The preferences store does not reach cluster frames, so main serves the current value.
    this.handle(metadataFilterChannel, () => preferences().metadataFilter);
    // Same reason: cluster frames read and write the dashboard layout through main.
    this.handle(uiSettingsChannel, (...args: unknown[]) => {
      const store = preferences();
      const patch = findUiSettingsRequest(args)?.patch;

      if (patch) store.uiSettings = mergeUiSettings(store.uiSettings ?? emptyUiSettings(), patch);

      return store.uiSettings ?? emptyUiSettings();
    });
    this.handle(chartIconChannel, (...args: unknown[]) => {
      const request = findChartIconRequest(args);

      if (!request) {
        Common.logger.warn(`[@freelensapp/sveltos-extension]: chart icon request without a payload`);
        return undefined;
      }

      return fetchChartIcon(request.iconUrl);
    });
    // Helm keeps releases in the managed cluster, which only main can reach with the Sveltos kubeconfig.
    this.handle(helmReleaseChannel, (...args: unknown[]) => {
      const request = findHelmReleaseRequest(args);

      return request ? fetchHelmRelease(request) : { error: "Helm release request without a payload" };
    });
  }
}

export default class SveltosMain extends Main.LensExtension {
  async onActivate() {
    SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>().loadExtension(this);
    SveltosIpcMain.createInstance(this);
  }

  async onDeactivate() {
    SveltosIpcMain.resetInstance();
  }
}
