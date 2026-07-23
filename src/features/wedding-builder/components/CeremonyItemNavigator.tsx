import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import type {
  CeremonyItem,
  ValidationIssue,
} from '../models/ceremony';
import { ceremonyItemDisplayTitle } from '../services/scriptEngine';

type Props = {
  items: CeremonyItem[];
  selectedId?: string;
  issues: ValidationIssue[];
  onSelect: (id: string) => void;
};

type NavigationStatus = 'complete' | 'needs-review' | 'inactive';

const statusLabels: Record<NavigationStatus, string> = {
  complete: '작성 완료',
  'needs-review': '확인 필요',
  inactive: '미진행',
};

function hasItemIssue(item: CeremonyItem, issues: ValidationIssue[]) {
  const sourceIds = new Set([
    item.id,
    ...(item.children ?? []).map((child) => child.id),
  ]);
  return issues.some((issue) => {
    const sourceId = issue.ceremonyItemId ?? issue.itemId;
    return !!sourceId && sourceIds.has(sourceId);
  });
}

function itemStatus(
  item: CeremonyItem,
  issues: ValidationIssue[],
): NavigationStatus {
  if (!item.active) return 'inactive';
  return hasItemIssue(item, issues) ? 'needs-review' : 'complete';
}

export function CeremonyItemNavigator({
  items,
  selectedId,
  issues,
  onSelect,
}: Props) {
  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  );
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectedItem = orderedItems.find((item) => item.id === selectedId)
    ?? orderedItems[0];
  const selectedStatus = selectedItem
    ? itemStatus(selectedItem, issues)
    : undefined;

  useEffect(() => {
    if (!selectedItem) return;
    buttonRefs.current.get(selectedItem.id)?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [selectedItem]);

  const moveSelection = (
    event: KeyboardEvent<HTMLButtonElement>,
    itemId: string,
  ) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = orderedItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;
    const targetIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? orderedItems.length - 1
        : event.key === 'ArrowDown'
          ? Math.min(orderedItems.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
    const target = orderedItems[targetIndex];
    if (!target) return;
    onSelect(target.id);
    window.requestAnimationFrame(() => buttonRefs.current.get(target.id)?.focus());
  };

  return (
    <aside className="detail-rail">
      <label className="select-label ceremony-select-control">
        식순 선택
        <select
          value={selectedItem?.id ?? ''}
          onChange={(event) => onSelect(event.target.value)}
        >
          {orderedItems.map((item) => (
            <option value={item.id} key={item.id}>
              {item.order + 1}. {ceremonyItemDisplayTitle(item)}
              {' '}({statusLabels[itemStatus(item, issues)]})
            </option>
          ))}
        </select>
      </label>

      {selectedItem && selectedStatus && (
        <div className="ceremony-mobile-current" aria-live="polite">
          <span>현재 선택</span>
          <strong>{selectedItem.order + 1}. {ceremonyItemDisplayTitle(selectedItem)}</strong>
          <em className={`ceremony-nav-status ${selectedStatus}`}>
            {statusLabels[selectedStatus]}
          </em>
        </div>
      )}

      <nav className="ceremony-item-navigation" aria-label="식순 빠른 선택">
        <div className="ceremony-navigation-heading">
          <span className="section-kicker">STEP 4</span>
          <h2>식순 선택</h2>
          <p>식순명과 작성 상태를 보고 바로 이동하세요.</p>
        </div>
        <ol>
          {orderedItems.map((item) => {
            const status = itemStatus(item, issues);
            const selected = item.id === selectedItem?.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  ref={(element) => {
                    if (element) buttonRefs.current.set(item.id, element);
                    else buttonRefs.current.delete(item.id);
                  }}
                  className={selected ? 'selected' : ''}
                  aria-label={`${item.order + 1}. ${ceremonyItemDisplayTitle(item)} · ${statusLabels[status]}`}
                  aria-current={selected ? 'step' : undefined}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(event) => moveSelection(event, item.id)}
                >
                  <span className="ceremony-nav-number">{item.order + 1}</span>
                  <strong>{ceremonyItemDisplayTitle(item)}</strong>
                  <span className={`ceremony-nav-status ${status}`}>
                    {statusLabels[status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
