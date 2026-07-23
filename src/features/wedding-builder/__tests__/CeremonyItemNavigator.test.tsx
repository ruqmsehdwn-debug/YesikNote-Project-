import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CeremonyItemNavigator } from '../components/CeremonyItemNavigator';
import { createTemplate } from '../data/ceremonyTemplates';
import type {
  CeremonyItem,
  ValidationIssue,
} from '../models/ceremony';

afterEach(cleanup);

function NavigatorHarness({
  initialItems,
  issues,
}: {
  initialItems: CeremonyItem[];
  issues: ValidationIssue[];
}) {
  const [selectedId, setSelectedId] = useState(initialItems[0]?.id);
  return (
    <CeremonyItemNavigator
      items={initialItems}
      selectedId={selectedId}
      issues={issues}
      onSelect={setSelectedId}
    />
  );
}

describe('CeremonyItemNavigator', () => {
  it('식순명·상태를 표시하고 안정 ID로 미진행 항목까지 선택한다', () => {
    const items = createTemplate('no_officiant');
    const giftExchange = items.find((item) => item.type === 'ring_exchange')!;
    const declaration = items.find((item) => item.type === 'pronouncement')!;
    giftExchange.active = false;
    const issues: ValidationIssue[] = [{
      id: 'declaration-required',
      itemId: declaration.id,
      field: 'participantName',
      severity: 'blocking',
      message: '성혼선언자를 확인해 주세요.',
    }];
    const original = structuredClone(items);
    const view = render(<NavigatorHarness initialItems={items} issues={issues} />);

    const declarationButton = view.getByRole('button', {
      name: `${declaration.order + 1}. 성혼선언 · 확인 필요`,
    });
    const giftButton = view.getByRole('button', {
      name: `${giftExchange.order + 1}. 예물교환 · 미진행`,
    });

    expect(view.getByRole('combobox', { name: '식순 선택' })).toBeInTheDocument();
    fireEvent.click(declarationButton);
    expect(declarationButton).toHaveAttribute('aria-current', 'step');
    fireEvent.click(giftButton);
    expect(giftButton).toHaveAttribute('aria-current', 'step');
    expect(items).toEqual(original);
  });

  it('방향키와 Home/End로 현재 순서의 식순을 이동한다', () => {
    const items = createTemplate('no_officiant');
    const view = render(<NavigatorHarness initialItems={items} issues={[]} />);
    const first = view.getByRole('button', {
      name: '1. 개식사 · 작성 완료',
    });
    const second = view.getByRole('button', {
      name: '2. 화촉점화 · 작성 완료',
    });
    const last = view.getByRole('button', {
      name: '13. 폐회식 · 작성 완료',
    });

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveAttribute('aria-current', 'step');
    fireEvent.keyDown(second, { key: 'End' });
    expect(last).toHaveAttribute('aria-current', 'step');
    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveAttribute('aria-current', 'step');
  });

  it('order가 바뀌어도 선택은 배열 위치가 아니라 안정 ID로 유지한다', () => {
    const items = createTemplate('no_officiant');
    const declaration = items.find((item) => item.type === 'pronouncement')!;
    const { rerender } = render(
      <CeremonyItemNavigator
        items={items}
        selectedId={declaration.id}
        issues={[]}
        onSelect={() => undefined}
      />,
    );

    declaration.order = 0;
    items
      .filter((item) => item.id !== declaration.id)
      .forEach((item, index) => { item.order = index + 1; });
    rerender(
      <CeremonyItemNavigator
        items={[...items].reverse()}
        selectedId={declaration.id}
        issues={[]}
        onSelect={() => undefined}
      />,
    );

    expect(viewSelectedButton()).toHaveTextContent('성혼선언');
  });
});

function viewSelectedButton() {
  const selected = document.querySelector('[aria-current="step"]');
  if (!(selected instanceof HTMLButtonElement)) {
    throw new Error('선택된 식순 버튼을 찾을 수 없습니다.');
  }
  return selected;
}
