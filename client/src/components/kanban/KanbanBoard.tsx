import { type ReactNode, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export type KanbanColumn = {
  id: string;
  label: string;
  description?: string;
  colorClassName?: string;
  dotClassName?: string;
};

type KanbanBoardProps<T> = {
  columns: KanbanColumn[];
  items: T[];
  getItemId: (item: T) => string | number;
  getItemColumn: (item: T) => string;
  renderCard: (item: T, isDragging: boolean) => ReactNode;
  onDrop: (item: T, newColumnId: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
  emptyIcon?: ReactNode;
};

const VISIBLE_STEP = 3;

function KanbanCard({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "cursor-grabbing opacity-40" : "cursor-grab"}
    >
      {children}
    </div>
  );
}

function KanbanColumnDroppable<T>({
  column,
  items,
  getItemId,
  renderCard,
  activeId,
  emptyLabel,
  emptyIcon,
}: {
  column: KanbanColumn;
  items: T[];
  getItemId: (item: T) => string | number;
  renderCard: (item: T, isDragging: boolean) => ReactNode;
  activeId: string | null;
  emptyLabel: string;
  emptyIcon?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  // Colunas com muitos itens ficam gigantes verticalmente — mostra só os primeiros e
  // deixa expandir sob demanda em vez de listar tudo de uma vez.
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleItems.length;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition-colors ${column.colorClassName || "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"} ${isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      <div className="mb-3 flex items-start gap-2">
        {column.dotClassName ? <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${column.dotClassName}`} /> : null}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{column.label}</h3>
          {column.description ? <p className="text-xs text-slate-500">{column.description}</p> : null}
        </div>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
          {items.length}
        </span>
      </div>
      <div className="min-h-[60px] space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/60">
            {emptyIcon}
            {emptyLabel}
          </div>
        ) : (
          visibleItems.map(item => (
            <KanbanCard key={String(getItemId(item))} id={String(getItemId(item))}>
              {renderCard(item, String(getItemId(item)) === activeId)}
            </KanbanCard>
          ))
        )}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount(count => count + VISIBLE_STEP)}
            className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
          >
            Ver mais (+{remaining})
          </button>
        )}
      </div>
    </div>
  );
}

// Quadro genérico de arrastar-e-soltar reutilizado pelos pipelines de Leads, Orçamentos e Obras —
// cada tela só define colunas, como identificar o item/coluna atual e o que fazer quando ele é solto.
export function KanbanBoard<T>({
  columns,
  items,
  getItemId,
  getItemColumn,
  renderCard,
  onDrop,
  isLoading = false,
  emptyLabel = "Sem registros",
  emptyIcon,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const itemsById = useMemo(() => {
    const map = new Map<string, T>();
    for (const item of items) map.set(String(getItemId(item)), item);
    return map;
  }, [items, getItemId]);

  const itemsByColumn = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const column of columns) map.set(column.id, []);
    for (const item of items) {
      const columnId = getItemColumn(item);
      if (!map.has(columnId)) map.set(columnId, []);
      map.get(columnId)!.push(item);
    }
    return map;
  }, [items, columns, getItemColumn]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const overColumnId = event.over?.id ? String(event.over.id) : null;
    if (!overColumnId) return;
    const item = itemsById.get(String(event.active.id));
    if (!item) return;
    if (getItemColumn(item) === overColumnId) return;
    onDrop(item, overColumnId);
  };

  const scrollByColumn = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando quadro...
      </div>
    );
  }

  const activeItem = activeId ? itemsById.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <section className="relative">
        {columns.length > 3 && (
          <div className="mb-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={() => scrollByColumn(-1)}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              aria-label="Rolar para a esquerda"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByColumn(1)}
              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
              aria-label="Rolar para a direita"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
        <div ref={scrollRef} className="overflow-x-auto pb-3">
          <div
            className="grid grid-cols-1 gap-3 xl:min-w-0"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`, minWidth: columns.length > 1 ? `${columns.length * 220}px` : undefined }}
          >
            {columns.map(column => (
              <KanbanColumnDroppable
                key={column.id}
                column={column}
                items={itemsByColumn.get(column.id) || []}
                getItemId={getItemId}
                renderCard={renderCard}
                activeId={activeId}
                emptyLabel={emptyLabel}
                emptyIcon={emptyIcon}
              />
            ))}
          </div>
        </div>
      </section>
      <DragOverlay>{activeItem ? renderCard(activeItem, true) : null}</DragOverlay>
    </DndContext>
  );
}
