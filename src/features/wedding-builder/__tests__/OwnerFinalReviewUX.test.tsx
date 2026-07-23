import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraft } from '../data/ceremonyTemplates';
import { OwnerBuilderPage } from '../pages/OwnerBuilderPage';

function renderOwner(lastStep = 5, onSaveNow = vi.fn(() => true)) {
  const draft = createDraft();
  draft.lastStep = lastStep;
  return render(
    <MemoryRouter>
      <OwnerBuilderPage
        draft={draft}
        setDraft={() => undefined}
        saveStatus="saved"
        lastSavedAt={null}
        onSaveNow={onSaveNow}
        compositionHandlers={{
          onCompositionStart: () => undefined,
          onCompositionEnd: () => undefined,
        }}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Owner 최종 확인 UX', () => {
  it('확인 필요 통합 요약과 기본 목록을 표시하고 6열 표는 기본 노출하지 않는다', () => {
    const view = renderOwner();

    expect(view.getByRole('heading', { name: /확인이 필요한 항목 \d+개/ })).toBeInTheDocument();
    expect(view.getByRole('button', { name: '한 번에 확인하기' })).toBeInTheDocument();
    expect(view.getByRole('list', { name: '최종 식순 간단 목록' })).toBeInTheDocument();
    expect(view.queryByRole('table')).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /신랑·신부 행진.*확인 필요 1/ })).toBeInTheDocument();
  });

  it('현장 비고는 개수와 확인 필요 개수를 표시한 채 기본 접힘이다', () => {
    const view = renderOwner();
    const summary = view.getByText(/현장 비고 \d+개 · 확인 필요 \d+개/);
    const details = summary.closest('details')!;

    expect(details).not.toHaveAttribute('open');
    expect(view.getByText('예식 당일 확인할 진행 메모입니다.')).toBeInTheDocument();
  });

  it('한 번에 확인하기는 첫 미입력 항목의 정확한 입력칸으로 이동한다', () => {
    const view = renderOwner();

    fireEvent.click(view.getByRole('button', { name: '한 번에 확인하기' }));

    const weddingDate = view.container.querySelector('[data-basic-field="weddingDate"]');
    expect(weddingDate).toBeInTheDocument();
    expect(weddingDate).toHaveFocus();
  });

  it('수동 저장 성공과 식순 순서 변경만 완료 토스트로 알린다', () => {
    const onSaveNow = vi.fn(() => true);
    const saveView = renderOwner(5, onSaveNow);
    fireEvent.click(saveView.getByRole('button', { name: '저장' }));
    expect(saveView.getByRole('status')).toHaveTextContent('저장 완료');
    saveView.unmount();

    const orderView = renderOwner(3);
    fireEvent.click(orderView.getAllByRole('button', { name: '아래로 이동' })[0]);
    expect(orderView.getByText('식순 순서 변경 완료').closest('[role="status"]')).toBeInTheDocument();
  });
});
