import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { SveltosPreferencesStore } from "../../common/store";

const { observer } = MobxReact;

const {
  Component: { Checkbox },
} = Renderer;

export const InsecureTlsPreferenceInput = observer(() => {
  const store = SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>();

  return (
    <Checkbox
      label="Allow untrusted certificate authorities"
      value={store.insecureTls}
      onChange={(value: boolean) => {
        store.insecureTls = value;
      }}
    />
  );
});

export const InsecureTlsPreferenceHint = () => (
  <span>
    Skips certificate validation for the requests this extension makes to fetch Helm chart logos and the latest Sveltos
    release. Enable it only behind a TLS intercepting corporate proxy. It never affects cluster communications.
  </span>
);
