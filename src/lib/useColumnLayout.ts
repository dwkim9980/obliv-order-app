"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ColumnDef = {
  id: string;
  label: string;
  width: number;
  align?: "left" | "right";
};

type StoredLayout = { order: string[]; widths: Record<string, number> };

const MIN_WIDTH = 40;

export function useColumnLayout(storageKey: string, defs: ColumnDef[]) {
  const defsRef = useRef(defs);
  defsRef.current = defs;

  const [order, setOrder] = useState<string[]>(defs.map((d) => d.id));
  const [widths, setWidths] = useState<Record<string, number>>(
    Object.fromEntries(defs.map((d) => [d.id, d.width]))
  );
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(`col-layout:${storageKey}`);
    if (!raw) return;
    try {
      const stored: StoredLayout = JSON.parse(raw);
      const validIds = new Set(defsRef.current.map((d) => d.id));
      const filteredOrder = stored.order.filter((id) => validIds.has(id));
      for (const d of defsRef.current) {
        if (!filteredOrder.includes(d.id)) filteredOrder.push(d.id);
      }
      setOrder(filteredOrder);
      setWidths((prev) => ({ ...prev, ...stored.widths }));
    } catch {
      // ignore malformed storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = useCallback(
    (nextOrder: string[], nextWidths: Record<string, number>) => {
      localStorage.setItem(
        `col-layout:${storageKey}`,
        JSON.stringify({ order: nextOrder, widths: nextWidths })
      );
    },
    [storageKey]
  );

  function startResize(id: string, e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widths[id] ?? 100;

    function onMove(ev: MouseEvent) {
      const next = Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX));
      setWidths((prev) => {
        const updated = { ...prev, [id]: next };
        return updated;
      });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setWidths((prev) => {
        persist(order, prev);
        return prev;
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDragOverCol(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDropCol(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== sourceId);
      const targetIdx = next.indexOf(targetId);
      next.splice(targetIdx, 0, sourceId);
      persist(next, widths);
      return next;
    });
  }

  function resetLayout() {
    const defaultOrder = defsRef.current.map((d) => d.id);
    const defaultWidths = Object.fromEntries(defsRef.current.map((d) => [d.id, d.width]));
    setOrder(defaultOrder);
    setWidths(defaultWidths);
    localStorage.removeItem(`col-layout:${storageKey}`);
  }

  const byId = Object.fromEntries(defsRef.current.map((d) => [d.id, d]));
  const columns = order
    .map((id) => byId[id])
    .filter(Boolean)
    .map((d) => ({ ...d, width: widths[d.id] ?? d.width }));

  return { columns, startResize, onDragStart, onDragOverCol, onDropCol, resetLayout };
}
