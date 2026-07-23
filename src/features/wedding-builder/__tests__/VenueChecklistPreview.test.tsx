import { createElement } from 'react';
import { cleanup, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VenueChecklistPreview } from '../components/VenueChecklistPreview';
import { createDraft } from '../data/ceremonyTemplates';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';
import { buildCeremonyProjection } from '../services/ceremonyProjection';

function preview(draft = createDraft()) {
  return render(createElement(VenueChecklistPreview, {
    projection: buildCeremonyProjection(draft),
  }));
}

function checklistRow(
  view: ReturnType<typeof render>,
  label: string,
) {
  const row = view.getByText(label, { selector: 'dt' })
    .closest('.venue-checklist-row');
  if (!(row instanceof HTMLElement)) {
    throw new Error(`체크표 행을 찾을 수 없습니다: ${label}`);
  }
  return row;
}

afterEach(cleanup);

describe('VenueChecklistPreview', () => {
  it('Projection 결과를 읽기 전용 예식장 체크표 항목으로 표시한다', () => {
    const view = preview();

    expect(view.getByRole('heading', {
      name: '예식장 전달용 체크표 미리보기',
    })).toBeInTheDocument();
    expect(view.getByText('편집 불가')).toBeInTheDocument();
    expect(view.getByText('주례 없는 예식')).toBeInTheDocument();
    expect(view.queryByText('주례 유무', { selector: 'dt' })).not.toBeInTheDocument();
    expect(view.queryByText('무주례')).not.toBeInTheDocument();
    expect(view.getByText('양가 부모님 및 내빈께 인사', {
      selector: 'dt',
    })).toBeInTheDocument();
  });

  it('주례 있는 예식에서만 성함과 직함·관계를 별도 정보로 표시한다', () => {
    const draft = createDraft('officiant');
    const officiant = draft.items.find((item) => item.type === 'officiant_entrance')!;
    officiant.participants = [{
      id: 'officiant-person',
      role: 'officiant',
      name: '김주례',
      relation: '대학 은사',
    }];
    const view = preview(draft);
    const officiantRow = checklistRow(view, '주례 정보');

    expect(view.getByText('주례 있는 예식')).toBeInTheDocument();
    expect(within(officiantRow).getByText('김주례 · 대학 은사')).toBeInTheDocument();
    expect(view.queryByText('주례 유무', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('성혼선언 주체와 축가 2곡 정보를 같은 Projection에서 표시한다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.detailConfig.speakerMode = 'groom_mother';
    declaration.participants = [{
      id: 'declaration-speaker',
      role: 'pronouncement_speaker',
      name: '',
      displayTitle: '신랑 어머님',
    }];
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [
      {
        id: 'song-1',
        type: 'song',
        performerName: '축가자 A',
        title: '첫 번째 곡',
        samePerformerAsPrevious: false,
        order: 0,
      },
      {
        id: 'song-2',
        type: 'song',
        performerName: '축가자 B',
        title: '두 번째 곡',
        samePerformerAsPrevious: false,
        order: 1,
      },
    ];
    const view = preview(draft);

    const declarationRow = checklistRow(view, '성혼선언');
    const performanceRow = checklistRow(view, '축가·축무');
    expect(within(declarationRow).getByText(/신랑 어머님/)).toBeInTheDocument();
    expect(within(performanceRow).getByText(/축가 2곡/)).toBeInTheDocument();
    expect(within(performanceRow).getByText(/첫 번째 곡/)).toBeInTheDocument();
    expect(within(performanceRow).getByText(/두 번째 곡/)).toBeInTheDocument();
  });

  it('전용 데이터가 없는 자료 상태와 음원 타이밍을 확인 필요로 표시한다', () => {
    const view = preview();
    const materialRow = checklistRow(view, '자료 준비 상태');
    const musicRow = checklistRow(view, '음원 재생 타이밍');

    expect(within(materialRow).getByText('확인 필요')).toBeInTheDocument();
    expect(within(musicRow).getByText('확인 필요')).toBeInTheDocument();
    expect(view.getByText(/예식장 확인 필요사항 \d+개/)).toBeInTheDocument();
  });

  it('active=false 항목은 미진행으로 보이고 내부 정책 경고는 표시하지 않는다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.active = false;
    const view = preview(draft);
    const declarationRow = checklistRow(view, '성혼선언');

    expect(within(declarationRow).getByText('미진행')).toBeInTheDocument();
    expect(view.queryByText(/정책 확인 필요/)).not.toBeInTheDocument();
  });

  it('렌더링 중 Draft/localStorage 모듈을 호출하지 않는다', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    try {
      preview();
      expect(getItem).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it('Owner 최종 확인 단계에 Preview가 실제 연결된다', () => {
    const draft = createDraft();
    draft.lastStep = 5;
    const view = render(createElement(
      MemoryRouter,
      null,
      createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'idle',
        lastSavedAt: null,
        compositionHandlers: {
          onCompositionStart: vi.fn(),
          onCompositionEnd: vi.fn(),
        },
      }),
    ));

    expect(view.getByRole('heading', {
      name: '예식장 전달용 체크표 미리보기',
    })).toBeInTheDocument();
  });
});
