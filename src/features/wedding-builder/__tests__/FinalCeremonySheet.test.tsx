import { createElement } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinalCeremonySheet } from '../components/FinalCeremonySheet';
import { createDraft } from '../data/ceremonyTemplates';
import { buildCeremonyProjection } from '../services/ceremonyProjection';
import { generateScript } from '../services/scriptEngine';

function renderSheet(draft = createDraft(), onNotify?: (message: string) => void) {
  const projection = buildCeremonyProjection(draft);
  const script = generateScript(draft);
  return render(createElement(FinalCeremonySheet, {
    draft,
    projection,
    script,
    onNotify,
  }));
}

function openFullTable(view: ReturnType<typeof renderSheet>) {
  fireEvent.click(view.getByRole('button', { name: '전체 표 보기' }));
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
    openFullTable(view);
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
    openFullTable(view);
    const vowRow = view.getByText('혼인서약', { selector: 'th' }).closest('tr')!;
    const declarationRow = view.getByText('성혼선언', { selector: 'th' }).closest('tr')!;

    expect(within(vowRow).getByText(/낭독자: 신랑·신부/)).toBeInTheDocument();
    expect(within(declarationRow).getByText(/진행자: 신랑 어머님/)).toBeInTheDocument();
  });

  it('축가 카드 2개를 축가 2곡으로 입력 순서대로 표시한다', () => {
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
    openFullTable(view);
    const row = view.getByText('축가', { selector: 'th' }).closest('tr')!;
    const summary = within(row).getByText(/축가 2곡/);

    expect(summary).toHaveTextContent(/1\. 축가\s+첫 번째 공연\s+공연자 1 · 친구/);
    expect(summary).toHaveTextContent(/2\. 축가\s+두 번째 공연\s+공연자 2 · 가족/);
  });

  it('Cue와 Note를 서로 다른 열에 표시한다', () => {
    const draft = createDraft();
    const groomEntrance = draft.items.find((item) => item.type === 'groom_entrance')!;
    groomEntrance.cueOverride = ['신랑 입장곡 재생'];
    groomEntrance.requestNote = '입장 속도 확인';

    const view = renderSheet(draft);
    openFullTable(view);
    const row = view.getByText('신랑 입장', { selector: 'th' }).closest('tr')!;

    expect(within(row.querySelector('[data-label="Cue"]') as HTMLElement)
      .getByText('신랑 입장곡 재생')).toBeInTheDocument();
    expect(within(row.querySelector('[data-label="Note"]') as HTMLElement)
      .getByText('입장 속도 확인')).toBeInTheDocument();
  });

  it('누락값을 확인 필요로 표시한다', () => {
    const view = renderSheet();
    openFullTable(view);
    const timeValue = view.getByText('예식 시간').closest('div')!;

    expect(within(timeValue).getByText('확인 필요')).toBeInTheDocument();
  });

  it('예식 형태와 주례 유무를 중복 표시하지 않고 주례 정보만 조건부 표시한다', () => {
    const noOfficiantView = renderSheet(createDraft('no_officiant'));
    openFullTable(noOfficiantView);
    expect(noOfficiantView.getByText('주례 없는 예식')).toBeInTheDocument();
    expect(noOfficiantView.queryByText('주례 유무')).not.toBeInTheDocument();
    expect(noOfficiantView.queryByText('주례 정보')).not.toBeInTheDocument();
    cleanup();

    const draft = createDraft('officiant');
    const officiant = draft.items.find((item) => item.type === 'officiant_entrance')!;
    officiant.participants = [{
      id: 'officiant-person',
      role: 'officiant',
      name: '김주례',
      relation: '대학 은사',
    }];
    const officiantView = renderSheet(draft);
    openFullTable(officiantView);
    const info = officiantView.getByText('주례 정보').closest('div')!;
    expect(within(info).getByText('김주례 · 대학 은사')).toBeInTheDocument();
    expect(officiantView.queryByText('주례 유무')).not.toBeInTheDocument();
  });

  it('active=false 입력 데이터와 원본 Draft를 변경하지 않는다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.active = false;
    declaration.narrationOverride = '보존할 직접 대본';
    const original = structuredClone(draft);

    const view = renderSheet(draft);
    openFullTable(view);

    const inactiveSection = view.getByRole('region', { name: '미진행 식순' });
    expect(inactiveSection).toBeInTheDocument();
    expect(within(inactiveSection).getByText('성혼선언')).toBeInTheDocument();
    expect(view.queryByText('성혼선언', { selector: 'tbody th' })).not.toBeInTheDocument();
    expect(draft).toEqual(original);
  });

  it('예물교환 미진행을 전체 표에 한 줄로 표시하고 Cue·Note는 숨긴다', () => {
    const draft = createDraft();
    const giftExchange = draft.items.find((item) => item.type === 'ring_exchange')!;
    giftExchange.active = false;
    giftExchange.cueOverride = ['보존할 Cue'];
    giftExchange.requestNote = '보존할 Note';
    const view = renderSheet(draft);

    openFullTable(view);
    const row = view.getByText('예물교환', { selector: 'th' }).closest('tr')!;
    expect(within(row).getByText('미진행')).toBeInTheDocument();
    expect(within(row).queryByText('보존할 Cue')).not.toBeInTheDocument();
    expect(within(row).queryByText('보존할 Note')).not.toBeInTheDocument();
  });

  it('localStorage를 호출하지 않고 인쇄 버튼만 window.print를 실행한다', () => {
    vi.useFakeTimers();
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const notify = vi.fn();
    const view = renderSheet(createDraft(), notify);

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: '인쇄' }));
    vi.runAllTimers();
    expect(print).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('인쇄 준비 완료');
    vi.useRealTimers();
  });

  it('기본 화면은 목록형이고 전체 6열 표는 펼치기 전 노출하지 않는다', () => {
    const view = renderSheet();

    expect(view.getByRole('list', { name: '최종 식순 간단 목록' })).toBeInTheDocument();
    expect(view.queryByRole('table')).not.toBeInTheDocument();
    expect(view.getAllByText('자세히 보기').length).toBeGreaterThan(0);
  });

  it('식순 상세를 펼치면 진행 정보와 Cue, Note를 구분한다', () => {
    const draft = createDraft();
    const groomEntrance = draft.items.find((item) => item.type === 'groom_entrance')!;
    groomEntrance.cueOverride = ['신랑 입장곡 재생'];
    groomEntrance.requestNote = '입장 속도 확인';
    const view = renderSheet(draft);
    const item = view.container.querySelector(`[data-source-id="${groomEntrance.id}"]`) as HTMLElement;

    fireEvent.click(within(item).getByRole('button', { name: /신랑 입장/ }));

    expect(within(item).getByRole('heading', { name: 'Cue' })).toBeInTheDocument();
    expect(within(item).getByText('신랑 입장곡 재생')).toBeInTheDocument();
    expect(within(item).getByRole('heading', { name: 'Note' })).toBeInTheDocument();
    expect(within(item).getByText('입장 속도 확인')).toBeInTheDocument();
  });
});
