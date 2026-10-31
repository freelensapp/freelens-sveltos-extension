import { Common } from "@freelensapp/extensions";
import { observable, observableRef } from "mobx";
import { normalizeUiSettings, type UiSettings } from "../ui-settings";

export interface SveltosPreferencesModel {
  metadataFilter?: string;
  latestRelease?: string;
  latestReleaseCheckedAt?: number;
  uiSettings?: UiSettings;
}

export class SveltosPreferencesStore extends Common.Store.ExtensionStore<SveltosPreferencesModel> {
  @observable accessor metadataFilter: string | undefined = undefined;
  @observable accessor latestRelease: string | undefined = undefined;
  @observable accessor latestReleaseCheckedAt: number | undefined = undefined;
  @observableRef accessor uiSettings: UiSettings | undefined = undefined;

  constructor() {
    super({
      configName: "sveltos-preferences-store",
      defaults: {},
    });
  }

  fromStore({
    metadataFilter,
    latestRelease,
    latestReleaseCheckedAt,
    uiSettings,
  }: Partial<SveltosPreferencesModel>): void {
    this.metadataFilter = metadataFilter;
    this.latestRelease = latestRelease;
    this.latestReleaseCheckedAt = latestReleaseCheckedAt;
    this.uiSettings = uiSettings ? normalizeUiSettings(uiSettings) : undefined;
  }

  /**
   * The host saves each key of the model on its own and rejects an undefined value ("Use `delete()` to clear values"),
   * which would leave the keys after it unsaved: an unset field is left out.
   */
  toJSON(): SveltosPreferencesModel {
    const model: SveltosPreferencesModel = {
      metadataFilter: this.metadataFilter,
      latestRelease: this.latestRelease,
      latestReleaseCheckedAt: this.latestReleaseCheckedAt,
      uiSettings: this.uiSettings,
    };

    return Object.fromEntries(Object.entries(model).filter(([, value]) => value !== undefined));
  }
}
