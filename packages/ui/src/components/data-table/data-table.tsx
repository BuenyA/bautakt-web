import {
  Button,
  Menu,
  MenuItemCheckbox,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SearchBox,
  Skeleton,
  SkeletonItem,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components';
import { ArrowDownloadRegular, TableSettingsRegular } from '@fluentui/react-icons';
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
import * as React from 'react';

import { cn } from '../../lib/cn';
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
  /** Unsichtbare Überschrift der Aktionsspalte (`header: ''`), für Screenreader. */
  actions: string;
};

const DEFAULT_LABELS: DataTableLabels = {
  search: 'Suchen …',
  columns: 'Spalten',
  export: 'CSV',
  of: 'von',
  rows: 'Einträge',
  previous: 'Zurück',
  next: 'Weiter',
  actions: 'Aktionen',
};

/**
 * Eine Spalte mit leerer Überschrift ist eine Aktionsspalte (Knöpfe je Zeile).
 * Sie ist nicht sortierbar, nicht ausblendbar und trägt für Screenreader die
 * Überschrift „Aktionen“ — ein leerer Spaltenkopf liest sich sonst als Lücke.
 */
function isActionColumn(header: unknown): boolean {
  return header === '';
}

function fluentSort(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | undefined {
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return undefined;
}

function ariaSort(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
}

/** Enter und Leertaste auf der Zeile selbst — nicht auf Links oder Knöpfen in einer Zelle. */
function activateOnKey(event: React.KeyboardEvent<HTMLTableRowElement>, activate: () => void) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

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
  /** Zusaetzliche Filter links neben der Suche (Status-Chips, Zeitraum …). */
  toolbar?: React.ReactNode;
  /**
   * Gruppenueberschrift, wenn sich der Wert gegenueber der vorherigen Zeile
   * aendert. Nur ohne aktive Sortierung — sonst zerfallen die Gruppen.
   */
  sectionOf?: (row: TData) => string | null;
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
  sectionOf,
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
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide() && !isActionColumn(column.columnDef.header));

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Filter (TabList) stehen in einer eigenen Zeile über Suche und Aktionen,
          nicht gequetscht daneben. */}
      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}

      <div className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <SearchBox
            value={globalFilter}
            onChange={(_, data) => setGlobalFilter(data.value)}
            placeholder={searchPlaceholder ?? labels.search}
            className="w-full sm:w-80"
            aria-label={labels.search}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {exportFileName ? (
            <Button
              icon={<ArrowDownloadRegular />}
              onClick={() => exportRows(table, exportFileName)}
              disabled={!hasRows}
            >
              {labels.export}
            </Button>
          ) : null}

          <Menu
            checkedValues={{
              columns: hideableColumns.filter((c) => c.getIsVisible()).map((c) => c.id),
            }}
            onCheckedValueChange={(_, { checkedItems }) => {
              for (const column of hideableColumns) {
                column.toggleVisibility(checkedItems.includes(column.id));
              }
            }}
          >
            <MenuTrigger disableButtonEnhancement>
              <Button icon={<TableSettingsRegular />} aria-label={labels.columns}>
                <span className="hidden sm:inline">{labels.columns}</span>
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {hideableColumns.map((column) => (
                  <MenuItemCheckbox key={column.id} name="columns" value={column.id}>
                    {columnLabel(column.columnDef.header, column.id)}
                  </MenuItemCheckbox>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>

      <div className="border-border bg-card overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const action = isActionColumn(header.column.columnDef.header);
                  const canSort = header.column.getCanSort() && !action && !header.isPlaceholder;
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHeaderCell
                      key={header.id}
                      sortable={canSort}
                      sortDirection={canSort ? fluentSort(sorted) : undefined}
                      aria-sort={canSort ? ariaSort(sorted) : undefined}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : action ? (
                        <span className="sr-only">{labels.actions}</span>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHeaderCell>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="w-full max-w-40">
                        <SkeletonItem size={16} />
                      </Skeleton>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : hasRows ? (
              table.getRowModel().rows.map((row, index, pageRows) => {
                const resolveSection = sorting.length === 0 ? sectionOf : undefined;
                const section = resolveSection?.(row.original) ?? null;
                const previousRow = pageRows[index - 1];
                const previous =
                  previousRow && resolveSection
                    ? (resolveSection(previousRow.original) ?? null)
                    : null;
                const showSection = section !== null && section !== previous;
                return (
                  <React.Fragment key={row.id}>
                    {showSection ? (
                      <TableRow appearance="none">
                        <TableCell colSpan={row.getVisibleCells().length}>
                          <span className="text-muted-foreground text-sm font-semibold">
                            {section}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (event) => activateOnKey(event, () => onRowClick(row.original))
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      className={
                        onRowClick
                          ? 'focus-visible:outline-ring cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2'
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow appearance="none">
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-2">
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
              size="small"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {labels.previous}
            </Button>
            <Button
              size="small"
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
