import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  flexRender,
  type RowData,
  type SortingState,
  type Table as TanstackTable,
  useTable,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  SlidersHorizontalIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { downloadCsv } from './csv';
import { type DataTableFeatures, dataTableFeatures } from './features';

/**
 * Eine Tabelle fuer alle Listen der Webapp.
 *
 * Buchhaltung arbeitet mit Hunderten Zeilen — Sortieren, Suchen, Blaettern und
 * Export sind deshalb keine Kuer, sondern die Voraussetzung dafuer, dass die
 * Liste ueberhaupt benutzbar ist. Jede Seite, die eine eigene Tabelle baut,
 * verliert eine dieser Faehigkeiten; darum gibt es genau diese hier.
 *
 * Der CSV-Export nimmt die *gefilterten und sortierten* Zeilen, nicht die
 * Rohdaten: exportiert wird, was man sieht.
 */
export type DataTableLabels = {
  search: string;
  columns: string;
  export: string;
  of: string;
  rows: string;
  previous: string;
  next: string;
};

const DEFAULT_LABELS: DataTableLabels = {
  search: 'Suchen …',
  columns: 'Spalten',
  export: 'CSV',
  of: 'von',
  rows: 'Einträge',
  previous: 'Zurück',
  next: 'Weiter',
};

/**
 * Spaltendefinition fuer diese Tabelle. Die Seiten sollen den
 * Funktionsumfang (`DataTableFeatures`) nicht selbst mitschleppen muessen.
 */
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, unknown>;

export type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  /** Freitextsuche ueber alle sichtbaren Spalten. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Dateiname ohne Endung; fehlt er, gibt es keinen Export-Knopf. */
  exportFileName?: string;
  pageSize?: number;
  /** Leerzustand der Seite — bewusst von aussen, damit jede Liste ihren Text hat. */
  empty?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  /** Zusaetzliche Filter links neben der Suche (Status-Tabs, Zeitraum …). */
  toolbar?: React.ReactNode;
  labels?: Partial<DataTableLabels>;
  className?: string;
};

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  searchable = true,
  searchPlaceholder,
  exportFileName,
  pageSize = 25,
  empty,
  onRowClick,
  toolbar,
  labels: labelOverrides,
  className,
}: DataTableProps<TData>) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        {searchable ? (
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder ?? labels.search}
            className="h-9 w-full sm:max-w-64"
            aria-label={labels.search}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {exportFileName ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportRows(table, exportFileName)}
              disabled={!hasRows}
            >
              <DownloadIcon />
              {labels.export}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontalIcon />
                <span className="hidden sm:inline">{labels.columns}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{labels.columns}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {columnLabel(column.columnDef.header, column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-surface">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUpIcon className="size-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDownIcon className="size-3" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-transparent">
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : hasRows ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 ? (
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
          <span>
            {table.getFilteredRowModel().rows.length} {labels.rows}
          </span>
          <div className="flex items-center gap-2">
            <span>
              {table.state.pagination.pageIndex + 1} {labels.of} {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {labels.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {labels.next}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function columnLabel(header: unknown, fallback: string): string {
  return typeof header === 'string' ? header : fallback;
}

function exportRows<TData extends RowData>(
  table: TanstackTable<DataTableFeatures, TData>,
  fileName: string,
): void {
  const columns = table.getVisibleLeafColumns();
  const head = columns.map((column) => columnLabel(column.columnDef.header, column.id));
  const body = table.getSortedRowModel().rows.map((row) =>
    columns.map((column) => {
      const value = row.getValue(column.id);
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value);
    }),
  );
  downloadCsv(fileName, [head, ...body]);
}
