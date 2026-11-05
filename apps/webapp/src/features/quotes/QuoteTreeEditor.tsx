import { formatMoney } from '@bautakt/finance';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  makeStyles,
  mergeClasses,
  Select,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  DeleteRegular,
  ReOrderDotsVerticalRegular,
  TextAlignLeftRegular,
  TextHeader1Regular,
  TextHeader2Regular,
} from '@fluentui/react-icons';
import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import { DiscardChangesDialog } from '@/components/common/DiscardChangesDialog';
import { HelpButton } from '@/components/common/HelpButton';

import {
  type AddKind,
  canAddSubtitle,
  CONTINGENCY_MODES,
  type ContingencyMode,
  flatten,
  insertAfter,
  moveNode,
  newNode,
  nodeTotalMinor,
  type NodeType,
  placementFor,
  POSITION_TYPES,
  type PositionType,
  projectDrop,
  type QuoteNode,
  removeNode,
  subtreeRange,
  titleTotalsMinor,
  withPositionType,
} from './quoteTree';

/** Einrückung je Ebene in Pixeln; auch der Maßstab für das seitliche Ziehen. */
const INDENT = 24;

const useStyles = makeStyles({
  // Dichte Zeilen wie in einem Leistungsverzeichnis. Native Eingabefelder statt
  // Fluent `Input`: 500 Positionen mal vier Felder bleiben so bedienbar
  // (gemessen, siehe wiki/pages/angebote.md).
  cell: {
    width: '100%',
    minWidth: 0,
    height: '32px',
    paddingInline: tokens.spacingHorizontalS,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    ':focus': {
      outline: `${tokens.strokeWidthThick} solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '-1px',
    },
    '::placeholder': { color: tokens.colorNeutralForeground4 },
  },
  numeric: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  titleCell: { fontWeight: tokens.fontWeightSemibold },
  row: {
    display: 'grid',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXXS,
    paddingInlineEnd: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusMedium,
    // Zeilen außerhalb des Fensters spart der Browser beim Zeichnen.
    contentVisibility: 'auto',
    containIntrinsicSize: 'auto 40px',
  },
  rowSelected: { backgroundColor: tokens.colorNeutralBackground1Selected },
  rowDragging: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    boxShadow: tokens.shadow8,
    position: 'relative',
    zIndex: 1,
  },
  handle: { cursor: 'grab', touchAction: 'none' },
  // Native Knöpfe statt Fluent `Button`: je Zeile drei Stück, bei 500 Zeilen
  // zählt jede Komponente (gemessen, siehe wiki/pages/angebote.md).
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    padding: 0,
    border: 'none',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    fontSize: '16px',
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ':focus-visible': {
      outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`,
    },
    ':disabled': { color: tokens.colorNeutralForegroundDisabled, cursor: 'default' },
  },
  danger: { ':hover': { color: tokens.colorStatusDangerForeground1 } },

  oz: {
    fontVariantNumeric: 'tabular-nums',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  amount: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  muted: { color: tokens.colorNeutralForeground3 },
  details: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    paddingBlock: tokens.spacingVerticalS,
    paddingInlineEnd: tokens.spacingHorizontalS,
  },
});

// Raster: Griff, Aufklappen, OZ, Text, Menge, Einheit, EP, GP, Menü.
const GRID = '28px 28px 8.5rem minmax(12rem, 1fr) 6rem 5rem 7rem 8rem 32px';

export type QuoteTreeEditorProps = {
  nodes: QuoteNode[];
  onChange: (update: (nodes: QuoteNode[]) => QuoteNode[]) => void;
  defaultTaxRate: string;
  /** Bei Steuerart außerhalb von `standard` gibt es keinen Satz je Position. */
  chargesVat: boolean;
  disabled?: boolean;
};

type AlternativeOption = { id: string; label: string };

/** Was eine Zeile zum Zeichnen braucht. */
type RowData = {
  node: QuoteNode;
  depth: number;
  oz: string;
  totalMinor: number;
  selected: boolean;
  expanded: boolean;
  dragging: boolean;
  alternatives: AlternativeOption[] | undefined;
};

function sameRow(a: RowData, b: RowData): boolean {
  return (
    a.node === b.node &&
    a.depth === b.depth &&
    a.oz === b.oz &&
    a.totalMinor === b.totalMinor &&
    a.selected === b.selected &&
    a.expanded === b.expanded &&
    a.dragging === b.dragging &&
    a.alternatives === b.alternatives
  );
}

/**
 * Zeilendaten außerhalb von React-Props. Jede Zeile abonniert nur ihre eigenen
 * Daten (`useSyncExternalStore`). So rendert beim Tippen genau eine Zeile neu,
 * und Drag-Kontext samt Liste rendern nur, wenn sich die Gliederung ändert.
 * Gemessen vorher: jeder Tastendruck renderte alle 510 Zeilen zweimal.
 */
function createRowStore() {
  let rows = new Map<string, RowData>();
  const listeners = new Set<() => void>();
  return {
    get: (id: string) => rows.get(id),
    /** Übernimmt neue Daten; unveränderte Zeilen behalten ihr Objekt. */
    replace(next: Map<string, RowData>) {
      const merged = new Map<string, RowData>();
      for (const [id, row] of next) {
        const old = rows.get(id);
        merged.set(id, old && sameRow(old, row) ? old : row);
      }
      rows = merged;
    },
    notify() {
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
type RowStore = ReturnType<typeof createRowStore>;

// Feste Objekte: `useSensor` merkt sich die Optionen nach Identität.
const POINTER_OPTIONS = { activationConstraint: { distance: 4 } };
const KEYBOARD_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

export function QuoteTreeEditor({
  nodes,
  onChange,
  defaultTaxRate,
  chargesVat,
  disabled,
}: QuoteTreeEditorProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [store] = useState(createRowStore);
  const offsetRef = useRef(0);

  const flat = useMemo(() => flatten(nodes), [nodes]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const titleSums = useMemo(() => titleTotalsMinor(nodes), [nodes]);
  const alternativesFor = useMemo(
    () =>
      flat
        .filter((n) => n.nodeType === 'position' && n.positionType !== 'alternative')
        .map((n) => ({ id: n.id, label: [n.oz, n.shortText].filter(Boolean).join(' ') })),
    [flat],
  );

  // Beim Ziehen eines Titels verschwinden seine Kinder aus der Liste und
  // wandern als Block mit (Muster aus dem Baum-Beispiel von dnd-kit).
  const hidden = useMemo(() => {
    if (!activeId) return null;
    const [start, end] = subtreeRange(nodes, activeId);
    return new Set(nodes.slice(start + 1, end).map((n) => n.id));
  }, [activeId, nodes]);
  // Die ID-Liste bleibt beim Tippen dieselbe Liste.
  const idsKey = flat
    .filter((n) => !hidden?.has(n.id))
    .map((n) => n.id)
    .join(' ');
  const ids = useMemo(() => (idsKey ? idsKey.split(' ') : []), [idsKey]);

  // Abgeleitete Zeilendaten; der Store behält unveränderte Zeilen bei.
  const next = new Map<string, RowData>();
  for (const n of flat) {
    const isExpanded = expanded.has(n.id);
    next.set(n.id, {
      node: byId.get(n.id)!,
      depth: n.depth,
      oz: n.oz,
      totalMinor:
        n.nodeType === 'title'
          ? (titleSums.get(n.id) ?? 0)
          : n.nodeType === 'position'
            ? nodeTotalMinor(n)
            : 0,
      selected: selectedId === n.id,
      expanded: isExpanded,
      dragging: activeId === n.id,
      alternatives: isExpanded ? alternativesFor : undefined,
    });
  }
  store.replace(next);
  useLayoutEffect(() => store.notify());

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
  );

  const update = useCallback(
    (id: string, patch: Partial<QuoteNode>) =>
      onChange((current) => current.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    [onChange],
  );
  const setType = useCallback(
    (id: string, type: PositionType) =>
      onChange((current) => current.map((n) => (n.id === id ? withPositionType(n, type) : n))),
    [onChange],
  );
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const nodesRef = useRef(nodes);
  useLayoutEffect(() => {
    nodesRef.current = nodes;
  });
  const removeNow = useCallback(
    (id: string) => {
      onChange((current) => removeNode(current, id));
      setSelectedId((current) => (current === id ? null : current));
    },
    [onChange],
  );
  // Ein Titel mit Inhalt nimmt alles darunter mit: erst nachfragen.
  const remove = useCallback(
    (id: string) => {
      const [start, end] = subtreeRange(nodesRef.current, id);
      if (end - start > 1) setPendingRemove(id);
      else removeNow(id);
    },
    [removeNow],
  );
  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const nextSet = new Set(current);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }, []);

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    offsetRef.current = 0;
  }, []);
  const onDragMove = useCallback(({ delta }: DragMoveEvent) => {
    offsetRef.current = Math.round(delta.x / INDENT);
  }, []);
  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const offset = offsetRef.current;
      setActiveId(null);
      if (!over) return;
      onChange((current) => {
        const projection = projectDrop(current, String(active.id), String(over.id), offset);
        return projection
          ? moveNode(current, String(active.id), String(over.id), projection)
          : current;
      });
    },
    [onChange],
  );
  const onDragCancel = useCallback(() => setActiveId(null), []);

  function add(kind: AddKind) {
    const { parentId, afterId } = placementFor(nodes, kind, selectedId);
    const nodeType: NodeType = kind === 'subtitle' ? 'title' : kind;
    const node = newNode(nodeType, parentId, chargesVat ? defaultTaxRate : '0');
    onChange((current) => insertAfter(current, node, afterId));
    setSelectedId(node.id);
    focusRef.current = node.id;
  }

  // Neue Zeile gleich zum Tippen öffnen. Im selben Durchlauf wie das Rendern,
  // nicht ein Frame später: Sonst landen die ersten Buchstaben eines schnellen
  // Tippers noch auf dem Knopf (im Produktions-Build beobachtet).
  const focusRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!focusRef.current) return;
    document.getElementById(`quote-node-${focusRef.current}`)?.focus();
    focusRef.current = null;
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap gap-2"
        role="toolbar"
        aria-label={t('domain:quotes.editor.tree.add')}
      >
        <Button icon={<TextHeader1Regular />} disabled={disabled} onClick={() => add('title')}>
          {t('domain:quotes.editor.tree.addTitle')}
        </Button>
        <Button
          icon={<TextHeader2Regular />}
          disabled={disabled || !canAddSubtitle(nodes, selectedId)}
          onClick={() => add('subtitle')}
        >
          {t('domain:quotes.editor.tree.addSubtitle')}
        </Button>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          disabled={disabled}
          onClick={() => add('position')}
        >
          {t('domain:quotes.editor.tree.addPosition')}
        </Button>
        <Button icon={<TextAlignLeftRegular />} disabled={disabled} onClick={() => add('text')}>
          {t('domain:quotes.editor.tree.addText')}
        </Button>
      </div>

      {flat.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('domain:quotes.editor.tree.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="min-w-[56rem]"
            role="list"
            aria-label={t('domain:quotes.editor.tree.label')}
          >
            <div
              className="text-muted-foreground grid gap-x-2 px-0 pb-1 text-xs"
              style={{ gridTemplateColumns: GRID }}
              aria-hidden
            >
              <span />
              <span />
              <span>{t('domain:quotes.editor.tree.oz')}</span>
              <span>{t('domain:quotes.editor.tree.shortText')}</span>
              <span className="text-right">{t('domain:quotes.editor.tree.quantity')}</span>
              <span>{t('domain:quotes.editor.tree.unit')}</span>
              <span className="text-right">{t('domain:quotes.editor.tree.unitPrice')}</span>
              <span className="text-right">{t('domain:quotes.editor.tree.total')}</span>
              <span />
            </div>
            <SortableRows
              ids={ids}
              store={store}
              sensors={sensors}
              disabled={disabled}
              chargesVat={chargesVat}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
              onSelect={setSelectedId}
              onToggle={toggle}
              onUpdate={update}
              onSetType={setType}
              onRemove={remove}
            />
          </div>
        </div>
      )}
      <DiscardChangesDialog
        open={pendingRemove !== null}
        onDismiss={() => setPendingRemove(null)}
        title={t('domain:quotes.editor.tree.removeTitleConfirm.title')}
        description={t('domain:quotes.editor.tree.removeTitleConfirm.description', {
          count: pendingRemove
            ? subtreeRange(nodes, pendingRemove)[1] - subtreeRange(nodes, pendingRemove)[0] - 1
            : 0,
        })}
        keepLabel={t('common:action.cancel')}
        discardLabel={t('domain:quotes.editor.tree.removeTitleConfirm.confirm')}
        onKeep={() => setPendingRemove(null)}
        onDiscard={() => {
          if (pendingRemove) removeNow(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </div>
  );
}

type RowCallbacks = {
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<QuoteNode>) => void;
  onSetType: (id: string, type: PositionType) => void;
  onRemove: (id: string) => void;
};

/** Drag-Kontext und Zeilen; rendert nur bei neuer Gliederung oder neuen Rechten. */
const SortableRows = memo(function SortableRows({
  ids,
  store,
  sensors,
  disabled,
  chargesVat,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  ...callbacks
}: RowCallbacks & {
  ids: string[];
  store: RowStore;
  sensors: ReturnType<typeof useSensors>;
  disabled?: boolean;
  chargesVat: boolean;
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (event: DragMoveEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
}) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((id) => (
          <NodeRow
            key={id}
            id={id}
            store={store}
            disabled={disabled}
            chargesVat={chargesVat}
            {...callbacks}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
});

type NodeRowProps = RowCallbacks & {
  id: string;
  store: RowStore;
  disabled?: boolean;
  chargesVat: boolean;
};

/**
 * Hülle einer Zeile: nur Drag & Drop. Beim Ziehen rendert dnd-kit jede
 * sortierbare Zeile bei jeder Mausbewegung neu; deshalb hält die Hülle nur
 * Verschiebung und Griff, der Inhalt (`RowContent`) bleibt gemerkt.
 */
const NodeRow = memo(function NodeRow(props: NodeRowProps) {
  const { id, disabled } = props;
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const label = useSyncExternalStore(props.store.subscribe, () => props.store.get(id)!.oz);
  const selected = useSyncExternalStore(props.store.subscribe, () => props.store.get(id)!.selected);

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{
        gridTemplateColumns: GRID,
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={mergeClasses(
        styles.row,
        selected && styles.rowSelected,
        isDragging && styles.rowDragging,
      )}
      // Wer in eine Zeile tippt, wählt sie: Neue Zeilen kommen dahinter.
      onFocusCapture={() => props.onSelect(id)}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={mergeClasses(styles.iconButton, styles.handle)}
        aria-label={t('domain:quotes.editor.tree.drag', {
          label: label || t('domain:quotes.editor.tree.row'),
        })}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <ReOrderDotsVerticalRegular />
      </button>
      <RowContent {...props} />
    </div>
  );
});

/** Inhalt einer Zeile; liest seine Daten selbst aus dem Store. */
const RowContent = memo(function RowContent({
  id,
  store,
  disabled,
  chargesVat,
  onToggle,
  onUpdate,
  onSetType,
  onRemove,
}: NodeRowProps) {
  const row = useSyncExternalStore(store.subscribe, () => store.get(id)!);
  const { node, depth, oz, totalMinor, expanded, alternatives } = row;
  const { t } = useTranslation();
  const styles = useStyles();
  const isPosition = node.nodeType === 'position';
  const isTitle = node.nodeType === 'title';
  const excluded =
    isPosition && (node.positionType === 'alternative' || node.positionType === 'contingency');
  const priceOnly =
    node.positionType === 'contingency' && node.contingencyMode === 'unit_price_only';
  const kindLabel = isPosition
    ? t(`domain:quotes.editor.positionType.${node.positionType ?? 'normal'}`)
    : t(`domain:quotes.editor.nodeType.${node.nodeType}`);
  const label = oz || kindLabel;

  return (
    <>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t('domain:quotes.editor.tree.detailsOf', { label })}
        aria-expanded={expanded}
        onClick={() => onToggle(node.id)}
      >
        {expanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
      </button>
      <span className={styles.oz} style={{ paddingInlineStart: depth * INDENT }}>
        {oz || <span className={styles.muted}>{kindLabel}</span>}
      </span>
      <input
        id={`quote-node-${node.id}`}
        className={mergeClasses(styles.cell, isTitle && styles.titleCell)}
        style={{ gridColumn: isPosition ? undefined : 'span 4' }}
        value={node.shortText}
        maxLength={500}
        disabled={disabled}
        placeholder={t(`domain:quotes.editor.tree.placeholder.${node.nodeType}`)}
        aria-label={t('domain:quotes.editor.tree.shortTextOf', { label })}
        onChange={(event) => onUpdate(node.id, { shortText: event.target.value })}
      />
      {isPosition ? (
        <>
          <input
            className={mergeClasses(styles.cell, styles.numeric)}
            inputMode="decimal"
            value={node.quantity}
            disabled={disabled || node.positionType === 'lump_sum'}
            aria-label={t('domain:quotes.editor.tree.quantityOf', { label })}
            onChange={(event) => onUpdate(node.id, { quantity: event.target.value })}
          />
          <input
            className={styles.cell}
            value={node.unit}
            maxLength={20}
            disabled={disabled || node.positionType === 'lump_sum'}
            aria-label={t('domain:quotes.editor.tree.unitOf', { label })}
            onChange={(event) => onUpdate(node.id, { unit: event.target.value })}
          />
          <input
            className={mergeClasses(styles.cell, styles.numeric)}
            inputMode="decimal"
            value={node.unitPrice}
            disabled={disabled}
            aria-label={t('domain:quotes.editor.tree.unitPriceOf', { label })}
            onChange={(event) => onUpdate(node.id, { unitPrice: event.target.value })}
          />
        </>
      ) : null}
      <span className={mergeClasses(styles.amount, (excluded || !isPosition) && styles.muted)}>
        {node.nodeType === 'text'
          ? ''
          : priceOnly
            ? t('domain:quotes.editor.tree.unitPriceOnly')
            : formatMoney(totalMinor)}
      </span>
      <button
        type="button"
        className={mergeClasses(styles.iconButton, styles.danger)}
        aria-label={
          isTitle
            ? t('domain:quotes.editor.tree.removeTitleOf', { label })
            : t('domain:quotes.editor.tree.removeOf', { label })
        }
        disabled={disabled}
        onClick={() => onRemove(node.id)}
      >
        <DeleteRegular />
      </button>
      {expanded ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <NodeDetails
            node={node}
            depth={depth}
            disabled={disabled}
            chargesVat={chargesVat}
            alternatives={alternatives ?? []}
            onUpdate={onUpdate}
            onSetType={onSetType}
          />
        </div>
      ) : null}
    </>
  );
});

function NodeDetails({
  node,
  depth,
  disabled,
  chargesVat,
  alternatives,
  onUpdate,
  onSetType,
}: {
  node: QuoteNode;
  depth: number;
  disabled?: boolean;
  chargesVat: boolean;
  alternatives: { id: string; label: string }[];
  onUpdate: (id: string, patch: Partial<QuoteNode>) => void;
  onSetType: (id: string, type: PositionType) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const longTextId = useId();
  const typeId = useId();
  const altId = useId();
  const modeId = useId();
  const rateId = useId();
  const laborId = useId();
  const isPosition = node.nodeType === 'position';

  return (
    <div
      className={styles.details}
      // Unter dem Text der Zeile: Griff, Aufklappen und OZ bleiben links frei.
      style={{ paddingInlineStart: `calc(56px + 8.5rem + ${depth * INDENT}px + 1rem)` }}
    >
      {node.nodeType !== 'title' ? (
        <div className="grid gap-1">
          <label htmlFor={longTextId} className="text-sm">
            {t('domain:quotes.editor.tree.longText')}
          </label>
          <Textarea
            id={longTextId}
            resize="vertical"
            value={node.longText}
            disabled={disabled}
            onChange={(_, { value }) => onUpdate(node.id, { longText: value })}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t('domain:quotes.editor.tree.titleHint')}</p>
      )}
      {isPosition ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1">
            <label htmlFor={typeId} className="text-sm">
              {t('domain:quotes.editor.tree.positionType')}
            </label>
            <Select
              id={typeId}
              value={node.positionType ?? 'normal'}
              disabled={disabled}
              onChange={(_, { value }) => onSetType(node.id, value as PositionType)}
            >
              {POSITION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`domain:quotes.editor.positionType.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          {node.positionType === 'alternative' ? (
            <div className="grid gap-1">
              <label htmlFor={altId} className="text-sm">
                {t('domain:quotes.editor.tree.alternativeTo')}
              </label>
              <Select
                id={altId}
                value={node.alternativeToId ?? ''}
                disabled={disabled}
                onChange={(_, { value }) => onUpdate(node.id, { alternativeToId: value || null })}
              >
                <option value="">{t('domain:quotes.editor.tree.alternativeNone')}</option>
                {alternatives
                  .filter((option) => option.id !== node.id)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
              </Select>
            </div>
          ) : null}
          {node.positionType === 'contingency' ? (
            <div className="grid gap-1">
              <label htmlFor={modeId} className="text-sm">
                {t('domain:quotes.editor.tree.contingencyMode')}
              </label>
              <Select
                id={modeId}
                value={node.contingencyMode ?? 'with_total'}
                disabled={disabled}
                onChange={(_, { value }) =>
                  onUpdate(node.id, { contingencyMode: value as ContingencyMode })
                }
              >
                {CONTINGENCY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {t(`domain:quotes.editor.contingencyMode.${mode}`)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {chargesVat ? (
            <div className="grid gap-1">
              <label htmlFor={rateId} className="text-sm">
                {t('domain:quotes.editor.tree.taxRate')}
              </label>
              <input
                id={rateId}
                className={mergeClasses(styles.cell, styles.numeric)}
                inputMode="decimal"
                value={node.taxRatePercent}
                disabled={disabled}
                onChange={(event) => onUpdate(node.id, { taxRatePercent: event.target.value })}
              />
            </div>
          ) : null}
          <div className="grid gap-1">
            <div className="flex items-center gap-1">
              <label htmlFor={laborId} className="text-sm">
                {t('domain:quotes.editor.tree.laborShare')}
              </label>
              <HelpButton label={t('domain:quotes.editor.tree.laborShare')}>
                <p>{t('domain:quotes.editor.tree.laborShareHint')}</p>
              </HelpButton>
            </div>
            <input
              id={laborId}
              className={mergeClasses(styles.cell, styles.numeric)}
              inputMode="decimal"
              value={node.laborShare}
              disabled={disabled}
              onChange={(event) => onUpdate(node.id, { laborShare: event.target.value })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
