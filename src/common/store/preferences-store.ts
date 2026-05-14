import { Common } from "@freelensapp/extensions";
import { makeObservable, observable } from "mobx";

export interface SveltosPreferencesModel {
  enabled: boolean;
}

export class SveltosPreferencesStore extends Common.Store.ExtensionStore<SveltosPreferencesModel> {
  @observable enabled = false;

  constructor() {
    super({
      configName: "sveltos-preferences-store",
      defaults: {
        enabled: false,
      },
    });
    console.log("[SVELTOS-PREFERENCES-STORE] constructor");
    makeObservable(this);
  }

  fromStore({ enabled }: SveltosPreferencesModel): void {
    console.log(`[SVELTOS-PREFERENCES-STORE] set ${enabled}`);

    this.enabled = enabled;
  }

  toJSON(): SveltosPreferencesModel {
    const enabled = this.enabled;
    console.log(`[SVELTOS-PREFERENCES-STORE] get ${enabled}`);
    return {
      enabled,
    };
  }
}
