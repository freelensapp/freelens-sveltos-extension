import { Renderer } from "@freelensapp/extensions";

/** Matches the refresh cadence of the official Sveltos dashboard, as a backstop for a dropped watch. */
const reloadIntervalMs = 30_000;

interface SubscribableStore {
  readonly isLoaded: boolean;
  loadAll(options: { namespaces?: string[] }): Promise<unknown>;
  reloadAll(options: { force: boolean; namespaces?: string[] }): Promise<unknown>;
  subscribe(params: { abortController: AbortController }): () => void;
}

/**
 * Without explicit namespaces Freelens loads only those picked in its global namespace filter, so the
 * dashboards and their namespace menus would silently lose every other namespace. Undefined (namespace
 * list not loaded yet) falls back to that default rather than loading nothing.
 */
function allNamespaces(): string[] | undefined {
  const names = Renderer.K8sApi.namespaceStore.items.map((namespace) => namespace.getName());

  return names.length > 0 ? names : undefined;
}

/**
 * Freelens only starts the watch once the first list call has stored a resourceVersion, so
 * `loadAll` has to resolve before `subscribe`, otherwise the watch silently never starts.
 *
 * A failed list resets the store: items are cleared and `isLoaded` goes false, which also makes
 * the running watch drop every event. So a single transient API failure leaves the page empty
 * forever unless both the list and the watch are restarted, which is what the timer does.
 */
export function subscribeToStores(stores: SubscribableStore[]): () => void {
  const watches = new Map<SubscribableStore, AbortController>();
  let stopped = false;

  // No-op when Freelens already loaded the namespaces, a failure falls back to its namespace filter.
  const namespacesLoaded = Renderer.K8sApi.namespaceStore.reloadAll().catch(() => undefined);
  const reload = (store: SubscribableStore) =>
    void namespacesLoaded
      .then(() => store.loadAll({ namespaces: allNamespaces() }))
      .then(() => {
        if (stopped || !store.isLoaded) return;

        watches.get(store)?.abort();

        const abortController = new AbortController();

        watches.set(store, abortController);
        store.subscribe({ abortController });
      });

  for (const store of stores) reload(store);

  const reloadTimer = window.setInterval(() => {
    for (const store of stores) {
      if (store.isLoaded) {
        void store.reloadAll({ force: true, namespaces: allNamespaces() });
      } else {
        reload(store);
      }
    }
  }, reloadIntervalMs);

  return () => {
    stopped = true;
    window.clearInterval(reloadTimer);
    for (const abortController of watches.values()) abortController.abort();
  };
}
