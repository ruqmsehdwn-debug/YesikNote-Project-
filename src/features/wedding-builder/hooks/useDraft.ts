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
  const autosaveTimeout = useRef<number | null>(null);
  const saving = useRef(false);

  const setDraft = useCallback(
    (update: CeremonyDraft | ((previous: CeremonyDraft) => CeremonyDraft)) => {
      setDraftState((previous) => {
        const next = typeof update === 'function' ? update(previous) : update;
        return { ...next, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const saveNow = useCallback(() => {
    if (saving.current) return;
    if (autosaveTimeout.current !== null) {
      window.clearTimeout(autosaveTimeout.current);
      autosaveTimeout.current = null;
    }
    saving.current = true;
    setSaveStatus('saving');
    try {
      const savedAt = saveDraft(draft);
      setLastSavedAt(savedAt);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('failed');
    } finally {
      saving.current = false;
    }
  }, [draft]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    setSaveStatus('saving');
    autosaveTimeout.current = window.setTimeout(() => {
      saving.current = true;
      try {
        const savedAt = saveDraft(draft);
        setLastSavedAt(savedAt);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('failed');
      } finally {
        saving.current = false;
        autosaveTimeout.current = null;
      }
    }, composing.current ? 2000 : 1000);
    return () => {
      if (autosaveTimeout.current !== null) {
        window.clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = null;
      }
    };
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
    saveNow,
    onCompositionStart,
    onCompositionEnd,
  };
}
