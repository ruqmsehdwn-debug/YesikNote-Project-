import { useState } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemDetailEditor } from '../components/ItemDetailEditor';
import { createDraft } from '../data/ceremonyTemplates';
import type { CeremonyDraft, CeremonyItem } from '../models/ceremony';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';

function OwnerHarness({ initialDraft }: { initialDraft: CeremonyDraft }) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <MemoryRouter>
      <OwnerBuilderPage
        draft={draft}
        setDraft={setDraft}
        saveStatus="saved"
        lastSavedAt={null}
        onSaveNow={() => true}
        compositionHandlers={{
          onCompositionStart: () => undefined,
          onCompositionEnd: () => undefined,
        }}
      />
    </MemoryRouter>
  );
}

function PerformanceHarness({ initialItem }: { initialItem: CeremonyItem }) {
  const [item, setItem] = useState(initialItem);
  return <ItemDetailEditor item={item} onChange={setItem} />;
}

function completedDraft() {
  const draft = createDraft();
  draft.lastStep = 5;
  draft.basicInfo.weddingDate = '2026-10-17';
  draft.basicInfo.groomName = '김도윤';
  draft.basicInfo.brideName = '이하나';
  draft.basicInfo.banquetLocation = '연회장';
  const speech = draft.items.find((item) => item.type === 'speech')!;
  speech.participants = [{
    id: 'speaker',
    role: 'speaker',
    name: '김대표',
  }];
  const performance = draft.items.find((item) => item.type === 'performance')!;
  performance.detailConfig.performances = [{
    id: 'complete-performance',
    type: 'song',
    performerName: '홍건우',
    performerRelation: '신랑의 중학교 친구',
    title: '라라라',
    samePerformerAsPrevious: false,
    order: 0,
  }];
  return draft;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Owner 최종 확인 W4.1 개선', () => {
  it('비활성 공연 식순을 처음 진행으로 바꾸면 카드 1개만 만들고 축가자 입력에 focus한다', () => {
    const draft = createDraft();
    draft.lastStep = 3;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.active = false;
    performance.detailConfig.performances = [];
    const view = render(<OwnerHarness initialDraft={draft} />);
    const orderRow = view.getByText('축가/축무/축주', { selector: 'strong' })
      .closest('.item-card')!;

    fireEvent.click(within(orderRow as HTMLElement).getByRole('button', { name: '진행' }));

    expect(view.getByRole('textbox', { name: '축가자' })).toHaveFocus();
    expect(view.container.querySelectorAll('[data-performance-id]')).toHaveLength(1);
    expect(view.getByText('공연 1 · 축가')).toBeInTheDocument();
  });

  it('기존 공연 카드가 있으면 활성화해도 중복 생성하지 않는다', () => {
    const draft = createDraft();
    draft.lastStep = 3;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.active = false;
    performance.detailConfig.performances = [{
      id: 'existing-performance',
      type: 'song',
      performerName: '기존 축가자',
      title: '기존 축가',
      samePerformerAsPrevious: false,
      order: 0,
    }];
    const view = render(<OwnerHarness initialDraft={draft} />);
    const orderRow = view.getByText('축가', { selector: 'strong' })
      .closest('.item-card')!;

    fireEvent.click(within(orderRow as HTMLElement).getByRole('button', { name: '진행' }));
    fireEvent.click((orderRow as HTMLElement).querySelector('.item-main')!);

    expect(view.container.querySelectorAll('[data-performance-id]')).toHaveLength(1);
    expect(view.getByDisplayValue('기존 축가자')).toBeInTheDocument();
  });

  it('마지막 공연 카드를 직접 삭제하면 재생성하지 않고 빈 상태와 첫 공연 추가를 표시한다', () => {
    const draft = createDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [{
      id: 'delete-last-performance',
      type: 'song',
      performerName: '삭제 대상',
      title: '삭제 대상 곡',
      samePerformerAsPrevious: false,
      order: 0,
    }];
    const view = render(<PerformanceHarness initialItem={performance} />);

    fireEvent.click(view.getByRole('button', { name: '공연 삭제' }));

    expect(view.queryByText('삭제 대상')).not.toBeInTheDocument();
    expect(view.getByText('등록된 공연이 없습니다')).toBeInTheDocument();
    expect(view.getByText('축가·축무를 진행하려면 공연 정보를 추가해 주세요.')).toBeInTheDocument();
    expect(view.getByRole('button', { name: '첫 공연 추가' })).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-performance-id]')).toHaveLength(0);
  });

  it('필수 작성 완료와 남은 현장 확인을 서로 다른 상태로 표시한다', () => {
    const draft = completedDraft();
    const view = render(<OwnerHarness initialDraft={draft} />);

    expect(view.getByText('필수 입력 완료')).toBeInTheDocument();
    const fieldStatus = view.getByText('현장 확인').closest('div')!;
    expect(fieldStatus).toHaveTextContent(/\d+개/);
    expect(view.queryByText('최종 확인 완료')).not.toBeInTheDocument();
  });

  it('정상 축가 카드 1개는 축가 1곡으로 표시하고 수정 필요로 만들지 않는다', () => {
    const view = render(<OwnerHarness initialDraft={completedDraft()} />);
    const row = view.getByRole('button', { name: /축가홍건우 · 1곡/ }).closest('li')!;

    expect(row).toHaveTextContent('홍건우 · 1곡');
    expect(row).not.toHaveTextContent('수정 필요');
    expect(view.queryByText(/축가 곡 수는 별도 필드/)).not.toBeInTheDocument();
  });

  it('예물교환 미진행은 회색 미진행 상태이며 Owner 수정 필요에 포함하지 않는다', () => {
    const draft = completedDraft();
    const giftExchange = draft.items.find((item) => item.type === 'ring_exchange')!;
    giftExchange.active = false;
    const view = render(<OwnerHarness initialDraft={draft} />);
    const row = view.getByRole('button', { name: /예물교환/ }).closest('li')!;

    expect(row).toHaveTextContent('미진행');
    expect(row).not.toHaveTextContent('수정 필요');
    expect(row.querySelector('.review-status-badge.inactive')).toBeInTheDocument();
  });

  it('한 번에 확인하기는 여러 USER_ACTION을 연속 이동한 뒤 최종 확인으로 돌아간다', () => {
    const draft = completedDraft();
    draft.basicInfo.weddingDate = '';
    draft.basicInfo.groomName = '';
    const view = render(<OwnerHarness initialDraft={draft} />);

    fireEvent.click(view.getByRole('button', { name: '한 번에 확인하기' }));
    const weddingDate = view.container.querySelector<HTMLInputElement>('[data-basic-field="weddingDate"]')!;
    expect(weddingDate).toHaveFocus();
    fireEvent.change(weddingDate, { target: { value: '2026-10-17' } });

    fireEvent.click(view.getByRole('button', { name: '다음 확인 항목' }));
    const groomName = view.container.querySelector<HTMLInputElement>('[data-basic-field="groomName"]')!;
    expect(groomName).toHaveFocus();
    fireEvent.change(groomName, { target: { value: '김도윤' } });

    fireEvent.click(view.getByRole('button', { name: '확인 완료 후 돌아가기' }));
    expect(view.getByRole('heading', { name: '최종 대본을 확인하세요' })).toBeInTheDocument();
  });

  it('공연 확인 필요의 바로 수정은 안정 ID 공연 영역과 첫 공연 추가 버튼으로 이동한다', () => {
    const draft = createDraft();
    draft.lastStep = 5;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [];
    const view = render(<OwnerHarness initialDraft={draft} />);
    const row = view.getByRole('button', { name: /축가\/축무\/축주/ }).closest('li')!;

    fireEvent.click(within(row).getByRole('button', { name: '바로 수정' }));

    expect(view.getByRole('combobox', { name: '편집할 식순' })).toHaveValue(performance.id);
    expect(view.getByRole('button', { name: '첫 공연 추가' })).toHaveFocus();
    expect(view.getByRole('status')).toHaveTextContent('확인할 입력칸으로 이동했습니다.');
  });

  it('전용 필드가 없는 현장 확인은 빨간 수정 동작을 만들지 않고 상세에 표시한다', () => {
    const draft = createDraft();
    draft.lastStep = 5;
    const procession = draft.items.find((item) => item.type === 'recessional')!;
    const view = render(<OwnerHarness initialDraft={draft} />);
    const row = view.getByRole('button', { name: /신랑·신부 행진/ }).closest('li')!;

    expect(within(row).queryByRole('button', { name: '바로 수정' })).not.toBeInTheDocument();
    expect(row).toHaveTextContent('현장 확인');
    fireEvent.click(within(row).getByRole('button', { name: '자세히 보기' }));

    expect(view.getByRole('heading', { name: '최종 대본을 확인하세요' })).toBeInTheDocument();
    expect(within(row).getByText(/음원 재생 타이밍을 예식장과 확인/)).toBeInTheDocument();
  });
});
