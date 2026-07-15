import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createDraft, restoreCanonicalOrder } from '../data/ceremonyTemplates';
import type { CeremonyDraft, CeremonyItem } from '../models/ceremony';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';
import { ceremonyItemDisplayTitle, generateScript } from '../services/scriptEngine';
import { McPrompterPage } from '../../mc-prompter/pages/McPrompterPage';
import { ScriptPreview } from '../components/ScriptPreview';

function filledDraft(type: CeremonyDraft['ceremonyType'] = 'no_officiant') {
  const draft = createDraft(type);
  draft.basicInfo = {
    weddingDate: '2026-10-17',
    venueName: '예식노트 웨딩홀',
    hallName: '그랜드홀',
    groomName: '김도윤',
    brideName: '이하나',
    banquetLocation: '지하 1층 연회장',
    photoGuide: '가족 촬영부터 진행합니다.',
    globalRequestNote: '호칭을 천천히 읽어 주세요.',
  };
  return draft;
}

const section = (draft: CeremonyDraft, type: string) =>
  generateScript(draft).ceremonySections.find((item) => item.id === draft.items.find((source) => source.type === type)?.id);

const sourceIdOf = (item: CeremonyItem) =>
  (item as CeremonyItem & { sourceId?: string }).sourceId;

function ownerPage(draft: CeremonyDraft) {
  return createElement(
    MemoryRouter,
    null,
    createElement(OwnerBuilderPage, {
      draft,
      setDraft: () => undefined,
      saveStatus: 'idle',
      lastSavedAt: null,
      compositionHandlers: {
        onCompositionStart: () => undefined,
        onCompositionEnd: () => undefined,
      },
    }),
  );
}

function moveItemFirst(draft: CeremonyDraft, type: string) {
  const target = draft.items.find((item) => item.type === type)!;
  draft.items = [target, ...draft.items.filter((item) => item.id !== target.id)]
    .map((item, order) => ({ ...item, order }));
  return draft.items.find((item) => item.id === target.id)!;
}

function advancePastChecklist(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole('button', { name: '완료' }));
  fireEvent.click(view.getByRole('button', { name: '완료' }));
  fireEvent.click(view.getByRole('button', { name: '완료' }));
}

const mcLedVowsNarration = [
  '이제 두 사람의 사랑의 약속인 혼인서약이 있겠습니다.',
  '오늘은 특별히 제가 두 분에게 사랑의 서약인 혼인서약을 진행하겠습니다.',
  '[혼인서약 낭독]',
  '두 사람의 소중한 약속에 축복의 박수 부탁드립니다.',
].join('\n');

const mcLedPronouncementNarration = [
  '이제 두 사람이 완전한 부부가 되었음을 선언하는 성혼선언이 있겠습니다.',
  '오늘은 제가 내빈 여러분을 대신해 두 분이 완전한 부부가 되었음을 선언하겠습니다.',
  '[성혼선언 낭독]',
  '두 사람에게 다시 한번 축복의 박수 부탁드립니다.',
].join('\n');

const combinedVowsPronouncementNarration = [
  '이제 다음은 두 사람의 사랑의 약속인 혼인서약과, 완전한 부부가 되었음을 선언하는 성혼선언이 있겠습니다.',
  '오늘은 제가 내빈 여러분을 대신해 두 분에게 서약과 선언을 진행하겠습니다.',
  '[혼인서약 및 성혼선언 낭독]',
  '두 사람에게 다시 한번 축복의 박수 부탁드립니다.',
].join('\n');

function configureMcLedItems(draft: CeremonyDraft, vowsMc: boolean, pronouncementMc: boolean) {
  const vows = draft.items.find((item) => item.type === 'vows')!;
  const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
  vows.detailConfig = { ...vows.detailConfig, mode: vowsMc ? 'mc' : 'together' };
  pronouncement.detailConfig = {
    ...pronouncement.detailConfig,
    speakerMode: pronouncementMc ? 'mc' : 'groom_father',
  };
  if (!pronouncementMc) {
    pronouncement.participants = [{ id: 'pronouncer', role: 'speaker', name: '신랑 아버님' }];
  }
  return { vows, pronouncement };
}

describe('scriptEngine', () => {
  it('식전 안내를 15/10/5분 세 번 만들고 피로연 장소를 말하지 않는다', () => {
    const result = generateScript(filledDraft());
    expect(result.preCeremonyChecklist.map((item) => item.title)).toEqual([
      '식전 15분 안내',
      '식전 10분 안내',
      '식전 5분 안내',
    ]);
    expect(result.preCeremonyChecklist[0].narration).toContain('무음 또는 진동');
    expect(result.preCeremonyChecklist[0].narration).not.toContain('지하 1층');
  });

  it('주례 없는 개식사에만 주례 없는 예식 문장을 넣는다', () => {
    expect(section(filledDraft('no_officiant'), 'opening')?.narration).toContain('주례 없는 예식');
    expect(section(filledDraft('officiant'), 'opening')?.narration).not.toContain('주례 없는 예식');
  });

  it('신랑 단독과 아버님 동반 대본을 분기한다', () => {
    const draft = filledDraft();
    const groom = draft.items.find((item) => item.type === 'groom_entrance')!;
    expect(section(draft, 'groom_entrance')?.narration).toContain('신랑, 입장!');
    groom.detailConfig.mode = 'with_father';
    expect(section(draft, 'groom_entrance')?.narration).toContain('신랑과 아버님, 입장!');
  });

  it('신랑 단독입장은 신랑 전용 Cue와 Note만 생성한다', () => {
    const draft = filledDraft();
    const groom = draft.items.find((item) => item.type === 'groom_entrance')!;
    groom.detailConfig = { ...groom.detailConfig, mode: 'solo' };
    const result = section(draft, 'groom_entrance')!;

    expect(result.cue).toEqual(expect.arrayContaining([
      '신랑 대기 확인',
      '신랑 입장 동선 확인',
      '신랑 입장곡 준비 확인',
      '신랑 입장 Cue 확인',
      '단상 위치 도착 확인',
    ]));
    expect(result.cue.join(' ')).not.toMatch(/아버님|동반자|동행 종료|인계/);
    expect(result.note).toEqual(['신랑 입장 동선과 단상 도착 Cue를 확인합니다.']);
  });

  it('신랑 아버님 동반입장은 실제 동반자 Cue와 Note를 생성한다', () => {
    const draft = filledDraft();
    const groom = draft.items.find((item) => item.type === 'groom_entrance')!;
    groom.detailConfig = { ...groom.detailConfig, mode: 'with_father' };
    const result = section(draft, 'groom_entrance')!;

    expect(result.cue).toEqual(expect.arrayContaining([
      '신랑·아버님 대기 확인',
      '신랑 입장 동선 확인',
      '아버님 보행 속도 확인',
      '동행 종료 지점 확인',
      '신랑 입장곡 준비 확인',
      '동반 입장 Cue 확인',
      '단상 위치 도착 확인',
    ]));
    expect(result.note.join(' ')).toContain('신랑 아버님의 보행 속도와 동행 종료 지점');
  });

  it('신랑 직접 구성 입장은 특정 동반자를 추측하지 않는다', () => {
    const draft = filledDraft();
    const groom = draft.items.find((item) => item.type === 'groom_entrance')!;
    groom.detailConfig = { ...groom.detailConfig, mode: 'custom' };
    const result = section(draft, 'groom_entrance')!;

    expect(result.narration).not.toContain('아버님');
    expect(result.cue).toContain('신랑과 동반자 대기 확인');
    expect(result.cue.join(' ')).not.toContain('아버님');
    expect(result.note).toContain('동반자의 보행 속도와 동행 종료 지점을 확인합니다.');
  });

  it('Owner 실시간 미리보기와 MC가 같은 신랑 입장 Cue와 Note를 표시한다', () => {
    localStorage.clear();
    const draft = filledDraft();
    draft.lastStep = 3;
    const groom = moveItemFirst(draft, 'groom_entrance');
    groom.detailConfig = { ...groom.detailConfig, mode: 'solo' };

    const ownerView = render(ownerPage(draft));
    const ownerCard = ownerView.getByRole('heading', { name: '신랑 입장' }).closest('article')!;
    expect(ownerCard.textContent).toContain('신랑 대기 확인');
    expect(ownerCard.textContent).toContain('신랑 입장 동선과 단상 도착 Cue를 확인합니다.');
    expect(ownerCard.textContent).not.toContain('아버님');
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    expect(mcView.container.querySelector('.mc-cue')?.textContent).toContain('신랑 대기 확인');
    expect(mcView.container.querySelector('.mc-note')?.textContent).toContain('신랑 입장 동선과 단상 도착 Cue를 확인합니다.');
    expect(mcView.container.querySelector('.mc-cue')?.textContent).not.toContain('아버님');
    mcView.unmount();
  });

  it.each([
    ['reveal_then_enter', 'father', '신부, 등장!', '아버님의 손'],
    ['direct', 'father', undefined, '아버님의 손'],
    ['reveal_then_enter', 'solo', '신부, 등장!', '여러분 앞에 입장'],
    ['direct', 'solo', undefined, '큰 박수로 신부님'],
  ] as const)('신부 입장 %s/%s 조합을 생성한다', (appearance, escort, has, text) => {
    const draft = filledDraft();
    const bride = draft.items.find((item) => item.type === 'bride_entrance')!;
    bride.detailConfig.appearance = appearance;
    bride.detailConfig.escort = escort;
    const narration = section(draft, 'bride_entrance')!.narration;
    if (has) expect(narration).toContain(has);
    else expect(narration).not.toContain('신부, 등장!');
    expect(narration).toContain(text);
  });

  it.each([
    ['words', '덕담'],
    ['congratulatory', '축사'],
    [undefined, '덕담/축사'],
  ] as const)('speechType %s의 사용자 표시명을 %s으로 만든다', (speechType, expected) => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.detailConfig = { ...speech.detailConfig, speechType };
    expect(ceremonyItemDisplayTitle(speech)).toBe(expected);
    expect(section(draft, 'speech')?.title).toBe(expected);
  });

  it.each([
    ['song', '축가'],
    ['dance', '축무'],
    ['instrumental', '축주'],
  ] as const)('공연 유형 %s의 사용자 표시명을 %s로 만든다', (performanceType, expected) => {
    const draft = filledDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    const stored = { id: performance.id, title: performance.title };
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [{
        id: `performance-${performanceType}`,
        type: performanceType,
        performerName: '공연자',
        samePerformerAsPrevious: false,
        order: 0,
      }],
    };

    expect(ceremonyItemDisplayTitle(performance)).toBe(expected);
    expect(section(draft, 'performance')?.title).toBe(expected);
    expect(ceremonyItemDisplayTitle(performance)).not.toMatch(/덕담|축사/);
    expect({ id: performance.id, title: performance.title }).toEqual(stored);
  });

  it('여러 공연 유형은 실제 의미 순서로 표시하고 말하기 식순과 섞지 않는다', () => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [
        { id: 'dance-first', type: 'dance', performerName: '무용팀', samePerformerAsPrevious: false, order: 0 },
        { id: 'song-second', type: 'song', performerName: '친구', samePerformerAsPrevious: false, order: 1 },
      ],
    };
    draft.items = [...draft.items].reverse().map((item, order) => ({ ...item, order }));

    const result = generateScript(draft).ceremonySections;
    expect(result.find((item) => item.id === speech.id)?.title).toBe('축사');
    expect(result.find((item) => item.id === performance.id)?.title).toBe('축무/축가');
    expect(result.find((item) => item.id === speech.id)?.title).not.toContain('축가');
    expect(result.find((item) => item.id === performance.id)?.title).not.toMatch(/덕담|축사/);
  });

  it('복제 표시명을 계산해도 안정 ID와 저장 title은 바꾸지 않는다', () => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.id = 'copy-stable-speech-id';
    speech.title = '덕담/축사 복사본';
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    const original = { id: speech.id, title: speech.title };

    expect(ceremonyItemDisplayTitle(speech)).toBe('축사');
    expect({ id: speech.id, title: speech.title }).toEqual(original);
  });

  it('Owner와 MC가 같은 speech 표시명을 사용하고 복사본을 노출하지 않는다', () => {
    localStorage.clear();
    const draft = filledDraft();
    draft.lastStep = 3;
    const speech = moveItemFirst(draft, 'speech');
    speech.id = 'copy-owner-mc-speech';
    speech.title = '덕담/축사 복사본';
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    const storedTitle = speech.title;

    const ownerView = render(ownerPage(draft));
    expect(ownerView.container.textContent).toContain('축사');
    expect(ownerView.container.textContent).not.toContain('복사본');
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    expect(mcView.container.querySelector('.mc-now strong')?.textContent).toBe('축사');
    expect(mcView.container.textContent).not.toContain('복사본');
    expect(speech.title).toBe(storedTitle);
    mcView.unmount();
  });

  it('혼인서약·성혼선언 통합으로 번호가 바뀌어도 speech와 performance 의미를 ID/type으로 유지한다', () => {
    const draft = filledDraft();
    configureMcLedItems(draft, true, true);
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [{ id: 'combined-dance', type: 'dance', performerName: '무용팀', samePerformerAsPrevious: false, order: 0 }],
    };

    const result = generateScript(draft).ceremonySections;
    expect(result.find((item) => item.id === speech.id)?.title).toBe('축사');
    expect(result.find((item) => item.id === performance.id)?.title).toBe('축무');
    expect(result.filter((item) => item.title === '혼인서약 및 성혼선언')).toHaveLength(1);
    expect(result.some((item) => item.id === draft.items.find((item) => item.type === 'pronouncement')?.id)).toBe(false);
  });

  it('신부 단독입장은 신부 전용 Cue와 Note만 생성한다', () => {
    const draft = filledDraft();
    const bride = draft.items.find((item) => item.type === 'bride_entrance')!;
    bride.detailConfig = {
      ...bride.detailConfig,
      appearance: 'reveal_then_enter',
      escort: 'solo',
    };
    const result = section(draft, 'bride_entrance')!;

    expect(result.cue).toEqual(expect.arrayContaining([
      '신부 대기 확인',
      '신부 등장 장치 또는 문 오픈 방식 확인',
      '신부 입장곡 준비 확인',
      '신부 입장 Cue 확인',
    ]));
    expect(result.cue.join(' ')).not.toMatch(/아버님|동반자|인계/);
    expect(result.note.join(' ')).not.toMatch(/아버님|동반자|인계/);
  });

  it('신부 아버님 동반입장은 실제 동반자 Cue와 Note를 생성한다', () => {
    const draft = filledDraft();
    const bride = draft.items.find((item) => item.type === 'bride_entrance')!;
    bride.detailConfig = { ...bride.detailConfig, escort: 'father' };
    const result = section(draft, 'bride_entrance')!;

    expect(result.cue).toEqual(expect.arrayContaining([
      '신부·아버님 대기 확인',
      '아버님 보행 속도 확인',
      '인계 동작 확인',
      '동반 입장 Cue 확인',
    ]));
    expect(result.note.join(' ')).toContain('신부 아버님 보행 속도와 인계 동작');
  });

  it('직접 구성 입장은 특정 동반자를 추측하지 않고 중립 표현을 사용한다', () => {
    const draft = filledDraft();
    const bride = draft.items.find((item) => item.type === 'bride_entrance')!;
    bride.detailConfig = { ...bride.detailConfig, escort: 'custom' };
    const result = section(draft, 'bride_entrance')!;

    expect(result.narration).not.toContain('아버님');
    expect(result.cue).toContain('신부와 동반자 대기 확인');
    expect(result.cue.join(' ')).not.toContain('아버님');
    expect(result.note).toContain('동반자의 보행 속도와 인계 동작을 확인합니다.');
  });

  it('바로 입장은 등장 Cue를 제외하고 먼저 등장은 등장 Cue를 포함한다', () => {
    const draft = filledDraft();
    const bride = draft.items.find((item) => item.type === 'bride_entrance')!;
    bride.detailConfig = {
      ...bride.detailConfig,
      escort: 'solo',
      appearance: 'reveal_then_enter',
    };
    expect(section(draft, 'bride_entrance')?.cue).toContain('신부 등장 Cue 확인');
    bride.detailConfig = { ...bride.detailConfig, appearance: 'direct' };
    expect(section(draft, 'bride_entrance')?.cue).not.toContain('신부 등장 Cue 확인');
  });

  it('Owner 실시간 미리보기와 MC가 같은 신부 입장 Cue와 Note를 표시한다', () => {
    localStorage.clear();
    const draft = filledDraft();
    draft.lastStep = 3;
    const bride = moveItemFirst(draft, 'bride_entrance');
    bride.detailConfig = {
      ...bride.detailConfig,
      escort: 'solo',
      appearance: 'direct',
    };

    const ownerView = render(ownerPage(draft));
    const ownerText = ownerView.container.querySelector('.preview-panel')?.textContent ?? '';
    expect(ownerText).toContain('신부 대기 확인');
    expect(ownerText).toContain('신부 입장 동선과 Cue를 확인합니다.');
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    expect(mcView.container.querySelector('.mc-cue')?.textContent).toContain('신부 대기 확인');
    expect(mcView.container.querySelector('.mc-note')?.textContent).toContain('신부 입장 동선과 Cue를 확인합니다.');
    mcView.unmount();
  });

  it('혼인서약 소개 멘트를 기본 본문 앞에 한 번만 출력한다', () => {
    const draft = filledDraft();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    vows.customIntro = '두 분이 직접 준비한 서약을 소개합니다.';
    const narration = section(draft, 'vows')!.narration;

    expect(narration.startsWith(vows.customIntro)).toBe(true);
    expect(narration).toContain('다음은 두 사람이 사랑의 약속을 나누는 혼인서약 순서가 있겠습니다.');
    expect(narration.match(/두 분이 직접 준비한 서약을 소개합니다\./g)).toHaveLength(1);
  });

  it('혼인서약 소개 멘트 뒤에 override만 출력하고 기본 본문은 중복하지 않는다', () => {
    const draft = filledDraft();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    vows.customIntro = '사용자 소개 멘트';
    vows.narrationOverride = '사용자 수정 혼인서약 본문';
    const narration = section(draft, 'vows')!.narration;

    expect(narration).toBe('사용자 소개 멘트\n사용자 수정 혼인서약 본문');
    expect(narration).not.toContain('다음은 두 사람이 사랑의 약속을 나누는');
  });

  it('빈 혼인서약 소개 멘트는 최종 출력에 빈 문단을 만들지 않는다', () => {
    const draft = filledDraft();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    vows.customIntro = '   ';
    const narration = section(draft, 'vows')!.narration;

    expect(narration.startsWith('다음은 두 사람이 사랑의 약속을 나누는')).toBe(true);
    expect(narration).not.toContain('\n\n');
  });

  it('Owner 미리보기와 MC가 소개 멘트와 override를 같은 순서로 표시한다', () => {
    localStorage.clear();
    const draft = filledDraft();
    draft.lastStep = 3;
    const vows = moveItemFirst(draft, 'vows');
    vows.customIntro = '먼저 읽을 혼인서약 소개';
    vows.narrationOverride = '그다음 읽을 혼인서약 본문';

    const ownerView = render(ownerPage(draft));
    const ownerText = ownerView.container.querySelector('.preview-panel')?.textContent ?? '';
    expect(ownerText.indexOf(vows.customIntro)).toBeLessThan(ownerText.indexOf(vows.narrationOverride));
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    const mcText = mcView.container.querySelector('.mc-narration')?.textContent ?? '';
    expect(mcText.indexOf(vows.customIntro)).toBeLessThan(mcText.indexOf(vows.narrationOverride));
    mcView.unmount();
  });

  it('축사 소개 멘트를 기본 본문 앞에 원문 그대로 출력한다', () => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.customIntro = '신부의 오랜 친구가 준비한 축사를 소개합니다.';
    speech.participants = [{ id: 'speech-person', role: 'speaker', name: '김지우' }];
    const narration = section(draft, 'speech')!.narration;

    expect(narration.startsWith(speech.customIntro)).toBe(true);
    expect(narration).toContain('김지우');
    expect(narration.match(/신부의 오랜 친구가 준비한 축사를 소개합니다\./g)).toHaveLength(1);
  });

  it('모든 식순의 소개 멘트는 override 앞에 출력하고 기본 본문을 중복하지 않는다', () => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.customIntro = '축사 소개 원문';
    speech.narrationOverride = '축사 사용자 수정 본문';

    expect(section(draft, 'speech')?.narration).toBe('축사 소개 원문\n축사 사용자 수정 본문');
    expect(section(draft, 'speech')?.narration).not.toContain('축사를 진행해 주실');

    const opening = draft.items.find((item) => item.type === 'opening')!;
    const defaultOpeningNarration = section(draft, 'opening')!.narration;
    opening.customIntro = '   ';
    expect(section(draft, 'opening')?.narration).toBe(defaultOpeningNarration);
    expect(section(draft, 'opening')?.narration).not.toContain('\n\n');
  });

  it('축사 소개 멘트가 Owner 미리보기·최종 확인·MC에 동일하게 출력된다', () => {
    localStorage.clear();
    const draft = filledDraft();
    const speech = moveItemFirst(draft, 'speech');
    speech.customIntro = '세 화면에 표시할 축사 소개 멘트';
    speech.narrationOverride = '세 화면에 표시할 축사 본문';

    draft.lastStep = 3;
    const previewView = render(ownerPage(draft));
    expect(previewView.container.querySelector('.preview-panel')?.textContent).toContain(speech.customIntro);
    previewView.unmount();

    draft.lastStep = 5;
    const reviewView = render(ownerPage(draft));
    expect(reviewView.container.textContent).toContain(speech.customIntro);
    reviewView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    expect(mcView.container.querySelector('.mc-narration')?.textContent).toContain(speech.customIntro);
    mcView.unmount();
  });

  it('실시간 미리보기는 대본·진행 큐·주의사항을 별도 class로 구분한다', () => {
    const script = generateScript(filledDraft());
    const view = render(createElement(ScriptPreview, { script }));

    expect(view.container.querySelector('.script-preview-card .preview-narration')).toBeInTheDocument();
    expect(view.container.querySelector('.script-preview-card .preview-cue')).toBeInTheDocument();
    expect(view.container.querySelector('.script-preview-card .preview-note')).toBeInTheDocument();
    expect(view.container.querySelector('.preview-narration')?.classList.contains('preview-support')).toBe(false);
    view.unmount();
  });

  it('성혼선언자 정보가 없으면 특정 가족관계를 추측하지 않고 중립 표현을 사용한다', () => {
    const draft = filledDraft();
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'custom' };
    pronouncement.participants = [];
    const result = section(draft, 'pronouncement')!;

    expect(result.narration).toContain('성혼선언자께서');
    expect(result.narration).not.toMatch(/신랑 아버님|신부 아버님|신랑 어머님|신부 어머님/);
    expect(result.cue.join(' ')).not.toMatch(/신랑 아버님|신부 아버님/);
    expect(result.note.join(' ')).not.toMatch(/신랑 아버님|신부 아버님/);
  });

  it('명시적으로 선택하거나 입력한 성혼선언자 정보만 대본에 반영한다', () => {
    const draft = filledDraft();
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'groom_father' };
    pronouncement.participants = [];
    expect(section(draft, 'pronouncement')?.narration).toContain('신랑 아버님께서');

    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'custom' };
    pronouncement.participants = [{ id: 'relation-speaker', role: 'pronouncement_speaker', name: '', relation: '대학 은사' }];
    expect(section(draft, 'pronouncement')?.narration).toContain('대학 은사께서');

    pronouncement.participants = [{ ...pronouncement.participants[0], name: '김대표님' }];
    expect(section(draft, 'pronouncement')?.narration).toContain('김대표님께서');
    expect(section(draft, 'pronouncement')?.narration).not.toContain('대학 은사께서');
  });

  it('성혼선언자 입력값을 Owner 미리보기와 MC가 동일하게 사용한다', () => {
    localStorage.clear();
    const draft = filledDraft();
    draft.lastStep = 3;
    const pronouncement = moveItemFirst(draft, 'pronouncement');
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'custom' };
    pronouncement.participants = [{ id: 'owner-mc-pronouncer', role: 'pronouncement_speaker', name: '박대표님', relation: '직장 상사' }];

    const ownerView = render(ownerPage(draft));
    const ownerCard = ownerView.getByRole('heading', { name: '성혼선언' }).closest('article')!;
    expect(ownerCard.textContent).toContain('박대표님께서');
    expect(ownerCard.textContent).not.toContain('신랑 아버님');
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    advancePastChecklist(mcView);
    expect(mcView.container.querySelector('.mc-narration')?.textContent).toContain('박대표님께서');
    expect(mcView.container.querySelector('.mc-narration')?.textContent).not.toContain('신랑 아버님');
    mcView.unmount();
  });

  it('혼인서약·성혼선언 모두 사회자 진행이 아니면 기존 별도 식순을 유지한다', () => {
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, false, false);
    const result = generateScript(draft).ceremonySections;

    expect(result.find((item) => item.id === vows.id)?.title).toBe(vows.title);
    expect(result.some((item) => item.id === pronouncement.id)).toBe(true);
    expect(result.some((item) => item.title === '혼인서약 및 성혼선언')).toBe(false);
    expect(result.map((item) => item.narration).join('\n')).not.toContain('사회자가 진행합니다.');
  });

  it('혼인서약만 사회자 진행이면 승인 대본과 별도 성혼선언을 출력한다', () => {
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, true, false);
    const result = generateScript(draft).ceremonySections;

    expect(result.find((item) => item.id === vows.id)?.narration).toBe(mcLedVowsNarration);
    expect(result.some((item) => item.id === pronouncement.id)).toBe(true);
    expect(result.map((item) => item.narration).join('\n')).not.toContain('사회자가 진행합니다.');
  });

  it('성혼선언만 사회자 진행이면 승인 대본과 별도 혼인서약을 출력한다', () => {
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, false, true);
    const result = generateScript(draft).ceremonySections;

    expect(result.some((item) => item.id === vows.id)).toBe(true);
    expect(result.find((item) => item.id === pronouncement.id)?.narration).toBe(mcLedPronouncementNarration);
    expect(result.map((item) => item.narration).join('\n')).not.toContain('사회자가 진행합니다.');
  });

  it('둘 다 사회자 진행이면 승인된 통합 제목·대본을 한 번만 출력한다', () => {
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, true, true);
    const original = draft.items.map((item) => ({
      id: item.id,
      title: item.title,
      order: item.order,
      active: item.active,
      sourceId: sourceIdOf(item),
    }));
    const separateTopLevelCount = draft.items.filter((item) => item.active).length;
    const result = generateScript(draft).ceremonySections;
    const combined = result.find((item) => item.id === vows.id)!;

    expect(combined.title).toBe('혼인서약 및 성혼선언');
    expect(combined.narration).toBe(combinedVowsPronouncementNarration);
    expect(combined.narration).toContain('두 분에게 서약과 선언');
    expect(combined.narration).not.toContain('두 분의 서약과 선언');
    expect(result.some((item) => item.id === pronouncement.id)).toBe(false);
    expect(result.filter((item) => item.title === '혼인서약 및 성혼선언')).toHaveLength(1);
    expect(result.filter((item) => !item.parentId)).toHaveLength(separateTopLevelCount - 1);
    expect(draft.items.map((item) => ({
      id: item.id,
      title: item.title,
      order: item.order,
      active: item.active,
      sourceId: sourceIdOf(item),
    }))).toEqual(original);
  });

  it('통합 상태에서 Owner 미리보기와 최종 확인에 별도 성혼선언을 중복 표시하지 않는다', () => {
    const draft = filledDraft();
    configureMcLedItems(draft, true, true);

    draft.lastStep = 3;
    const previewView = render(ownerPage(draft));
    expect(previewView.getAllByRole('heading', { name: '혼인서약 및 성혼선언' })).toHaveLength(1);
    expect(previewView.queryByRole('heading', { name: '성혼선언' })).not.toBeInTheDocument();
    previewView.unmount();

    draft.lastStep = 5;
    const reviewView = render(ownerPage(draft));
    expect(reviewView.getAllByRole('heading', { name: '혼인서약 및 성혼선언' })).toHaveLength(1);
    expect(reviewView.queryByRole('heading', { name: '성혼선언' })).not.toBeInTheDocument();
    reviewView.unmount();
  });

  it('통합 계산은 직접 수정 대본을 보존하고 체크 해제 시 원본 두 식순을 복원한다', () => {
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, true, true);
    vows.customIntro = '혼인서약 소개';
    vows.narrationOverride = '혼인서약 직접 수정 대본';
    pronouncement.customIntro = '성혼선언 소개';
    pronouncement.narrationOverride = '성혼선언 직접 수정 대본';
    const stored = {
      vows: { id: vows.id, title: vows.title, sourceId: sourceIdOf(vows), narrationOverride: vows.narrationOverride },
      pronouncement: { id: pronouncement.id, title: pronouncement.title, sourceId: sourceIdOf(pronouncement), narrationOverride: pronouncement.narrationOverride },
    };

    const combined = generateScript(draft).ceremonySections.find((item) => item.id === vows.id)!;
    expect(combined.narration).toBe([
      '혼인서약 소개',
      '혼인서약 직접 수정 대본',
      '성혼선언 소개',
      '성혼선언 직접 수정 대본',
    ].join('\n'));

    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'groom_father' };
    pronouncement.participants = [{ id: 'pronouncer-restore', role: 'speaker', name: '신랑 아버님' }];
    const restored = generateScript(draft).ceremonySections;
    expect(restored.some((item) => item.id === vows.id)).toBe(true);
    expect(restored.some((item) => item.id === pronouncement.id)).toBe(true);
    expect({
      vows: { id: vows.id, title: vows.title, sourceId: sourceIdOf(vows), narrationOverride: vows.narrationOverride },
      pronouncement: { id: pronouncement.id, title: pronouncement.title, sourceId: sourceIdOf(pronouncement), narrationOverride: pronouncement.narrationOverride },
    }).toEqual(stored);
  });

  it('MC 실행 목록은 통합 식순을 한 번만 사용하고 완료·다음 동작을 유지한다', () => {
    localStorage.clear();
    const draft = filledDraft();
    const { vows, pronouncement } = configureMcLedItems(draft, true, true);
    moveItemFirst(draft, 'vows');
    const view = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));

    advancePastChecklist(view);
    expect(view.container.querySelector('.mc-now strong')?.textContent).toBe('혼인서약 및 성혼선언');
    expect(view.container.textContent?.match(/혼인서약 및 성혼선언/g)?.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(view.getByRole('button', { name: '완료' }));
    expect(view.container.querySelector('.mc-now strong')?.textContent).not.toBe('성혼선언');
    expect(generateScript(draft).ceremonySections.some((item) => item.id === pronouncement.id)).toBe(false);
    expect(draft.items.some((item) => item.id === vows.id)).toBe(true);
    expect(draft.items.some((item) => item.id === pronouncement.id)).toBe(true);
    view.unmount();
  });

  it('Owner와 MC에 읽기 전용 화면 용도 배지를 표시한다', () => {
    const draft = filledDraft();
    const ownerView = render(ownerPage(draft));
    const ownerBadge = ownerView.getByLabelText('현재 화면: 신랑·신부용');
    expect(ownerBadge).toHaveTextContent('신랑·신부용');
    expect(ownerBadge.closest('a, button')).toBeNull();
    ownerView.unmount();

    const mcView = render(createElement(MemoryRouter, null, createElement(McPrompterPage, { draft })));
    const mcBadge = mcView.getByLabelText('현재 화면: 사회자용');
    expect(mcBadge).toHaveTextContent('사회자용');
    expect(mcBadge.closest('a, button')).toBeNull();
    mcView.unmount();
  });

  it('예물교환 미진행은 대본과 child를 모두 제외하고 재진행 시 복원한다', () => {
    const draft = filledDraft();
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    rings.detailConfig.flowerChildEnabled = true;
    rings.detailConfig.flowerChild = { id: 'flower', role: 'flower_child', name: '서준', introText: '신랑의 조카' };
    rings.active = false;
    expect(generateScript(draft).ceremonySections.some((item) => item.id === rings.id)).toBe(false);
    expect(rings.detailConfig.flowerChild?.name).toBe('서준');
    rings.active = true;
    expect(section(draft, 'ring_exchange')?.narration).toContain('서준이 입장');
  });

  it('narrationOverride가 기본 대본보다 우선하고 요청사항은 note로 분리한다', () => {
    const draft = filledDraft();
    const opening = draft.items[0];
    opening.narrationOverride = '직접 입력한 개식사';
    opening.requestNote = '천천히 읽기';
    const result = section(draft, 'opening')!;
    expect(result.narration).toBe('직접 입력한 개식사');
    expect(result.narration).not.toContain('천천히 읽기');
    expect(result.note).toContain('천천히 읽기');
  });

  it('공연의 같은 사람/다른 사람과 축가/축무/축주 용어를 분기한다', () => {
    const draft = filledDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [
      { id: 'p1', type: 'song', performerName: '친구 민수', samePerformerAsPrevious: false, order: 0 },
      { id: 'p2', type: 'dance', performerName: '친구 민수', samePerformerAsPrevious: true, order: 1 },
      { id: 'p3', type: 'instrumental', performerName: '연주자 지우', samePerformerAsPrevious: false, order: 2 },
    ];
    const narration = section(draft, 'performance')!.narration;
    expect(narration).toContain('축가가 준비되었습니다');
    expect(narration).toContain('두 번째 축무');
    expect(narration).toContain('연주자 지우께서도');
    expect(narration).toContain('축주');
  });

  it('성혼선언자와 덕담자가 같으면 이어서 진행하고 중복 등단 문구를 쓰지 않는다', () => {
    const draft = filledDraft();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.detailConfig.sameAsPronouncement = true;
    speech.participants = [{ id: 'speaker', role: 'speaker', name: '김아버님' }];
    const narration = section(draft, 'speech')!.narration;
    expect(narration).toContain('이어서 김아버님께서');
    expect(narration).not.toContain('등단');
  });

  it('혼주 포옹 생략과 불참 설정을 반영한다', () => {
    const draft = filledDraft();
    const greeting = draft.items.find((item) => item.type === 'family_guest_greeting')!;
    greeting.detailConfig.brideFamilyAttendance = 'mother_only';
    greeting.detailConfig.groomFamilyAttendance = 'absent';
    greeting.detailConfig.omitBrideFamilyHug = true;
    const narration = section(draft, 'family_guest_greeting')!.narration;
    expect(narration).toContain('신부 어머님께 인사');
    expect(narration).not.toContain('신랑 부모님께');
    expect(narration).not.toContain('신부 어머님께서는 자리에서 일어나');
  });

  it('피로연 장소는 폐회식에만 나타난다', () => {
    const result = generateScript(filledDraft());
    const containing = result.ceremonySections.filter((item) => item.narration.includes('지하 1층 연회장'));
    expect(containing).toHaveLength(1);
    expect(containing[0].title).toBe('폐회식');
  });

  it('정렬 순서와 child 순서를 depth-first로 그대로 출력한다', () => {
    const draft = filledDraft();
    const candle = draft.items.find((item) => item.type === 'candle_lighting')!;
    candle.order = 0;
    draft.items.find((item) => item.type === 'opening')!.order = 1;
    candle.children = [...candle.children!].reverse().map((item, order) => ({ ...item, order }));
    const result = generateScript(draft).ceremonySections;
    expect(result[0].id).toBe(candle.id);
    expect(result[1].parentId).toBe(candle.id);
    expect(result[1].title).toBe('자리 이동');
  });

  it('Canonical 순서 복원 후에도 실제 order, ID, override와 inactive 정책을 유지한다', () => {
    const draft = filledDraft();
    const bow = draft.items.find((item) => item.type === 'couple_bow')!;
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    bow.narrationOverride = '직접 작성한 맞절 대본';
    rings.narrationOverride = '직접 작성한 예물교환 대본';
    rings.active = false;
    draft.items = restoreCanonicalOrder(
      [...draft.items].reverse().map((item, order) => ({ ...item, order })),
      draft.ceremonyType,
    );

    const result = generateScript(draft).ceremonySections;
    const topLevelIds = result
      .filter((item) => !item.parentId)
      .map((item) => item.id);
    const expectedIds = [...draft.items]
      .sort((a, b) => a.order - b.order)
      .filter((item) => item.active)
      .map((item) => item.id);

    expect(topLevelIds).toEqual(expectedIds);
    expect(result.find((item) => item.id === bow.id)?.narration).toBe(
      '직접 작성한 맞절 대본',
    );
    expect(result.some((item) => item.id === rings.id)).toBe(false);
    expect(rings.narrationOverride).toBe('직접 작성한 예물교환 대본');
  });

  it('MC 읽기 전용 화면은 Owner의 실제 정렬 순서를 그대로 사용한다', () => {
    const draft = filledDraft();
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    draft.items = [rings, ...draft.items.filter((item) => item.id !== rings.id)]
      .map((item, order) => ({ ...item, order }));
    const view = render(
      createElement(
        MemoryRouter,
        null,
        createElement(McPrompterPage, { draft }),
      ),
    );

    fireEvent.click(view.getByRole('button', { name: '완료' }));
    fireEvent.click(view.getByRole('button', { name: '완료' }));
    fireEvent.click(view.getByRole('button', { name: '완료' }));

    expect(view.container.querySelector('.mc-now strong')?.textContent).toBe('예물교환');
    expect(view.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('자유 식순은 승인되지 않은 기본 대본을 생성하지 않는다', () => {
    const draft = filledDraft('custom');
    const custom: CeremonyItem = { id: 'custom-1', type: 'custom', title: '우리만의 순서', order: 0, active: true, detailConfig: { description: '설명' }, useDefaultNarration: false, narrationOverride: '' };
    draft.items = [custom];
    expect(generateScript(draft).ceremonySections[0].narration).toBe('');
    custom.narrationOverride = '직접 작성한 대본';
    expect(generateScript(draft).ceremonySections[0].narration).toBe('직접 작성한 대본');
  });
});
