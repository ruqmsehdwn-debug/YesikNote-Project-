import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDraft } from '../hooks/useDraft';
import { DRAFT_STORAGE_KEY } from '../storage/draftStorage';

describe('useDraft IME-safe autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('한글 조합 중에는 저장하지 않고 조합 종료 1초 후 저장한다', async () => {
    const { result } = renderHook(() => useDraft());
    await act(async () => {
      result.current.onCompositionStart();
      result.current.setDraft((draft) => ({
        ...draft,
        basicInfo: { ...draft.basicInfo, groomName: '김도윤' },
      }));
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    await act(async () => {
      result.current.onCompositionEnd();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).draft.basicInfo.groomName).toBe('김도윤');
  });

  it('브라우저가 compositionend를 늦게 보내도 focus를 벗어나지 않고 마지막 한글 값을 저장한다', async () => {
    const { result } = renderHook(() => useDraft());
    await act(async () => {
      result.current.onCompositionStart();
      result.current.setDraft((draft) => ({
        ...draft,
        basicInfo: { ...draft.basicInfo, groomName: 'QA신랑' },
      }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(result.current.saveStatus).toBe('saved');
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).draft.basicInfo.groomName).toBe('QA신랑');
  });

  it('빠르게 여러 번 입력해도 debounce 후 마지막 값을 저장한다', async () => {
    const { result } = renderHook(() => useDraft());
    await act(async () => {
      result.current.setDraft((draft) => ({ ...draft, basicInfo: { ...draft.basicInfo, groomName: '김' } }));
      result.current.setDraft((draft) => ({ ...draft, basicInfo: { ...draft.basicInfo, groomName: '김도' } }));
      result.current.setDraft((draft) => ({ ...draft, basicInfo: { ...draft.basicInfo, groomName: '김도윤' } }));
    });

    expect(result.current.saveStatus).toBe('saving');
    await act(async () => vi.advanceTimersByTimeAsync(999));
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(1));

    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.lastSavedAt).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).draft.basicInfo.groomName).toBe('김도윤');
  });

  it('지금 저장은 debounce를 기다리지 않고 같은 key에 즉시 저장한다', async () => {
    const { result } = renderHook(() => useDraft());
    await act(async () => {
      result.current.setDraft((draft) => ({ ...draft, basicInfo: { ...draft.basicInfo, brideName: '이하나' } }));
    });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    act(() => result.current.saveNow());

    const stored = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(stored.schemaVersion).toBe(2);
    expect(stored.draft.basicInfo.brideName).toBe('이하나');
    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.lastSavedAt).toBe(stored.savedAt);
  });

  it('지금 저장 실패 시 화면 입력과 기존 저장본을 보존한다', async () => {
    const previous = '{"existing":true}';
    localStorage.setItem(DRAFT_STORAGE_KEY, previous);
    const { result } = renderHook(() => useDraft());
    await act(async () => {
      result.current.setDraft((draft) => ({ ...draft, basicInfo: { ...draft.basicInfo, groomName: '보존할 이름' } }));
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });

    act(() => result.current.saveNow());

    expect(result.current.saveStatus).toBe('failed');
    expect(result.current.draft.basicInfo.groomName).toBe('보존할 이름');
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBe(previous);
    setItem.mockRestore();
  });

  it('저장된 Draft는 hook을 다시 열어도 공연·순서·active·직접 대본을 복원한다', async () => {
    const first = renderHook(() => useDraft());
    await act(async () => {
      first.result.current.setDraft((draft) => {
        const items = draft.items.map((item, order) => item.type === 'performance'
          ? {
              ...item,
              active: false,
              order: 0,
              narrationOverride: '직접 수정한 공연 대본',
              detailConfig: {
                ...item.detailConfig,
                performances: [{ id: 'saved-performance', type: 'song' as const, performerName: '테스트 팀', title: '테스트 곡', samePerformerAsPrevious: false, order: 0 }],
              },
            }
          : { ...item, order: order + 1 });
        const speech = items.find((item) => item.type === 'speech');
        if (speech) speech.customIntro = '저장할 소개 문장';
        return {
          ...draft,
          basicInfo: { ...draft.basicInfo, globalRequestNote: '저장할 전체 요청사항' },
          items,
        };
      });
    });
    act(() => first.result.current.saveNow());
    first.unmount();

    const reopened = renderHook(() => useDraft());
    const performance = reopened.result.current.draft.items.find((item) => item.type === 'performance')!;
    expect(performance.active).toBe(false);
    expect(performance.order).toBe(0);
    expect(performance.narrationOverride).toBe('직접 수정한 공연 대본');
    expect(performance.detailConfig.performances?.[0]).toEqual(expect.objectContaining({ id: 'saved-performance', title: '테스트 곡' }));
    expect(reopened.result.current.draft.basicInfo.globalRequestNote).toBe('저장할 전체 요청사항');
    expect(reopened.result.current.draft.items.find((item) => item.type === 'speech')?.customIntro).toBe('저장할 소개 문장');
  });
});
