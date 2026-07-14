import type { CeremonyDraft } from '../models/ceremony';
import { migrateLegacyTemplate } from '../data/ceremonyTemplates';

export const DRAFT_STORAGE_KEY = 'yesiknote:owner-builder:draft:v1';
export const DRAFT_BACKUP_STORAGE_KEY = `${DRAFT_STORAGE_KEY}:backup:schema1`;
export const MC_STORAGE_KEY = 'yesiknote:mc-prompter:state:v1';
export const DRAFT_SCHEMA_VERSION = 2;

type StoredDraftEnvelopeV1 = {
  schemaVersion: 1;
  templateVersion: string;
  savedAt: string;
  draft: CeremonyDraft;
};

type StoredDraftEnvelope = {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION;
  templateVersion: string;
  savedAt: string;
  migratedAt?: string;
  draft: CeremonyDraft;
};

function hasDraft(value: unknown): value is StoredDraftEnvelopeV1 | StoredDraftEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<StoredDraftEnvelopeV1>;
  return !!envelope.draft?.items && Array.isArray(envelope.draft.items);
}

function migrateEnvelope(
  envelope: StoredDraftEnvelopeV1,
  rawValue: string,
): CeremonyDraft {
  const draft = migrateLegacyTemplate(envelope.draft);
  const migratedAt = new Date().toISOString();
  const migrated: StoredDraftEnvelope = {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    templateVersion: draft.templateVersion,
    savedAt: envelope.savedAt,
    migratedAt,
    draft,
  };

  if (!localStorage.getItem(DRAFT_BACKUP_STORAGE_KEY)) {
    localStorage.setItem(DRAFT_BACKUP_STORAGE_KEY, rawValue);
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(migrated));
  return draft;
}

export function saveDraft(draft: CeremonyDraft): string {
  const savedAt = new Date().toISOString();
  const envelope: StoredDraftEnvelope = {
    schemaVersion: DRAFT_SCHEMA_VERSION,
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
    const envelope = JSON.parse(value) as unknown;
    if (!hasDraft(envelope)) return null;
    if (envelope.schemaVersion === DRAFT_SCHEMA_VERSION) return envelope.draft;
    if (envelope.schemaVersion !== 1) return null;
    try {
      return migrateEnvelope(envelope, value);
    } catch {
      return envelope.draft;
    }
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
