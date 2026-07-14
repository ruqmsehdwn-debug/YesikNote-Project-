import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createDraft, restoreCanonicalOrder } from '../data/ceremonyTemplates';
import type { CeremonyDraft, CeremonyItem } from '../models/ceremony';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';
import { ceremonyItemDisplayTitle, generateScript } from '../services/scriptEngine';
import { McPrompterPage } from '../../mc-prompter/pages/McPrompterPage';

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
