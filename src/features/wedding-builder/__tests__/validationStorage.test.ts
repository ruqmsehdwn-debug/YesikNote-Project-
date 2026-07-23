import { act, createElement } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ItemDetailEditor } from '../components/ItemDetailEditor';
import {
  createCandleChildren,
  createCustomItem,
  createDraft,
} from '../data/ceremonyTemplates';
import { completionRate, validateDraft } from '../services/draftValidator';
import { ceremonyItemDisplayTitle, generateScript } from '../services/scriptEngine';
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
  it('공연자 오류는 안정 ID와 field를 보유하고 정확한 공연 카드 입력칸을 강조·focus한다', () => {
    vi.useFakeTimers();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });

    try {
      const draft = completeBasic();
      const performance = draft.items.find((item) => item.type === 'performance')!;
      performance.detailConfig.performances = [{
        id: 'performance-focus-target',
        type: 'song',
        performerName: '',
        title: '축가 제목',
        samePerformerAsPrevious: false,
        order: 0,
      }];
      const issue = validateDraft(draft).find((candidate) => candidate.id.includes('performance-focus-target-performer'))!;
      expect(issue).toEqual(expect.objectContaining({
        itemId: performance.id,
        ceremonyItemId: performance.id,
        performanceId: 'performance-focus-target',
        section: 'performances',
        field: 'performerName',
      }));

      const onChange = vi.fn();
      const view = render(createElement(ItemDetailEditor, {
        item: performance,
        onChange,
        performanceFocusTarget: {
          section: issue.section,
          performanceId: issue.performanceId,
          field: issue.field,
          requestId: 1,
        },
      }));
      const performerInput = view.getByLabelText('축가자');
      const card = view.container.querySelector('[data-performance-id="performance-focus-target"]')!;

      expect(document.activeElement).toBe(performerInput);
      expect(card).toHaveClass('performance-target');
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(2000));
      expect(card).not.toHaveClass('performance-target');
    } finally {
      cleanup();
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
      vi.useRealTimers();
    }
  });

  it('공연이 비어 있으면 공연 parent 안정 ID와 추가 버튼 field를 제공한다', () => {
    const draft = completeBasic();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [];
    expect(validateDraft(draft)).toContainEqual(expect.objectContaining({
      id: `${performance.id}-performance-empty`,
      itemId: performance.id,
      ceremonyItemId: performance.id,
      section: 'performances',
      field: 'performances',
    }));
  });

  it('공연이 비어 있으면 공연 설정 영역으로 이동하고 공연 추가 버튼에 focus한다', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });

    try {
      const draft = completeBasic();
      const performance = draft.items.find((item) => item.type === 'performance')!;
      performance.detailConfig.performances = [];
      const issue = validateDraft(draft).find((candidate) => candidate.id === `${performance.id}-performance-empty`)!;
      const view = render(createElement(ItemDetailEditor, {
        item: performance,
        onChange: vi.fn(),
        performanceFocusTarget: {
          section: issue.section,
          field: issue.field,
          requestId: 3,
        },
      }));

      expect(document.activeElement).toBe(view.getByRole('button', { name: '첫 공연 추가' }));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      view.unmount();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
    }
  });

  it('곡명 오류는 정확한 공연 카드의 곡명 입력칸을 강조하고 focus한다', () => {
    vi.useFakeTimers();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });

    try {
      const draft = completeBasic();
      const performance = draft.items.find((item) => item.type === 'performance')!;
      performance.detailConfig.performances = [{
        id: 'performance-title-target',
        type: 'dance',
        performerName: '테스트 무용팀',
        title: '',
        samePerformerAsPrevious: false,
        order: 0,
      }];
      const issue = validateDraft(draft).find((candidate) => candidate.id.endsWith('performance-title-target-title'))!;

      expect(issue).toEqual(expect.objectContaining({
        ceremonyItemId: performance.id,
        performanceId: 'performance-title-target',
        section: 'performances',
        field: 'title',
      }));

      const view = render(createElement(ItemDetailEditor, {
        item: performance,
        onChange: vi.fn(),
        performanceFocusTarget: {
          section: issue.section,
          performanceId: issue.performanceId,
          field: issue.field,
          requestId: 2,
        },
      }));
      const titleInput = view.getByLabelText('곡명/공연명');
      const card = view.container.querySelector('[data-performance-id="performance-title-target"]')!;

      expect(document.activeElement).toBe(titleInput);
      expect(card).toHaveClass('performance-target');
      act(() => vi.advanceTimersByTime(2000));
      expect(card).not.toHaveClass('performance-target');
    } finally {
      cleanup();
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
      vi.useRealTimers();
    }
  });

  it('최종 확인의 공연 오류는 순서나 제목이 아니라 안정 ID로 공연 식순과 카드에 이동한다', () => {
    const originalWindowScrollTo = window.scrollTo;
    const originalElementScrollTo = HTMLElement.prototype.scrollTo;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });

    try {
      const draft = completeBasic();
      draft.lastStep = 5;
      const performance = draft.items.find((item) => item.type === 'performance')!;
      const speech = draft.items.find((item) => item.type === 'speech')!;
      performance.order = 0;
      speech.order = draft.items.length + 3;
      performance.detailConfig.performances = [
        { id: 'performance-valid-first', type: 'song', performerName: '첫 공연자', title: '첫 축가', samePerformerAsPrevious: false, order: 0 },
        { id: 'performance-invalid-second', type: 'instrumental', performerName: '두 번째 연주자', title: '', samePerformerAsPrevious: false, order: 1 },
      ];
      draft.items = [
        performance,
        ...draft.items.filter((item) => item.id !== performance.id && item.id !== speech.id),
        speech,
      ].map((item, order) => ({ ...item, order }));

      const view = render(createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'saved',
        lastSavedAt: null,
        compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
      })));
      const issueMessage = view.getByText('곡명 또는 공연명을 입력해 주세요.');
      const issueRow = issueMessage.closest('div')!;

      expect(within(issueRow).getByText('축가/축주')).toBeInTheDocument();
      expect(within(issueRow).queryByText(/덕담|축사/)).not.toBeInTheDocument();
      fireEvent.click(within(issueRow).getByRole('button', { name: '바로 수정' }));

      expect(view.getByRole('combobox', { name: '식순 선택' })).toHaveValue(performance.id);
      const targetCard = view.container.querySelector('[data-performance-id="performance-invalid-second"]')!;
      const titleInput = targetCard.querySelector('[data-performance-field="title"]');
      expect(targetCard).toHaveClass('performance-target');
      expect(document.activeElement).toBe(titleInput);
      expect(view.container.querySelector('[data-ceremony-item-id="' + performance.id + '"]')).toBeInTheDocument();
    } finally {
      cleanup();
      Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalWindowScrollTo });
      if (originalElementScrollTo) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: originalElementScrollTo });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
      }
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
    }
  });

  it.each([
    ['song', '축가'],
    ['dance', '축무'],
    ['instrumental', '축주'],
  ] as const)('%s 오류는 speech가 아닌 공연 parent 안정 ID를 가리킨다', (type, displayTitle) => {
    const draft = completeBasic();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    const speech = draft.items.find((item) => item.type === 'speech')!;
    performance.detailConfig.performances = [{
      id: `performance-${type}-error`,
      type,
      performerName: '',
      title: `${displayTitle} 제목`,
      samePerformerAsPrevious: false,
      order: 0,
    }];

    const issue = validateDraft(draft).find((candidate) => candidate.performanceId === `performance-${type}-error`)!;
    expect(ceremonyItemDisplayTitle(performance)).toBe(displayTitle);
    expect(issue).toEqual(expect.objectContaining({
      itemId: performance.id,
      ceremonyItemId: performance.id,
      performanceId: `performance-${type}-error`,
      section: 'performances',
      field: 'performerName',
    }));
    expect(issue.ceremonyItemId).not.toBe(speech.id);
  });

  it('미진행 공연은 검증과 Script 출력에서 제외하고 입력값은 그대로 보존한다', () => {
    const draft = completeBasic();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.active = false;
    performance.narrationOverride = '보존할 직접 공연 대본';
    performance.detailConfig.performances = [{
      id: 'inactive-performance-data',
      type: 'song',
      performerName: '',
      title: '',
      samePerformerAsPrevious: false,
      order: 0,
    }];

    expect(validateDraft(draft).some((issue) => issue.itemId === performance.id)).toBe(false);
    expect(generateScript(draft).ceremonySections.some((section) => section.id === performance.id)).toBe(false);
    expect(performance.detailConfig.performances?.[0]?.id).toBe('inactive-performance-data');
    expect(performance.narrationOverride).toBe('보존할 직접 공연 대본');
  });

  it('저장 버튼은 자동 저장 상태를 표시하고 한글 조합 대기 중에도 즉시 저장할 수 있다', () => {
    const draft = completeBasic();
    const onSaveNow = vi.fn();
    const view = render(createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
      draft,
      setDraft: vi.fn(),
      saveStatus: 'saved',
      lastSavedAt: '2026-07-16T03:04:00.000Z',
      onSaveNow,
      compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
    })));

    expect(view.getByText(/자동 저장됨 ·/)).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: '저장' }));
    expect(onSaveNow).toHaveBeenCalledTimes(1);

    view.rerender(createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
      draft,
      setDraft: vi.fn(),
      saveStatus: 'saving',
      lastSavedAt: null,
      onSaveNow,
      compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
    })));
    expect(view.getByText('저장 중…')).toBeInTheDocument();
    expect(view.getByRole('button', { name: '저장' })).toBeEnabled();

    view.rerender(createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
      draft,
      setDraft: vi.fn(),
      saveStatus: 'failed',
      lastSavedAt: null,
      onSaveNow,
      compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
    })));
    expect(view.getByText('저장하지 못했어요')).toBeInTheDocument();
    expect(view.getByRole('button', { name: '다시 저장' })).toBeEnabled();
    view.unmount();
  });

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
    const selector = view.getByRole('group', { name: '덕담·축사 구분' });

    expect(within(selector).getByRole('button', { name: '덕담' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(selector).getByRole('button', { name: '축사' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(selector).queryByRole('button', { name: '축가' })).not.toBeInTheDocument();
    expect(view.getByRole('textbox', { name: '덕담자 이름 또는 호칭' })).toBeInTheDocument();
    expect(view.getByRole('textbox', { name: /신랑·신부와의 관계/ })).toHaveAttribute(
      'placeholder',
      '예: 신랑 아버지, 신부 어머니, 신랑 측 회사 대표',
    );
    expect(view.getByText('이름 또는 관계를 입력하면 선택한 내용에 맞춰 사회자가 읽을 소개 문장을 자동으로 만들어요.')).toHaveClass(
      'speech-participant-help',
      'full',
    );
    expect(view.queryByText('자동 소개 문장과 사회자 참고정보에만 사용됩니다.')).not.toBeInTheDocument();
    fireEvent.click(within(selector).getByRole('button', { name: '축사' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      id: speech.id,
      detailConfig: expect.objectContaining({ speechType: 'congratulatory' }),
    }));
    view.unmount();

    speech.detailConfig = { ...speech.detailConfig, speechType: 'congratulatory' };
    const congratulatoryView = render(createElement(ItemDetailEditor, { item: speech, onChange: vi.fn() }));
    expect(congratulatoryView.getByRole('textbox', { name: '축사자 이름 또는 호칭' })).toHaveAttribute('placeholder', '예: 이동주, 김예식');
    expect(congratulatoryView.getByRole('textbox', { name: /신랑·신부와의 관계/ })).toHaveAttribute(
      'placeholder',
      '예: 신부의 고등학교 친구, 신랑의 직장 동료',
    );
    congratulatoryView.unmount();
  });

  it('소개 문장 설정은 기존 customIntro로 자동·직접·생략 모드를 표현한다', () => {
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: speech, onChange }));
    const editor = within(view.container);

    expect(editor.getByRole('group', { name: '소개 문장 설정' })).toBeInTheDocument();
    expect(editor.getByRole('radio', { name: '자동 생성' })).toBeChecked();
    expect(editor.getByText('이름 또는 호칭을 입력하면 완성된 소개 문장을 자동으로 만들어요.')).toBeInTheDocument();
    expect(editor.getByRole('checkbox', { name: '예식노트 기본 대본 사용' })).toBeInTheDocument();
    expect(editor.getByRole('textbox', { name: /기본 대본 전체 바꾸기/ })).toBeInTheDocument();

    fireEvent.click(editor.getByRole('radio', { name: '직접 입력' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ customIntro: ' ' }));

    view.rerender(createElement(ItemDetailEditor, { item: { ...speech, customIntro: ' ' }, onChange }));
    expect(editor.getByRole('radio', { name: '직접 입력' })).toBeChecked();
    expect(editor.getByRole('textbox', { name: /소개 문장 직접 입력/ })).toBeInTheDocument();
    expect(editor.getByText('사회자가 실제로 읽을 완성된 문장으로 작성해 주세요.')).toBeInTheDocument();

    fireEvent.click(editor.getByRole('radio', { name: '소개 생략' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ customIntro: '없음' }));
    view.unmount();
  });

  it('기존 없음 소개 값은 생략 UI로 해석하되 Draft 원본을 다시 쓰지 않는다', () => {
    localStorage.clear();
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    speech.customIntro = '없음';
    saveDraft(draft);

    const restored = loadDraft()!;
    const restoredSpeech = restored.items.find((item) => item.id === speech.id)!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: restoredSpeech, onChange }));
    const editor = within(view.container);

    expect(editor.getByRole('radio', { name: '소개 생략' })).toBeChecked();
    expect(editor.queryByRole('textbox', { name: /소개 문장 직접 입력/ })).not.toBeInTheDocument();
    expect(restoredSpeech.customIntro).toBe('없음');
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).schemaVersion).toBe(DRAFT_SCHEMA_VERSION);
    expect(onChange).not.toHaveBeenCalled();
    view.unmount();
  });

  it('성혼선언자 정보 불러오기는 실제 정보가 있을 때만 표시하고 기존 participant로 복사한다', () => {
    const draft = completeBasic();
    const speech = draft.items.find((item) => item.type === 'speech')!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, { item: speech, onChange }));

    expect(view.queryByRole('checkbox', { name: /성혼선언자 정보 불러오기/ })).not.toBeInTheDocument();

    const pronouncementParticipant = {
      id: 'pronouncement-source',
      role: 'pronouncement_speaker',
      name: '김대표님',
      relation: '신랑의 직장 상사',
    };
    view.rerender(createElement(ItemDetailEditor, {
      item: speech,
      onChange,
      pronouncementParticipant,
    }));

    const importCheckbox = view.getByRole('checkbox', { name: /성혼선언자 정보 불러오기/ });
    expect(view.getByText('성혼선언자에 입력한 이름과 관계를 불러옵니다.')).toBeInTheDocument();
    fireEvent.click(importCheckbox);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      detailConfig: expect.objectContaining({ sameAsPronouncement: true }),
      participants: [expect.objectContaining({
        name: '김대표님',
        relation: '신랑의 직장 상사',
      })],
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

    expect(view.getByText('공연 1 · 축가')).toBeInTheDocument();
    expect(view.getByRole('textbox', { name: '축가자' })).toHaveAttribute('placeholder', '예: 이동주, 김예식');
    expect(view.getByRole('textbox', { name: '신랑·신부와의 관계' })).toHaveAttribute('placeholder', '예: 신랑의 고등학교 친구');
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

  it.each([
    ['song', '축가를 불러 주실 분을 알려주세요.'],
    ['dance', '축무를 선보일 분을 알려주세요.'],
    ['instrumental', '축주를 연주해 주실 분을 알려주세요.'],
  ] as const)('%s 공연은 이름과 관계가 모두 없을 때만 참여자 오류를 표시한다', (type, message) => {
    const draft = completeBasic();
    const performance = draft.items.find((item) => item.type === 'performance')!;
    performance.detailConfig.performances = [{
      id: `participant-${type}`,
      type,
      performerName: '',
      performerRelation: '신랑의 고등학교 친구',
      title: '공연명',
      samePerformerAsPrevious: false,
      order: 0,
    }];

    expect(validateDraft(draft).some((issue) => issue.id.endsWith('-performer'))).toBe(false);
    performance.detailConfig.performances[0].performerRelation = '';
    expect(validateDraft(draft)).toContainEqual(expect.objectContaining({
      id: `${performance.id}-participant-${type}-performer`,
      field: 'performerName',
      message,
    }));
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

  it.each([
    ['weddingDate', '예식일을 입력해 주세요.'],
    ['groomName', '신랑 이름을 입력해 주세요.'],
    ['brideName', '신부 이름을 입력해 주세요.'],
    ['banquetLocation', '피로연 장소를 입력해 주세요.'],
  ] as const)('기본정보 %s 오류의 바로 수정은 1단계 정확한 입력칸으로 이동한다', (field, message) => {
    const draft = completeBasic();
    draft.basicInfo[field] = '';
    draft.lastStep = 5;
    const view = render(
      createElement(MemoryRouter, null, createElement(OwnerBuilderPage, {
        draft,
        setDraft: vi.fn(),
        saveStatus: 'saved',
        lastSavedAt: null,
        compositionHandlers: { onCompositionStart: vi.fn(), onCompositionEnd: vi.fn() },
      })),
    );

    const issueRow = view.getByText(message).closest('div')!;
    fireEvent.click(within(issueRow).getByRole('button', { name: '바로 수정' }));
    const input = view.container.querySelector(`[data-basic-field="${field}"]`);
    expect(input).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
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
        title: '축가 제목',
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

    expect(view.getAllByText(/필수 작성은 완료됐습니다/).length).toBeGreaterThan(0);
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

  it('기존 주례 인물 구조에 직함 또는 관계를 저장한다', () => {
    const draft = createDraft('officiant');
    const officiant = draft.items.find((item) => item.type === 'officiant_entrance')!;
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, {
      item: officiant,
      onChange,
    }));

    fireEvent.change(view.getByLabelText('직함 또는 관계'), {
      target: { value: '대학 은사' },
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      id: officiant.id,
      participants: [
        expect.objectContaining({
          role: 'officiant',
          relation: '대학 은사',
        }),
      ],
    }));
  });

  it('미진행 안내에서 작성값을 유지한 채 다시 진행할 수 있다', () => {
    const draft = createDraft();
    const vow = draft.items.find((item) => item.type === 'vows')!;
    const inactiveVow = {
      ...vow,
      active: false,
      customIntro: '보관할 직접 소개',
      participants: [{
        id: 'saved-reader',
        role: 'vow_reader',
        name: '보관된 낭독자',
      }],
    };
    const onChange = vi.fn();
    const view = render(createElement(ItemDetailEditor, {
      item: inactiveVow,
      onChange,
    }));

    expect(view.getByText('이 식순은 진행하지 않아요')).toBeInTheDocument();
    expect(view.getByText(/작성한 내용은 보관/)).toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: '다시 진행하기' }));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      id: inactiveVow.id,
      active: true,
      customIntro: '보관할 직접 소개',
      participants: inactiveVow.participants,
    }));
  });

  it('한글 받침에 따라 조사를 자연스럽게 선택한다', () => {
    expect(withParticle('서준', ['이', '가'])).toBe('서준이');
    expect(withParticle('하나', ['이', '가'])).toBe('하나가');
    expect(withParticle('민석', ['을', '를'])).toBe('민석을');
    expect(withParticle('지우', ['을', '를'])).toBe('지우를');
  });
});
