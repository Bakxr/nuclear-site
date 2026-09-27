import { useMemo, useState } from "react";

// Sortable dense table. Columns: { id, label, align, render(row), sort(row),
// defaultDesc }. Click a header to sort; click again to flip direction.
export default function DataTable({ columns, rows, rowKey = (row) => row.id, onRowClick, isSelected, initialSort, initialDesc = true }) {
  const [sortId, setSortId] = useState(initialSort || null);
  const [desc, setDesc] = useState(initialDesc);

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.id === sortId);
    if (!column?.sort) return rows;
    const dir = desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = column.sort(a);
      const bv = column.sort(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [columns, rows, sortId, desc]);

  const toggleSort = (column) => {
    if (!column.sort) return;
    if (sortId === column.id) {
      setDesc((value) => !value);
    } else {
      setSortId(column.id);
      setDesc(column.defaultDesc ?? true);
    }
  };

  return (
    <table className="npt-table">
      <thead>
        <tr>
          {columns.map((column) => {
            const active = sortId === column.id;
            return (
              <th
                key={column.id}
                className={column.align === "right" ? "r" : undefined}
                aria-sort={active ? (desc ? "descending" : "ascending") : undefined}
                style={{ cursor: column.sort ? "pointer" : "default", color: active ? "var(--np-terminal-text)" : undefined, width: column.width }}
                onClick={() => toggleSort(column)}
              >
                {column.label}{active ? (desc ? " ↓" : " ↑") : ""}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr
            key={rowKey(row)}
            aria-selected={isSelected?.(row) || undefined}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            onKeyDown={onRowClick ? (event) => { if (event.key === "Enter") onRowClick(row); } : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            style={onRowClick ? undefined : { cursor: "default" }}
          >
            {columns.map((column) => (
              <td key={column.id} className={column.align === "right" ? "r" : undefined} style={column.cellStyle}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
