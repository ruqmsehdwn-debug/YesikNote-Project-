import { useEffect } from 'react';

export type ToastMessage = {
  id: number;
  text: string;
};

export function ToastRegion({
  message,
  onDismiss,
}: {
  message?: ToastMessage;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 2500);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {message && (
        <div className="app-toast" role="status">
          <span aria-hidden="true">✓</span>
          <strong>{message.text}</strong>
          <button type="button" onClick={onDismiss} aria-label="알림 닫기">×</button>
        </div>
      )}
    </div>
  );
}
