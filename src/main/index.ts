import { Main } from "@freelensapp/extensions";
import { SveltosPreferencesStore } from "../common/store";

export default class SveltosMain extends Main.LensExtension {
  async onActivate() {
    await SveltosPreferencesStore.getInstanceOrCreate().loadExtension(this);
  }
}
