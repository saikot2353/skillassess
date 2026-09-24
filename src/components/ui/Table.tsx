import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
  emptyState,
  className = '',
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-hidden border border-borderlight rounded-lg bg-white shadow-soft ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-borderlight bg-canvas-subtle/80">
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`py-3 px-4 text-xs font-semibold text-stone-700 uppercase tracking-wider text-start whitespace-nowrap ${
                    col.headerClassName || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borderlight text-xs sm:text-sm text-stone-700">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-stone-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-maroon-700 border-t-transparent rounded-full animate-spin" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-stone-500">
                  {emptyState || 'No records found'}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-stone-50/80' : 'hover:bg-stone-50/60'
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 align-middle whitespace-nowrap ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, idx) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
