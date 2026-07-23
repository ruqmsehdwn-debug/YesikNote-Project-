import { createElement } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinalCeremonySheet } from '../components/FinalCeremonySheet';
import { createDraft } from '../data/ceremonyTemplates';
import { buildCeremonyProjection } from '../services/ceremonyProjection';
import { generateScript } from '../services/scriptEngine';

function renderSheet(draft = createDraft()) {
  const projection = buildCeremonyProjection(draft);
  const script = generateScript(draft);
  return render(createElement(FinalCeremonySheet, {
    draft,
    projection,
    script,
  }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FinalCeremonySheet', () => {
  it('실제 order와 안정 ID를 기준으로 식순을 표시한다', () => {
    const draft = createDraft();
    const opening = draft.items.find((item) => item.type === 'opening')!;
    const groomEntrance = draft.items.find((item) => item.type === 'groom_entrance')!;
    opening.order = 1;
    groomEntrance.order = 0;

    const view = renderSheet(draft);
    const rows = view.container.querySelectorAll('tbody tr');

    expect(rows[0]).toHaveAttribute('data-source-id', groomEntrance.id);
    expect(rows[1]).toHaveAttribute('data-source-id', opening.id);
    expect(within(rows[0] as HTMLElement).getByText('신랑 입장')).toBeInTheDocument();
  });

  it('혼인서약과 성혼선언의 진행 주체를 Projection과 같은 값으로 표시한다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.detailConfig.speakerMode = 'groom_mother';
    declaration.participants = [{
      id: 'declaration-speaker',
      role: 'pronouncement_speaker',
      name: '',
      displayTitle: '신랑 어머님',
    }];

    const view = renderSheet(draft);
    const vowRow = view.getByText('혼인서약', { selector: 'th' }).closest('tr')!;
    const declarationRow = view.getByText('성혼선언', { selector: 'th' }).closest('tr')!;

    expect(within(vowRow).getByText(/낭독: 신랑·신부/)).toBeInTheDocument();
    expect(within(declarationRow).getByText(/주체: 신랑 어머님/)).toBeInTheDocument();
  });

  it('공연 카드 2건을 곡 수로 확정하지 않고 입력 순서대로 표시한다', () => {
    const draft = createDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [
      {
        id: 'performance-1',
        type: 'song',
        performerName: '공연자 1',
        performerRelation: '친구',
        title: '첫 번째 공연',
        samePerformerAsPrevious: false,
        order: 0,
      },
      {
        id: 'performance-2',
        type: 'song',
        performerName: '공연자 2',
        performerRelation: '가족',
        title: '두 번째 공연',
        samePerformerAsPrevious: false,
        order: 1,
      },
    ];

    const view = renderSheet(draft);
    const row = view.getByText('축가', { selector: 'th' }).closest('tr')!;
    const summary = within(row).getByText(/공연 카드 2건/);

    expect(summary).toHaveTextContent('1. 축가 — 첫 번째 공연 / 공연자 1 · 친구');
    expect(summary).toHaveTextContent('2. 축가 — 두 번째 공연 / 공연자 2 · 가족');
    expect(summary).not.toHaveTextContent('2곡');
  });

  it('Cue와 Note를 서로 다른 열에 표시한다', () => {
    const draft = createDraft();
    const groomEntrance = draft.items.find((item) => item.type === 'groom_entrance')!;
    groomEntrance.cueOverride = ['신랑 입장곡 재생'];
    groomEntrance.requestNote = '입장 속도 확인';

    const view = renderSheet(draft);
    const row = view.getByText('신랑 입장', { selector: 'th' }).closest('tr')!;

    expect(within(row.querySelector('[data-label="Cue"]') as HTMLElement)
      .getByText('신랑 입장곡 재생')).toBeInTheDocument();
    expect(within(row.querySelector('[data-label="Note"]') as HTMLElement)
      .getByText('입장 속도 확인')).toBeInTheDocument();
  });

  it('누락값을 확인 필요로 표시한다', () => {
    const view = renderSheet();
    const timeValue = view.getByText('예식 시간').closest('div')!;

    expect(within(timeValue).getByText('확인 필요')).toBeInTheDocument();
  });

  it('active=false 입력 데이터와 원본 Draft를 변경하지 않는다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.active = false;
    declaration.narrationOverride = '보존할 직접 대본';
    const original = structuredClone(draft);

    const view = renderSheet(draft);

    const inactiveSection = view.getByRole('region', { name: '미진행 식순' });
    expect(inactiveSection).toBeInTheDocument();
    expect(within(inactiveSection).getByText('성혼선언')).toBeInTheDocument();
    expect(view.queryByText('성혼선언', { selector: 'tbody th' })).not.toBeInTheDocument();
    expect(draft).toEqual(original);
  });

  it('localStorage를 호출하지 않고 인쇄 버튼만 window.print를 실행한다', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const view = renderSheet();

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: '인쇄' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
