import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { SveltosPreferencesStore } from "../../common/store";
import { isValidMetadataFilter } from "../api/metadata-filter";

const { observer } = MobxReact;

const {
  Component: { Input },
} = Renderer;

export const MetadataFilterPreferenceInput = observer(() => {
  const store = SveltosPreferencesStore.getInstanceOrCreate<SveltosPreferencesStore>();

  return (
    <Input
      theme="round-black"
      placeholder="^projectsveltos\.io/|^env$"
      value={store.metadataFilter ?? ""}
      validators={[
        {
          condition: () => true,
          message: () => "Invalid regular expression",
          validate: (value: string) => isValidMetadataFilter(value),
        },
      ]}
      onChange={(value: string) => {
        store.metadataFilter = value;
      }}
    />
  );
});

export const MetadataFilterPreferenceHint = () => (
  <span>
    Regular expression matched against label and annotation keys in the Sveltos cluster details. Leave it empty to show
    all of them.
  </span>
);
