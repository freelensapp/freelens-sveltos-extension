import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { SveltosPreferencesStore } from "../../common/store";

const { observer } = MobxReact;

const {
  Component: { Checkbox },
} = Renderer;

const preferences = SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>();

export const SveltosPreferenceInput = observer(() => {
  return (
    <Checkbox
      label="Sveltos checkbox"
      value={preferences.enabled}
      onChange={(v) => {
        console.log(`[SVELTOS-PREFERENCES-STORE] onChange ${v}`);
        preferences.enabled = v;
      }}
    />
  );
});

export const SveltosPreferenceHint = () => <span>This is an sveltos of an preference for extensions.</span>;
