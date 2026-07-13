import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CeremonyItem } from '../models/ceremony';

type Props = {
  items: CeremonyItem[];
  selectedId?: string;
  compact?: boolean;
  onChange: (items: CeremonyItem[]) => void;
  onSelect?: (id: string) => void;
  onToggle?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function SortableRow({
  item,
  index,
  total,
  selected,
  compact,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onMove,
}: {
  item: CeremonyItem;
  index: number;
  total: number;
  selected: boolean;
  compact: boolean;
  onSelect?: () => void;
  onToggle?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`item-card ${selected ? 'selected' : ''} ${!item.active ? 'inactive' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`${item.title} 끌어서 이동`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button type="button" className="item-main" onClick={onSelect}>
        <span className="item-index">{index + 1}</span>
        <span>
          <strong>{item.title}</strong>
          <small>{item.active ? '진행' : '미진행 · 입력값 보존'}</small>
        </span>
      </button>
      <div className="item-actions">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="위로 이동">↑</button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="아래로 이동">↓</button>
        {onToggle && <button type="button" onClick={onToggle}>{item.active ? '미진행' : '진행'}</button>}
        {!compact && onDuplicate && <button type="button" onClick={onDuplicate}>복제</button>}
        {!compact && onDelete && <button type="button" className="danger" onClick={onDelete}>삭제</button>}
      </div>
    </div>
  );
}

export function SortableItemList({
  items,
  selectedId,
  compact = false,
  onChange,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
}: Props) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= sorted.length) return;
    onChange(arrayMove(sorted, from, to).map((item, order) => ({ ...item, order })));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((item) => item.id === active.id);
    const newIndex = sorted.findIndex((item) => item.id === over.id);
    reorder(oldIndex, newIndex);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sorted.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={compact ? 'child-list' : 'item-list'}>
          {sorted.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              index={index}
              total={sorted.length}
              compact={compact}
              selected={selectedId === item.id}
              onSelect={onSelect ? () => onSelect(item.id) : undefined}
              onToggle={onToggle ? () => onToggle(item.id) : undefined}
              onDuplicate={onDuplicate ? () => onDuplicate(item.id) : undefined}
              onDelete={onDelete ? () => onDelete(item.id) : undefined}
              onMove={(direction) => reorder(index, index + direction)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
