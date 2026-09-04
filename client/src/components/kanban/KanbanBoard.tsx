import { type ReactNode, useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";

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

function KanbanColumnDroppable({
  column,
  count,
  children,
}: {
  column: KanbanColumn;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

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
          {count}
        </span>
      </div>
      <div className="min-h-[60px] space-y-2">{children}</div>
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
      <section className="overflow-x-auto pb-3">
        <div
          className="grid grid-cols-1 gap-3 xl:min-w-0"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`, minWidth: columns.length > 1 ? `${columns.length * 220}px` : undefined }}
        >
          {columns.map(column => {
            const columnItems = itemsByColumn.get(column.id) || [];
            return (
              <KanbanColumnDroppable key={column.id} column={column} count={columnItems.length}>
                {columnItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/60">
                    {emptyIcon}
                    {emptyLabel}
                  </div>
                ) : (
                  columnItems.map(item => (
                    <KanbanCard key={String(getItemId(item))} id={String(getItemId(item))}>
                      {renderCard(item, String(getItemId(item)) === activeId)}
                    </KanbanCard>
                  ))
                )}
              </KanbanColumnDroppable>
            );
          })}
        </div>
      </section>
      <DragOverlay>{activeItem ? renderCard(activeItem, true) : null}</DragOverlay>
    </DndContext>
  );
}
