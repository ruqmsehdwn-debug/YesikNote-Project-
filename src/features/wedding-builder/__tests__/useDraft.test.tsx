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
});
