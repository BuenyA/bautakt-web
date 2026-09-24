import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createCoreRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * Der Funktionsumfang unserer Tabellen, einmal festgelegt.
 *
 * TanStack Table v9 baut die Tabelle aus einzelnen Bausteinen zusammen —
 * eingebunden wird nur, was wir wirklich benutzen. Das haelt das Bundle klein
 * und macht sichtbar, was eine Liste kann: sortieren, filtern, suchen,
 * blaettern, Spalten ausblenden.
 *
 * ⚠️ Bewusst ausserhalb jeder Komponente: Wird das Objekt bei jedem Render neu
 * erzeugt, baut die Tabelle sich jedes Mal neu auf.
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  coreRowModel: createCoreRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type DataTableFeatures = typeof dataTableFeatures;
