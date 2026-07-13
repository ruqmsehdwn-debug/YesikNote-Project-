import { useCallback, useEffect, useRef, useState } from 'react';
import { createDraft } from '../data/ceremonyTemplates';
import type { CeremonyDraft, SaveStatus } from '../models/ceremony';
import { loadDraft, saveDraft } from '../storage/draftStorage';

export function useDraft() {
  const [draft, setDraftState] = useState<CeremonyDraft>(() => loadDraft() ?? createDraft());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const composing = useRef(false);
  const [compositionVersion, setCompositionVersion] = useState(0);
  const initialized = useRef(false);

  const setDraft = useCallback(
    (update: CeremonyDraft | ((previous: CeremonyDraft) => CeremonyDraft)) => {
      setDraftState((previous) => {
        const next = typeof update === 'function' ? update(previous) : update;
        return { ...next, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    if (composing.current) return;
    setSaveStatus('saving');
    const timeout = window.setTimeout(() => {
      try {
        const savedAt = saveDraft(draft);
        setLastSavedAt(savedAt);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('failed');
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [draft, compositionVersion]);

  const onCompositionStart = () => {
    composing.current = true;
  };

  const onCompositionEnd = () => {
    composing.current = false;
    setCompositionVersion((value) => value + 1);
  };

  return {
    draft,
    setDraft,
    saveStatus,
    lastSavedAt,
    onCompositionStart,
    onCompositionEnd,
  };
}
