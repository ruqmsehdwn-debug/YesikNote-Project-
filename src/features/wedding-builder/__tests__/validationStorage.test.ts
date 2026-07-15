import { createElement } from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ItemDetailEditor } from '../components/ItemDetailEditor';
import {
  createCandleChildren,
  createCustomItem,
  createDraft,
} from '../data/ceremonyTemplates';
import { completionRate, validateDraft } from '../services/draftValidator';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';
import {
  DRAFT_BACKUP_STORAGE_KEY,
  DRAFT_SCHEMA_VERSION,
  DRAFT_STORAGE_KEY,
  loadDraft,
  saveDraft,
} from '../storage/draftStorage';
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
  it('기존 Owner Builder의 5단계 화면을 유지한다', () => {
    const draft = completeBasic();
    const view = render(
      createElement(
        MemoryRouter,
        null,
        createElement(OwnerBuilderPage, {
          draft,
          setDraft: vi.fn(),
          saveStatus: 'saved',
          lastSavedAt: null,
          compositionHandlers: {
            onCompositionStart: vi.fn(),
            onCompositionEnd: vi.fn(),
          },
        }),
      ),
    );

    const stepNavigation = view.getByRole('navigation', { name: '작성 단계' });
    expect(within(stepNavigation).getAllByRole('button')).toHaveLength(5);
    expect(within(stepNavigation).getByText('예식 기본정보')).toBeInTheDocument();
    expect(within(stepNavigation).getByText('최종 확인')).toBeInTheDocument();
  });

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

  it('복제된 speech의 Validation 메시지에도 사용자 표시명만 사용한다', () => {
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.id = 'copy-validation-speech';
    speech.title = '덕담/축사 복사본';
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };

    const messages = validateDraft(draft)
      .filter((issue) => issue.itemId === speech.id)
      .map((issue) => issue.message);

    expect(messages).toContain('축사 소개 대상의 이름 또는 호칭을 입력해 주세요.');
    expect(messages.join(' ')).not.toContain('복사본');
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
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(
      DRAFT_SCHEMA_VERSION,
    );
    expect(loadDraft()?.items.find((item) => item.type === 'candle_lighting')?.children?.[0].order).toBe(5);
  });

  it('혼인서약 소개 멘트를 저장하고 Draft 복원 후에도 유지한다', () => {
    const draft = completeBasic();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    vows.customIntro = '복원할 혼인서약 소개 멘트';

    saveDraft(draft);

    expect(loadDraft()?.items.find((item) => item.id === vows.id)?.customIntro).toBe(
      '복원할 혼인서약 소개 멘트',
    );
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(
      DRAFT_SCHEMA_VERSION,
    );
  });

  it('축사 소개 멘트 원문을 같은 Draft key와 schema로 저장·복원한다', () => {
    localStorage.clear();
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.customIntro = '저장하고 복원할 축사 소개 멘트 원문';

    saveDraft(draft);
    const restored = loadDraft()!;

    expect(restored.items.find((item) => item.id === speech.id)?.customIntro).toBe(
      '저장하고 복원할 축사 소개 멘트 원문',
    );
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(
      DRAFT_SCHEMA_VERSION,
    );
  });

  it('혼인서약·성혼선언 사회자 진행 조합과 원본 데이터를 저장·복원한다', () => {
    localStorage.clear();
    const draft = completeBasic();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    vows.detailConfig = { ...vows.detailConfig, mode: 'mc' };
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'mc' };
    vows.customIntro = '저장할 혼인서약 소개';
    vows.narrationOverride = '저장할 혼인서약 직접 대본';
    pronouncement.customIntro = '저장할 성혼선언 소개';
    pronouncement.narrationOverride = '저장할 성혼선언 직접 대본';
    const originals = {
      vows: {
        id: vows.id,
        title: vows.title,
        sourceId: (vows as typeof vows & { sourceId?: string }).sourceId,
        order: vows.order,
      },
      pronouncement: {
        id: pronouncement.id,
        title: pronouncement.title,
        sourceId: (pronouncement as typeof pronouncement & { sourceId?: string }).sourceId,
        order: pronouncement.order,
      },
    };

    saveDraft(draft);
    const restored = loadDraft()!;
    const restoredVows = restored.items.find((item) => item.id === vows.id)!;
    const restoredPronouncement = restored.items.find((item) => item.id === pronouncement.id)!;

    expect(restoredVows.detailConfig.mode).toBe('mc');
    expect(restoredPronouncement.detailConfig.speakerMode).toBe('mc');
    expect(restoredVows.customIntro).toBe(vows.customIntro);
    expect(restoredVows.narrationOverride).toBe(vows.narrationOverride);
    expect(restoredPronouncement.customIntro).toBe(pronouncement.customIntro);
    expect(restoredPronouncement.narrationOverride).toBe(pronouncement.narrationOverride);
    expect({
      vows: {
        id: restoredVows.id,
        title: restoredVows.title,
        sourceId: (restoredVows as typeof restoredVows & { sourceId?: string }).sourceId,
        order: restoredVows.order,
      },
      pronouncement: {
        id: restoredPronouncement.id,
        title: restoredPronouncement.title,
        sourceId: (restoredPronouncement as typeof restoredPronouncement & { sourceId?: string }).sourceId,
        order: restoredPronouncement.order,
      },
    }).toEqual(originals);
  });

  it('통합 출력에서 숨겨진 성혼선언은 미결정 수에 포함하지 않고 해제 시 복원한다', () => {
    const draft = completeBasic();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    vows.detailConfig = { ...vows.detailConfig, mode: 'mc' };
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'mc' };
    pronouncement.useDefaultNarration = false;
    pronouncement.narrationOverride = '';
    pronouncement.participants = [{ id: 'hidden-empty-person', role: 'speaker', name: '' }];

    expect(validateDraft(draft).filter((issue) => issue.itemId === pronouncement.id)).toHaveLength(0);

    vows.detailConfig = { ...vows.detailConfig, mode: 'together' };
    expect(validateDraft(draft).filter((issue) => issue.itemId === pronouncement.id).length).toBeGreaterThan(0);
    expect(pronouncement.useDefaultNarration).toBe(false);
    expect(pronouncement.participants[0].id).toBe('hidden-empty-person');
  });

  it('기존 혼인서약 상세 설정 필드로 사회자 진행 상태를 독립 저장한다', () => {
    const draft = completeBasic();
    const vows = draft.items.find((item) => item.type === 'vows')!;
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: vows, onChange }));

    fireEvent.click(view.getByRole('checkbox', { name: '혼인서약 사회자 진행' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: vows.id,
      detailConfig: expect.objectContaining({ mode: 'mc' }),
    }));
    expect(pronouncement.detailConfig.speakerMode).toBe('mc');
    expect(vows.detailConfig.mode).toBe('together');
  });

  it('말하기 식순은 기존 speechType으로 덕담과 축사만 선택한다', () => {
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: speech, onChange }));
    const select = view.getByRole('combobox', { name: '말하기 종류' });

    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['덕담', '축사']);
    expect(within(select).queryByRole('option', { name: '축가' })).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'congratulatory' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: speech.id,
      detailConfig: expect.objectContaining({ speechType: 'congratulatory' }),
    }));
    view.unmount();
  });

  it('공연 식순은 기존 performances type으로 축가·축무·축주만 선택한다', () => {
    const draft = completeBasic();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [{ id: 'performance-choice', type: 'song', performerName: '공연자', samePerformerAsPrevious: false, order: 0 }],
    };
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: performance, onChange }));
    const select = view.getByRole('combobox', { name: '공연 종류' });

    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['축가', '축무', '축주']);
    expect(within(select).queryByRole('option', { name: '덕담' })).not.toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: '축사' })).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'instrumental' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: performance.id,
      detailConfig: expect.objectContaining({
        performances: [expect.objectContaining({ id: 'performance-choice', type: 'instrumental' })],
      }),
    }));
    view.unmount();
  });

  it('성혼선언자 입력은 중립 label과 기존 participant 필드를 재사용한다', () => {
    const draft = completeBasic();
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'custom' };
    pronouncement.participants = [];
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: pronouncement, onChange }));

    expect(view.getByRole('combobox', { name: '성혼선언 진행 방식' })).toBeInTheDocument();
    expect(view.getByRole('textbox', { name: '성혼선언자 이름 또는 호칭' })).toHaveAttribute(
      'placeholder',
      '비어 있으면 선택한 관계 호칭을 사용합니다.',
    );
    const relationInput = view.getByRole('textbox', { name: '신랑·신부와의 관계' });
    fireEvent.change(relationInput, { target: { value: '대학 은사' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: pronouncement.id,
      participants: [expect.objectContaining({ role: 'pronouncement_speaker', relation: '대학 은사' })],
    }));
    view.unmount();
  });

  it('speechType·공연 유형·성혼선언자 입력을 같은 Draft schema로 저장·복원한다', () => {
    localStorage.clear();
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    const pronouncement = draft.items.find((item) => item.type === 'pronouncement')!;
    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [{ id: 'stored-performance', type: 'dance', performerName: '무용팀', samePerformerAsPrevious: false, order: 0 }],
    };
    pronouncement.detailConfig = { ...pronouncement.detailConfig, speakerMode: 'custom' };
    pronouncement.participants = [{ id: 'stored-pronouncer', role: 'pronouncement_speaker', name: '박대표님', relation: '직장 상사' }];

    saveDraft(draft);
    const restored = loadDraft()!;

    expect(restored.items.find((item) => item.id === speech.id)?.detailConfig.speechType).toBe('congratulatory');
    expect(restored.items.find((item) => item.id === performance.id)?.detailConfig.performances?.[0]).toEqual(
      expect.objectContaining({ id: 'stored-performance', type: 'dance' }),
    );
    expect(restored.items.find((item) => item.id === pronouncement.id)?.participants?.[0]).toEqual(
      expect.objectContaining({ id: 'stored-pronouncer', name: '박대표님', relation: '직장 상사' }),
    );
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(DRAFT_SCHEMA_VERSION);
  });

  it('작성 시작 전에는 사용자용 1단계 안내 문구를 표시한다', () => {
    const draft = createDraft();
    draft.lastStep = 5;
    const view = render(
      createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'idle',
        lastSavedAt: null,
        compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
      })),
    );

    expect(view.getByText('필수 입력을 모두 완료하면 사회자용 대본을 확인할 수 있어요.')).toBeInTheDocument();
    expect(view.queryByText(/차단 항목|MC 읽기 화면/)).not.toBeInTheDocument();
    view.unmount();
  });

  it('작성 진행 중에는 실제 남은 필수 입력 개수를 안내한다', () => {
    const draft = createDraft();
    draft.basicInfo.weddingDate = '2026-10-17';
    draft.lastStep = 5;
    const remainingCount = validateDraft(draft).filter((issue) => issue.severity === 'blocking').length;
    const view = render(
      createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'idle',
        lastSavedAt: null,
        compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
      })),
    );

    expect(view.getByText(`사회자용 대본을 확인하려면 필수 입력 ${remainingCount}개를 더 완료해 주세요.`)).toBeInTheDocument();
    view.unmount();
  });

  it('작성 완료 후 완료 안내와 사회자용 대본 열기 링크만 표시한다', () => {
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const performance = draft.items.find((item) => item.type === 'performance')!;
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    speech.participants = [{ id: 'speech-complete', role: 'speaker', name: '김지우' }];
    performance.detailConfig = {
      ...performance.detailConfig,
      performances: [{
        id: 'performance-complete',
        type: 'song',
        performerName: '이민수',
        samePerformerAsPrevious: false,
        order: 0,
      }],
    };
    rings.detailConfig = { ...rings.detailConfig, flowerChildEnabled: false };
    draft.lastStep = 5;
    expect(validateDraft(draft).filter((issue) => issue.severity === 'blocking')).toHaveLength(0);
    const view = render(
      createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'saved',
        lastSavedAt: null,
        compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
      })),
    );

    expect(view.getByText('준비가 완료되었습니다. 사회자용 대본을 확인해 보세요.')).toBeInTheDocument();
    expect(view.getByRole('link', { name: '사회자용 대본 열기' })).toBeInTheDocument();
    expect(view.queryByText(/필수 입력 \d+개를 더 완료/)).not.toBeInTheDocument();
    view.unmount();
  });

  it.each([
    ['no_officiant', 11, 13, 'parents_a'],
    ['officiant', 13, 15, 'parents_b'],
  ] as const)(
    'schema 1의 구형 %s %i개 Draft를 ID와 입력 손실 없이 %i개로 보완한다',
    (ceremonyType, legacyCount, canonicalCount, candleMode) => {
      const draft = createDraft(ceremonyType);
      draft.templateVersion = 'v0.1.0';
      const opening = draft.items.find((item) => item.type === 'opening')!;
      const candle = draft.items.find((item) => item.type === 'candle_lighting')!;
      const custom = createCustomItem(draft.items.length);
      opening.narrationOverride = '보존할 직접 대본';
      opening.requestNote = '보존할 요청사항';
      opening.cueOverride = ['보존할 진행 큐'];
      opening.detailConfig = { ...opening.detailConfig, legacyValue: '보존할 상세 설정' };
      opening.active = false;
      candle.detailConfig = { ...candle.detailConfig, mode: candleMode };
      candle.children = createCandleChildren(candle.id, candleMode)
        .reverse()
        .map((child, order) => ({ ...child, order, requestNote: `child-${child.type}` }));
      const legacyMissingChildTypes = candleMode === 'parents_a'
        ? ['candle_bride_mother_light', 'candle_mothers_seat']
        : ['candle_bride_parents_light', 'candle_parents_seat'];
      candle.children = candle.children
        .filter((child) => !legacyMissingChildTypes.includes(child.type))
        .map((child, order) => ({ ...child, order }));
      const originalChildIds = new Set(candle.children.map((child) => child.id));
      const originalChildIdOrder = candle.children.map((child) => child.id);
      const originalChildNotes = new Map(
        candle.children.map((child) => [child.id, child.requestNote]),
      );
      draft.items = [
        ...draft.items.filter(
          (item) => !['couple_bow', 'ring_exchange'].includes(item.type),
        ),
        custom,
      ].map((item, order) => ({ ...item, order }));
      const originalIds = new Set(draft.items.map((item) => item.id));
      const originalIdOrder = draft.items.map((item) => item.id);
      expect(draft.items.filter((item) => item.type !== 'custom')).toHaveLength(legacyCount);

      const legacyEnvelope = {
        schemaVersion: 1,
        templateVersion: draft.templateVersion,
        savedAt: '2026-01-01T00:00:00.000Z',
        draft,
      };
      const rawLegacy = JSON.stringify(legacyEnvelope);
      localStorage.setItem(DRAFT_STORAGE_KEY, rawLegacy);

      const migrated = loadDraft()!;
      const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!);
      const migratedOpening = migrated.items.find((item) => item.type === 'opening')!;
      const migratedCandle = migrated.items.find((item) => item.type === 'candle_lighting')!;

      expect(stored.schemaVersion).toBe(DRAFT_SCHEMA_VERSION);
      expect(stored.migratedAt).toBeTruthy();
      expect(localStorage.getItem(DRAFT_BACKUP_STORAGE_KEY)).toBe(rawLegacy);
      expect(migrated.items.filter((item) => item.type !== 'custom')).toHaveLength(canonicalCount);
      expect(migrated.items.filter((item) => item.type === 'couple_bow')).toHaveLength(1);
      expect(migrated.items.filter((item) => item.type === 'ring_exchange')).toHaveLength(1);
      const migratedBowId = migrated.items.find((item) => item.type === 'couple_bow')!.id;
      const migratedRingId = migrated.items.find((item) => item.type === 'ring_exchange')!.id;
      expect(migratedBowId).toMatch(/^couple-bow-/);
      expect(migratedRingId).toMatch(/^ring-exchange-/);
      expect(migrated.items.some((item) => item.id === custom.id)).toBe(true);
      originalIds.forEach((id) => expect(migrated.items.some((item) => item.id === id)).toBe(true));
      expect(
        migrated.items.filter((item) => originalIds.has(item.id)).map((item) => item.id),
      ).toEqual(originalIdOrder);
      expect(migratedOpening.id).toBe(opening.id);
      expect(migratedOpening.narrationOverride).toBe('보존할 직접 대본');
      expect(migratedOpening.requestNote).toBe('보존할 요청사항');
      expect(migratedOpening.cueOverride).toEqual(['보존할 진행 큐']);
      expect(migratedOpening.detailConfig.legacyValue).toBe('보존할 상세 설정');
      expect(migratedOpening.active).toBe(false);
      expect(migratedCandle.children).toHaveLength(candleMode === 'parents_a' ? 8 : 7);
      originalChildIds.forEach((id) =>
        expect(migratedCandle.children?.some((child) => child.id === id)).toBe(true),
      );
      originalChildIds.forEach((id) =>
        expect(migratedCandle.children?.find((child) => child.id === id)?.requestNote)
          .toBe(originalChildNotes.get(id)),
      );
      legacyMissingChildTypes.forEach((type) =>
        expect(migratedCandle.children?.filter((child) => child.type === type)).toHaveLength(1),
      );
      expect(
        migratedCandle.children
          ?.filter((child) => originalChildIds.has(child.id))
          .map((child) => child.id),
      ).toEqual(originalChildIdOrder);
      expect(migratedCandle.children?.every((child) => child.parentId === candle.id)).toBe(true);
      expect(migratedCandle.children?.map((child) => child.order)).toEqual(
        Array.from({ length: candleMode === 'parents_a' ? 8 : 7 }, (_, index) => index),
      );
      const reloaded = loadDraft()!;
      expect(reloaded.items.find((item) => item.type === 'couple_bow')?.id).toBe(migratedBowId);
      expect(reloaded.items.find((item) => item.type === 'ring_exchange')?.id).toBe(migratedRingId);
    },
  );

  it('schema 1의 현재 13/15 Draft는 내용 변경 없이 schema만 안전하게 기록한다', () => {
    const draft = completeBasic();
    const rings = draft.items.find((item) => item.type === 'ring_exchange')!;
    rings.narrationOverride = '현재 Draft의 직접 대본';
    rings.detailConfig.flowerChildEnabled = true;
    rings.detailConfig.flowerChild = {
      id: 'existing-flower-child',
      role: 'flower_child',
      name: '서준',
    };
    const rawCurrentSchema1 = JSON.stringify({
      schemaVersion: 1,
      templateVersion: draft.templateVersion,
      savedAt: '2026-01-01T00:00:00.000Z',
      draft,
    });
    localStorage.setItem(DRAFT_STORAGE_KEY, rawCurrentSchema1);

    expect(loadDraft()).toEqual(draft);
    expect(localStorage.getItem(DRAFT_BACKUP_STORAGE_KEY)).toBe(rawCurrentSchema1);
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(
      DRAFT_SCHEMA_VERSION,
    );
  });

  it('최신 schema Draft는 저장소를 다시 쓰지 않는 no-op으로 복원한다', () => {
    const draft = completeBasic();
    const envelope = {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      templateVersion: draft.templateVersion,
      savedAt: '2026-01-01T00:00:00.000Z',
      draft,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(envelope));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    expect(loadDraft()).toEqual(draft);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('안전하게 해석할 수 없는 구형 child가 있으면 원본 Draft를 덮어쓰지 않는다', () => {
    const draft = completeBasic();
    draft.templateVersion = 'v0.1.0';
    draft.items = draft.items.filter(
      (item) => !['couple_bow', 'ring_exchange'].includes(item.type),
    );
    const candle = draft.items.find((item) => item.type === 'candle_lighting')!;
    candle.detailConfig.mode = 'parents_a';
    candle.children = [{
      id: 'legacy-combined-child',
      parentId: candle.id,
      type: 'legacy_combined_lighting',
      title: '기존 통합 점화',
      order: 0,
      active: true,
      detailConfig: { description: '삭제하면 안 되는 입력' },
      useDefaultNarration: false,
      narrationOverride: '기존 대본',
    }];
    const rawLegacy = JSON.stringify({
      schemaVersion: 1,
      templateVersion: draft.templateVersion,
      savedAt: '2026-01-01T00:00:00.000Z',
      draft,
    });
    localStorage.setItem(DRAFT_STORAGE_KEY, rawLegacy);

    expect(loadDraft()).toEqual(draft);
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBe(rawLegacy);
    expect(localStorage.getItem(DRAFT_BACKUP_STORAGE_KEY)).toBeNull();
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
