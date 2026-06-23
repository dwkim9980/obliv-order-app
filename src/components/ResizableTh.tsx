"use client";

import { ColumnDef } from "@/lib/useColumnLayout";

export default function ResizableTh({
  column,
  onResizeStart,
  onDragStart,
  onDragOver,
  onDrop,
  sortDir,
  onSortClick,
}: {
  column: ColumnDef;
  onResizeStart: (id: string, e: React.MouseEvent) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
  sortDir?: "asc" | "desc" | null;
  onSortClick?: (id: string) => void;
}) {
  return (
    <th
      draggable
      onDragStart={() => onDragStart(column.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(column.id)}
      onClick={() => onSortClick?.(column.id)}
      className={`relative select-none py-2 pr-3 ${onSortClick ? "cursor-pointer" : "cursor-move"} ${
        column.align === "right" ? "text-right" : "text-left"
      }`}
    >
      {column.label}
      {sortDir && <span className="ml-1 text-gray-400">{sortDir === "asc" ? "▲" : "▼"}</span>}
      <span
        onMouseDown={(e) => onResizeStart(column.id, e)}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-200"
      />
    </th>
  );
}
