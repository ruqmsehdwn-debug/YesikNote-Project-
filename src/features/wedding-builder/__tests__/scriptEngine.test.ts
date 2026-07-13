import { describe, expect, it } from 'vitest';
import { createDraft } from '../data/ceremonyTemplates';
import type { CeremonyDraft, CeremonyItem } from '../models/ceremony';
import { generateScript } from '../services/scriptEngine';

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

  it('자유 식순은 승인되지 않은 기본 대본을 생성하지 않는다', () => {
    const draft = filledDraft('custom');
    const custom: CeremonyItem = { id: 'custom-1', type: 'custom', title: '우리만의 순서', order: 0, active: true, detailConfig: { description: '설명' }, useDefaultNarration: false, narrationOverride: '' };
    draft.items = [custom];
    expect(generateScript(draft).ceremonySections[0].narration).toBe('');
    custom.narrationOverride = '직접 작성한 대본';
    expect(generateScript(draft).ceremonySections[0].narration).toBe('직접 작성한 대본');
  });
});
