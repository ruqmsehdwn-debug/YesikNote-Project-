import { describe, expect, it } from 'vitest';
import { createDraft } from '../data/ceremonyTemplates';
import { buildCeremonyProjection } from '../services/ceremonyProjection';
import { buildCeremonyReviewRows } from '../services/ceremonyReview';
import { generateScript } from '../services/scriptEngine';

describe('buildCeremonyReviewRows', () => {
  it('성혼선언 주체와 Script Engine의 Cue·Note를 같은 안정 ID로 연결한다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.detailConfig.speakerMode = 'groom_mother';
    declaration.participants = [{
      id: 'speaker',
      role: 'pronouncement_speaker',
      name: '',
      displayTitle: '신랑 어머님',
    }];
    declaration.cueOverride = ['성혼선언자 마이크 준비'];
    declaration.requestNote = '신랑 어머님 위치 확인';
    const script = generateScript(draft);
    const projection = buildCeremonyProjection(draft, script);

    const row = buildCeremonyReviewRows(draft, projection, script)
      .find((candidate) => candidate.sourceId === declaration.id)!;

    expect(row.summary).toBe('신랑 어머님 진행');
    expect(row.details).toContainEqual({ label: '진행자', value: '신랑 어머님' });
    expect(row.cues).toContain('성혼선언자 마이크 준비');
    expect(row.notes).toContain('신랑 어머님 위치 확인');
  });

  it('공연 카드 순서와 관계 문장을 입력값 변경 없이 줄 단위로 정리한다', () => {
    const draft = createDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [
      {
        id: 'performance-2',
        type: 'song',
        performerName: '홍건우',
        performerRelation: '신랑님의고등학교친구',
        title: '빵빠레',
        samePerformerAsPrevious: false,
        order: 1,
      },
      {
        id: 'performance-1',
        type: 'dance',
        performerName: '친구 팀',
        performerRelation: '신부 친구',
        title: '축무',
        samePerformerAsPrevious: false,
        order: 0,
      },
    ];
    const original = structuredClone(draft);
    const script = generateScript(draft);
    const projection = buildCeremonyProjection(draft, script);

    const row = buildCeremonyReviewRows(draft, projection, script)
      .find((candidate) => candidate.sourceId === performance.id)!;

    expect(row.details).toEqual(expect.arrayContaining([
      { label: '공연 1 종류', value: '축무' },
      { label: '공연 2 곡명·공연명', value: '빵빠레' },
      { label: '공연 2 관계', value: '신랑 고등학교 동창' },
    ]));
    expect(draft).toEqual(original);
  });

  it('active=false 항목과 직접 수정 대본을 변경하거나 자동 결과로 덮어쓰지 않는다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    const speech = draft.items.find((item) => item.type === 'speech')!;
    declaration.active = false;
    declaration.narrationOverride = '보존할 미진행 직접 대본';
    speech.narrationOverride = '사용자가 직접 수정한 덕담 대본';
    const original = structuredClone(draft);
    const script = generateScript(draft);
    const projection = buildCeremonyProjection(draft, script);
    const rows = buildCeremonyReviewRows(draft, projection, script);

    expect(rows.some((row) => row.sourceId === declaration.id)).toBe(false);
    expect(script.ceremonySections.find((section) => section.id === speech.id)?.narration)
      .toContain('사용자가 직접 수정한 덕담 대본');
    expect(draft).toEqual(original);
  });

  it('기본 Cue는 표시 전용으로 두 개까지 간소화하고 사용자 Cue 원본은 보존한다', () => {
    const draft = createDraft();
    const groom = draft.items.find((item) => item.type === 'groom_entrance')!;
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.cueOverride = ['사용자 Cue 1', '사용자 Cue 2', '사용자 Cue 3'];
    const original = structuredClone(draft);
    const script = generateScript(draft);
    const projection = buildCeremonyProjection(draft, script);
    const rows = buildCeremonyReviewRows(draft, projection, script);

    expect(rows.find((row) => row.sourceId === groom.id)?.cues).toEqual([
      '입장곡 준비',
      '입장곡 시작 → 신랑 입장',
    ]);
    expect(rows.find((row) => row.sourceId === declaration.id)?.cues).toEqual([
      '사용자 Cue 1',
      '사용자 Cue 2',
      '사용자 Cue 3',
    ]);
    expect(draft).toEqual(original);
  });
});
