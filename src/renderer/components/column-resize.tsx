import React from "react";

const minWidth = 60;

let scopeCounter = 0;

/**
 * Column resizing for the dashboard tables. The host only renders the drag handle, the sizing itself
 * is up to the table that owns the columns.
 *
 * Widths live in a scoped `<style>` rule instead of inline styles, so dragging a handle only updates
 * that rule and never re-renders the rows, and updates are coalesced to one per animation frame.
 */
export function useColumnResize() {
  const [scope] = React.useState(() => `sveltos-table-${++scopeCounter}`);
  const [widths, setWidths] = React.useState<Record<string, number>>({});
  const frame = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.cancelAnimationFrame(frame.current ?? 0), []);

  const cellClass = (id: string) => `${scope}-${id}`;

  const headProps = (id: string) => ({
    id,
    resizable: true,
    onResizeReset: () => setWidths(({ [id]: _removed, ...rest }) => rest),
    onResizeStart: (event: MouseEvent) => {
      const cell = (event.target as HTMLElement).closest(".TableCell");

      if (!cell) return;

      const startX = event.clientX;
      const startWidth = cell.getBoundingClientRect().width;
      let latest = startX;
      const onMove = (move: MouseEvent) => {
        latest = move.clientX;

        if (frame.current) return;

        frame.current = window.requestAnimationFrame(() => {
          frame.current = undefined;
          setWidths((current) => ({ ...current, [id]: Math.max(minWidth, startWidth + latest - startX) }));
        });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
  });

  const rules = Object.entries(widths)
    .map(([id, width]) => `.${cellClass(id)} { flex: 0 0 ${width}px !important; }`)
    .join("\n");

  return { headProps, cellClass, widthStyle: rules ? <style>{rules}</style> : null };
}
