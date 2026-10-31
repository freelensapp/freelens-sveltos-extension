import { reaction, runInAction } from "mobx";
import { describe, expect, it } from "vitest";
import { SveltosPreferencesStore } from "./preferences-store";

import type { SveltosPreferencesModel } from "./preferences-store";

describe("SveltosPreferencesStore", () => {
  // The host saves each key of toJSON() on its own and rejects an undefined value, which would leave the keys after it
  // unsaved.
  it("leaves the unset fields out of toJSON()", () => {
    const store = new SveltosPreferencesStore();

    expect(store.toJSON()).toEqual({});

    runInAction(() => {
      store.latestReleaseCheckedAt = 1;
    });

    expect(store.toJSON()).toEqual({ latestReleaseCheckedAt: 1 });
    expect(Object.values(store.toJSON())).not.toContain(undefined);
  });

  it("reads back what it saves", () => {
    const store = new SveltosPreferencesStore();
    const model: SveltosPreferencesModel = {
      metadataFilter: "^env$",
      latestRelease: "v1.16.1",
      latestReleaseCheckedAt: 2,
      uiSettings: { hiddenColumns: { clusters: ["age"] }, collapsed: { addons: true } },
    };

    runInAction(() => store.fromStore(model));

    expect(store.toJSON()).toEqual(model);
  });

  it("changes toJSON() when a field changes, as the host's reaction needs to save it", () => {
    const store = new SveltosPreferencesStore();
    const saved: SveltosPreferencesModel[] = [];
    const dispose = reaction(
      () => store.toJSON(),
      (model) => saved.push(model),
    );

    try {
      runInAction(() => {
        store.metadataFilter = "^env$";
      });
      runInAction(() => {
        store.metadataFilter = "";
      });
    } finally {
      dispose();
    }

    expect(saved).toEqual([{ metadataFilter: "^env$" }, { metadataFilter: "" }]);
  });
});
