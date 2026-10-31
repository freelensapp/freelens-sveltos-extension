import { Common } from "@freelensapp/extensions";
import { observable, observableRef } from "mobx";
import { normalizeUiSettings, type UiSettings } from "../ui-settings";

export interface SveltosPreferencesModel {
  insecureTls: boolean;
  metadataFilter?: string;
  latestRelease?: string;
  latestReleaseCheckedAt?: number;
  uiSettings?: UiSettings;
}

export class SveltosPreferencesStore extends Common.Store.ExtensionStore<SveltosPreferencesModel> {
  @observable accessor insecureTls = false;
  @observable accessor metadataFilter: string | undefined = undefined;
  @observable accessor latestRelease: string | undefined = undefined;
  @observable accessor latestReleaseCheckedAt: number | undefined = undefined;
  @observableRef accessor uiSettings: UiSettings | undefined = undefined;

  constructor() {
    super({
      configName: "sveltos-preferences-store",
      defaults: { insecureTls: false },
    });
  }

  fromStore({
    insecureTls,
    metadataFilter,
    latestRelease,
    latestReleaseCheckedAt,
    uiSettings,
  }: Partial<SveltosPreferencesModel>): void {
    this.insecureTls = insecureTls ?? false;
    this.metadataFilter = metadataFilter;
    this.latestRelease = latestRelease;
    this.latestReleaseCheckedAt = latestReleaseCheckedAt;
    this.uiSettings = uiSettings ? normalizeUiSettings(uiSettings) : undefined;
  }

  toJSON(): SveltosPreferencesModel {
    return {
      insecureTls: this.insecureTls,
      metadataFilter: this.metadataFilter,
      latestRelease: this.latestRelease,
      latestReleaseCheckedAt: this.latestReleaseCheckedAt,
      uiSettings: this.uiSettings,
    };
  }
}
