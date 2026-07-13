import { describe, expect, it } from 'vitest';
import { createCustomItem, createDraft } from '../data/ceremonyTemplates';
import { completionRate, validateDraft } from '../services/draftValidator';
import { DRAFT_STORAGE_KEY, loadDraft, saveDraft } from '../storage/draftStorage';
import { withParticle } from '../utils/koreanParticle';

function completeBasic() {
  const draft = createDraft();
  draft.basicInfo.weddingDate = '2026-10-17';
  draft.basicInfo.groomName = '김도윤';
  draft.basicInfo.brideName = '이하나';
  draft.basicInfo.banquetLocation = '연회장';
  return draft;
}

describe('validation and storage', () => {
  it('자유 식순의 제목·설명·MC 대본을 필수 검증한다', () => {
    const draft = completeBasic();
    draft.ceremonyType = 'custom';
    draft.items = [createCustomItem(0)];
    const messages = validateDraft(draft).map((issue) => issue.message);
    expect(messages).toContain('자유 식순의 설명을 입력해 주세요.');
    expect(messages).toContain('자유 식순의 MC 대본을 입력해 주세요.');
  });

  it('미진행 예물교환은 Validation과 작성률에서 제외한다', () => {
    const draft = completeBasic();
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    rings.active = false;
    rings.detailConfig.flowerChildEnabled = true;
    rings.detailConfig.flowerChild = { id: 'flower', role: 'flower_child', name: '' };
    expect(validateDraft(draft).some((issue) => issue.itemId === rings.id)).toBe(false);
    expect(completionRate(draft)).toBe(100);
  });

  it('비권장 핵심 순서는 차단이 아니라 warning이다', () => {
    const draft = completeBasic();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    vows.order = rings.order + 1;
    rings.order = vows.order - 2;
    const issue = validateDraft(draft).find((item) => item.id === 'recommended-core-order');
    expect(issue?.severity).toBe('warning');
  });

  it('draft envelope를 저장하고 중첩 순서를 복원한다', () => {
    const draft = completeBasic();
    const candle = draft.items.find((item) => item.type === 'candle_lighting')!;
    candle.children![0].order = 5;
    const savedAt = saveDraft(draft);
    expect(savedAt).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(1);
    expect(loadDraft()?.items.find((item) => item.type === 'candle_lighting')?.children?.[0].order).toBe(5);
  });

  it('손상된 저장 데이터는 입력 상태로 사용하지 않는다', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, '{broken');
    expect(loadDraft()).toBeNull();
  });

  it('한글 받침에 따라 조사를 자연스럽게 선택한다', () => {
    expect(withParticle('서준', ['이', '가'])).toBe('서준이');
    expect(withParticle('하나', ['이', '가'])).toBe('하나가');
    expect(withParticle('민석', ['을', '를'])).toBe('민석을');
    expect(withParticle('지우', ['을', '를'])).toBe('지우를');
  });
});
