'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface EnterpriseTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  bulkActions?: {
    label: string;
    onClick: (rows: T[]) => void;
    className?: string;
  }[];
  placeholder?: string;
  searchPlaceholder?: string;
}

export default function EnterpriseTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  bulkActions,
  placeholder = 'No records found.',
  searchPlaceholder = 'Search records...',
}: EnterpriseTableProps<T>) {
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term changes
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column Visibility
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach((col) => {
      initial[col.key] = true;
    });
    return initial;
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  // Reset page when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Toggle Sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortKey(null);
        setSortOrder(null);
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Filter & Sort Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Global Search
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter((row: any) => {
        return Object.keys(row).some((key) => {
          const val = row[key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // Sorting
    if (sortKey && sortOrder) {
      result.sort((a: any, b: any) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        // Format date strings or numbers if necessary
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, debouncedSearchTerm, sortKey, sortOrder]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set<string | number>();
      paginatedData.forEach((row) => newSelected.add(rowKey(row)));
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row) => selectedIds.has(rowKey(row)));
  }, [paginatedData, selectedIds, rowKey]);

  // Export currently filtered/sorted data to CSV
  const handleExportCSV = () => {
    const activeColumns = columns.filter((col) => visibleKeys[col.key]);
    const headers = activeColumns.map((col) => `"${col.header.replace(/"/g, '""')}"`).join(',');

    const rows = processedData.map((row: any) => {
      return activeColumns
        .map((col) => {
          let val = row[col.key];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wccms_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Controls Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-855 dark:text-slate-100 transition-all placeholder:text-slate-450 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Buttons & Visibility controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Column Visibility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold hover:bg-slate-55 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Eye size={14} />
              Columns
            </button>
            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-2xl p-4 z-30 animate-fade-in-up">
                <p className="text-[10px] font-black uppercase text-slate-450 tracking-wider mb-2">
                  Visible Columns
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={!!visibleKeys[col.key]}
                        onChange={(e) => {
                          setVisibleKeys({
                            ...visibleKeys,
                            [col.key]: e.target.checked,
                          });
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/10"
                      />
                      {col.header}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Bulk Actions Bar ── */}
      {bulkActions && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl animate-fade-in">
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
            {selectedIds.size} row(s) selected
          </span>
          <div className="h-4 w-[1px] bg-blue-200 dark:bg-blue-900/50" />
          <div className="flex gap-2">
            {bulkActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const selectedRows = data.filter((row) => selectedIds.has(rowKey(row)));
                  action.onClick(selectedRows);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  action.className ||
                  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-black tracking-wider text-slate-450 border-b border-slate-150 dark:border-slate-850">
              <tr>
                {/* Select All Checkbox */}
                {bulkActions && (
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0"
                    />
                  </th>
                )}
                {/* Headers */}
                {columns
                  .filter((col) => visibleKeys[col.key])
                  .map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      className={`p-4 font-black ${
                        col.sortable !== false
                          ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable !== false && (
                          <span className="text-slate-400 dark:text-slate-600">
                            {sortKey === col.key ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )
                            ) : (
                              <ChevronsUpDown size={10} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      columns.filter((c) => visibleKeys[c.key]).length + (bulkActions ? 1 : 0)
                    }
                    className="p-8 text-center text-slate-400 font-semibold"
                  >
                    {placeholder}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const id = rowKey(row);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={idx}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`transition-colors ${
                        onRowClick
                          ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-850/40'
                          : ''
                      } ${isSelected ? 'bg-blue-50/20 dark:bg-blue-950/5' : ''}`}
                    >
                      {/* Row Checkbox */}
                      {bulkActions && (
                        <td
                          className="p-4 w-12 text-center"
                          onClick={(e) => e.stopPropagation()} // Stop triggering row clicks
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(id)}
                            className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0"
                          />
                        </td>
                      )}
                      {/* Cells */}
                      {columns
                        .filter((col) => visibleKeys[col.key])
                        .map((col) => (
                          <td
                            key={col.key}
                            className="p-4 align-middle text-slate-700 dark:text-slate-350"
                          >
                            {col.render ? col.render(row) : ((row as any)[col.key] ?? '-')}
                          </td>
                        ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 text-xs font-bold text-slate-500 dark:text-slate-400">
          {/* Page size select */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl outline-none"
            >
              {[5, 10, 25, 50].map((sz) => (
                <option key={sz} value={sz}>
                  {sz} rows
                </option>
              ))}
            </select>
          </div>

          {/* Record range */}
          <div>
            Showing{' '}
            <span className="text-slate-800 dark:text-slate-200">
              {processedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * pageSize, processedData.length)}
            </span>{' '}
            of <span className="text-slate-800 dark:text-slate-200">{processedData.length}</span>{' '}
            records
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-250 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-250 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
