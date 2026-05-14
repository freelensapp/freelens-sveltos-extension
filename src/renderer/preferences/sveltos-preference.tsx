import { Renderer } from "@freelensapp/extensions";
import { SveltosPreferencesStore } from "../../common/store";
import { observer } from "../utils/mobx";

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
