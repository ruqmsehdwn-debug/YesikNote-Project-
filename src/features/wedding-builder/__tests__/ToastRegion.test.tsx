import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastRegion } from '../components/ToastRegion';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ToastRegion', () => {
  it('완료 알림을 aria-live 상태로 표시하고 자동으로 닫는다', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const view = render(
      <ToastRegion
        message={{ id: 1, text: '저장 완료' }}
        onDismiss={onDismiss}
      />,
    );

    expect(view.getByRole('status')).toHaveTextContent('저장 완료');
    expect(view.getByRole('status').parentElement).toHaveAttribute('aria-live', 'polite');
    vi.advanceTimersByTime(2499);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('알림이 없을 때 오류나 확인 필요 정보를 토스트로 만들지 않는다', () => {
    const view = render(<ToastRegion onDismiss={() => undefined} />);
    expect(view.queryByRole('status')).not.toBeInTheDocument();
  });
});
