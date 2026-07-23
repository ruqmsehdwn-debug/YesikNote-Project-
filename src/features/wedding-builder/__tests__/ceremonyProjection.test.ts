import { describe, expect, it } from 'vitest';
import { createDraft } from '../data/ceremonyTemplates';
import { buildCeremonyProjection } from '../services/ceremonyProjection';

describe('buildCeremonyProjection', () => {
  it('성혼선언 주체를 체크표와 MC 대본 힌트에 같은 값으로 연결한다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.detailConfig.speakerMode = 'groom_mother';
    declaration.participants = [{
      id: 'declaration-speaker',
      role: 'pronouncement_speaker',
      name: '',
      displayTitle: '신랑 어머님',
    }];

    const projection = buildCeremonyProjection(draft);
    const checklistItem = projection.venueChecklistItems
      .find((item) => item.sourceId === declaration.id);
    const mcHint = projection.mcScriptHints
      .find((item) => item.sourceId === declaration.id);

    expect(projection.declaration).toEqual(expect.objectContaining({
      active: true,
      participant: '신랑 어머님',
      status: 'known',
    }));
    expect(checklistItem?.summary).toContain('신랑 어머님');
    expect(mcHint).toEqual(expect.objectContaining({
      participant: '신랑 어머님',
    }));
  });

  it('축가 공연 카드 2개를 두 곡 요약과 공연 상세로 보존한다', () => {
    const draft = createDraft();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [
      {
        id: 'song-1',
        type: 'song',
        performerName: '축가자 A',
        performerRelation: '친구',
        title: '첫 번째 곡',
        samePerformerAsPrevious: false,
        order: 0,
      },
      {
        id: 'song-2',
        type: 'song',
        performerName: '축가자 B',
        performerRelation: '가족',
        title: '두 번째 곡',
        samePerformerAsPrevious: false,
        order: 1,
      },
    ];

    const projection = buildCeremonyProjection(draft);
    const checklistItem = projection.venueChecklistItems
      .find((item) => item.sourceId === performance.id);

    expect(projection.performance.songCount).toBe(2);
    expect(projection.performance.items).toEqual([
      expect.objectContaining({ sourceId: 'song-1', title: '첫 번째 곡' }),
      expect.objectContaining({ sourceId: 'song-2', title: '두 번째 곡' }),
    ]);
    expect(checklistItem?.summary).toContain('축가 2곡');
    expect(checklistItem?.summary).toContain('첫 번째 곡');
    expect(checklistItem?.summary).toContain('두 번째 곡');
    expect(projection.sourceWarnings).toContain(
      '축가 곡 수는 현재 별도 수량 필드가 없어 축가 공연 카드 수로 계산했습니다.',
    );
  });

  it('active=false 항목은 체크표와 MC 힌트에서 제외하고 경고로 남긴다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.active = false;
    declaration.detailConfig.speakerMode = 'groom_mother';

    const projection = buildCeremonyProjection(draft);

    expect(projection.declaration).toEqual(expect.objectContaining({
      active: false,
      summary: '미진행',
    }));
    expect(projection.venueChecklistItems.some(
      (item) => item.sourceId === declaration.id,
    )).toBe(false);
    expect(projection.mcScriptHints.some(
      (item) => item.sourceId === declaration.id,
    )).toBe(false);
    expect(projection.sourceWarnings).toContain(
      `미진행 항목 제외: ${declaration.title} (${declaration.id})`,
    );
    expect(projection.sourceWarnings).toContain(
      '정책 확인 필요: 성혼선언을 체크표에서 숨길지 ‘미진행’으로 표시할지 확정되지 않았습니다.',
    );
  });

  it('Projection 생성 과정에서 입력 Draft를 변경하지 않는다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.participants = [{
      id: 'declaration-speaker',
      role: 'pronouncement_speaker',
      name: '',
      displayTitle: '신랑 어머님',
    }];
    const originalDraft = structuredClone(draft);

    buildCeremonyProjection(draft);

    expect(draft).toEqual(originalDraft);
  });
});
