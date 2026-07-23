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
import { StatusBadge } from './StatusBadge';

type Props = {
  items: CeremonyItem[];
  selectedId?: string;
  compact?: boolean;
  onChange: (items: CeremonyItem[]) => void;
  onSelect?: (id: string) => void;
  onToggle?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSpeechTypeChange?: (id: string, speechType: 'words' | 'congratulatory') => void;
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
  onSpeechTypeChange,
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
  onSpeechTypeChange?: (speechType: 'words' | 'congratulatory') => void;
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
          <small>{item.active ? '예식에서 진행하는 식순' : '작성한 내용 보관 중'}</small>
        </span>
      </button>
      <StatusBadge
        tone={item.active ? 'complete' : 'inactive'}
        className="item-status"
      >
        {item.active ? '진행' : '미진행'}
      </StatusBadge>
      {!compact && item.type === 'speech' && onSpeechTypeChange && (
        <div className="order-speech-type" role="group" aria-label={`${index + 1}번 말하기 종류`}>
          <button
            type="button"
            className={(item.detailConfig.speechType ?? 'words') === 'words' ? 'active' : ''}
            aria-pressed={(item.detailConfig.speechType ?? 'words') === 'words'}
            onClick={() => onSpeechTypeChange('words')}
          >
            덕담
          </button>
          <button
            type="button"
            className={item.detailConfig.speechType === 'congratulatory' ? 'active' : ''}
            aria-pressed={item.detailConfig.speechType === 'congratulatory'}
            onClick={() => onSpeechTypeChange('congratulatory')}
          >
            축사
          </button>
        </div>
      )}
      <div className="item-actions">
        <button
          type="button"
          className="icon-action"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="위로 이동"
          title={`${item.title} 위로 이동`}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-action"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="아래로 이동"
          title={`${item.title} 아래로 이동`}
        >
          ↓
        </button>
        {!compact && onDuplicate && (
          <button
            type="button"
            className="secondary-action"
            onClick={onDuplicate}
            aria-label={`${item.title} 복제`}
          >
            <span aria-hidden="true">⧉</span> 복제
          </button>
        )}
        {onToggle && (
          <button
            type="button"
            className="status-action"
            onClick={onToggle}
            aria-label={item.active ? '미진행' : '진행'}
          >
            {item.active ? '미진행으로 변경' : '다시 진행'}
          </button>
        )}
        {!compact && onDelete && (
          <button
            type="button"
            className="danger"
            onClick={onDelete}
            aria-label={`${item.title} 삭제`}
          >
            삭제
          </button>
        )}
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
  onSpeechTypeChange,
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
              onSpeechTypeChange={onSpeechTypeChange ? (speechType) => onSpeechTypeChange(item.id, speechType) : undefined}
              onMove={(direction) => reorder(index, index + direction)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
