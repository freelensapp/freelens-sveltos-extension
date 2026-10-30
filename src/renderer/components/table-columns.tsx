import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import React from "react";
import { type SortOrder, sortItems } from "../api/sort-items";
import { getHiddenColumns, setColumnHidden, syncUiSettings } from "../api/ui-settings";

const { observer } = MobxReact;

const {
  Component: { Checkbox, MenuActions, MenuItem },
} = Renderer;

export interface TableColumn {
  id: string;
  title: string;
}

/**
 * Hidden columns of a dashboard table, persisted in the extension settings. Read it from an `observer`
 * component so the table follows changes made through the menu.
 */
export function useHiddenColumns(tableId: string): Set<string> {
  React.useEffect(() => syncUiSettings(), []);

  return new Set(getHiddenColumns(tableId));
}

/**
 * Sorting done here instead of passing `sortable` to the host `Table`, which pairs every row with its
 * item through a linear search on each render: O(n²), the UI stalls with a few thousand add-ons.
 * `sortHeadProps` gives a head cell the same sort arrow and click handling the host would.
 */
export function useTableSort<Item, Callbacks extends Record<string, (item: Item) => string | number>>(
  items: Item[],
  callbacks: Callbacks,
  defaultSortBy: keyof Callbacks & string,
) {
  type Key = keyof Callbacks & string;

  const [sorting, setSorting] = React.useState<{ sortBy: Key; orderBy: SortOrder }>({
    sortBy: defaultSortBy,
    orderBy: "asc",
  });
  const sort = React.useCallback(
    (sortBy: Key) =>
      setSorting((current) => ({
        sortBy,
        orderBy: current.sortBy === sortBy && current.orderBy === "asc" ? "desc" : "asc",
      })),
    [],
  );
  const sorted = React.useMemo(
    () => sortItems(items, callbacks[sorting.sortBy], sorting.orderBy),
    [items, callbacks, sorting],
  );
  const sortHeadProps = (sortBy?: Key) =>
    sortBy ? { sortBy, _sort: (value: string | number) => sort(value as Key), _sorting: sorting } : {};

  return { sorted, sortHeadProps };
}

export interface ColumnsMenuProps {
  tableId: string;
  columns: TableColumn[];
}

/** Same checkbox menu the host list layouts use to pick visible columns. */
export const ColumnsMenu = observer(({ tableId, columns }: ColumnsMenuProps) => {
  const hidden = new Set(getHiddenColumns(tableId));
  const visibleCount = columns.filter((column) => !hidden.has(column.id)).length;

  return (
    <MenuActions
      id={`sveltos-columns-${tableId}`}
      toolbar={false}
      autoCloseOnSelect={false}
      triggerIcon={{ material: "view_column", tooltip: "Show or hide columns" }}
    >
      {columns.map((column) => {
        const visible = !hidden.has(column.id);

        return (
          <MenuItem key={column.id} className="input">
            <Checkbox
              label={column.title}
              value={visible}
              // The last visible column stays, an empty table could not bring the menu back.
              disabled={visible && visibleCount <= 1}
              onChange={(value) => setColumnHidden(tableId, column.id, !value)}
            />
          </MenuItem>
        );
      })}
    </MenuActions>
  );
});
