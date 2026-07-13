import type { CeremonyDraft } from '../models/ceremony';

export const DRAFT_STORAGE_KEY = 'yesiknote:owner-builder:draft:v1';
export const MC_STORAGE_KEY = 'yesiknote:mc-prompter:state:v1';

type StoredDraftEnvelope = {
  schemaVersion: 1;
  templateVersion: string;
  savedAt: string;
  draft: CeremonyDraft;
};

export function saveDraft(draft: CeremonyDraft): string {
  const savedAt = new Date().toISOString();
  const envelope: StoredDraftEnvelope = {
    schemaVersion: 1,
    templateVersion: draft.templateVersion,
    savedAt,
    draft: { ...draft, updatedAt: savedAt },
  };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  return savedAt;
}

export function loadDraft(): CeremonyDraft | null {
  const value = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!value) return null;
  try {
    const envelope = JSON.parse(value) as StoredDraftEnvelope;
    if (envelope.schemaVersion !== 1 || !envelope.draft?.items) return null;
    return envelope.draft;
  } catch {
    return null;
  }
}

export type McPrompterState = {
  draftId: string;
  currentSectionId?: string;
  completedSectionIds: string[];
  theme: 'light' | 'dark';
  fontScale: 'small' | 'medium' | 'large' | 'xlarge';
  scrollLocked: boolean;
};

export function loadMcState(draftId: string): McPrompterState {
  try {
    const value = localStorage.getItem(MC_STORAGE_KEY);
    const parsed = value ? (JSON.parse(value) as McPrompterState) : null;
    if (parsed?.draftId === draftId) return parsed;
  } catch {
    // 손상된 UI 설정은 안전한 기본값으로 복원합니다.
  }
  return {
    draftId,
    completedSectionIds: [],
    theme: 'dark',
    fontScale: 'large',
    scrollLocked: false,
  };
}

export function saveMcState(state: McPrompterState) {
  localStorage.setItem(MC_STORAGE_KEY, JSON.stringify(state));
}
