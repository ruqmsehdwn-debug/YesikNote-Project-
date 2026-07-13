export type CeremonyType =
  | 'no_officiant'
  | 'officiant'
  | 'religious'
  | 'custom';

export type IntroMode = 'default' | 'custom';

export type PersonRef = {
  id: string;
  role: string;
  name: string;
  relation?: string;
  displayTitle?: string;
  introMode?: IntroMode;
  introText?: string;
};

export type PerformanceItem = {
  id: string;
  type: 'song' | 'dance' | 'instrumental';
  performerName: string;
  performerRelation?: string;
  title?: string;
  introText?: string;
  samePerformerAsPrevious: boolean;
  order: number;
  requestNote?: string;
};

export type CeremonyItemType =
  | 'opening'
  | 'candle_lighting'
  | 'officiant_entrance'
  | 'groom_entrance'
  | 'bride_entrance'
  | 'couple_bow'
  | 'vows'
  | 'ring_exchange'
  | 'pronouncement'
  | 'officiant_speech'
  | 'speech'
  | 'performance'
  | 'family_guest_greeting'
  | 'recessional'
  | 'closing'
  | 'custom'
  | string;

export type CeremonyDetailConfig = {
  mode?: string;
  appearance?: 'reveal_then_enter' | 'direct';
  escort?: 'father' | 'solo' | 'custom';
  simultaneousLighting?: boolean;
  customHostTitle?: string;
  escortEndPoint?: string;
  handoffPoint?: string;
  flowerChildEnabled?: boolean;
  flowerChild?: PersonRef;
  flowerChildRoute?: string;
  ringRecipient?: string;
  speakerMode?: string;
  speaker?: PersonRef;
  sameAsPronouncement?: boolean;
  speechType?: 'words' | 'congratulatory';
  manuscript?: string;
  manuscriptStatus?: 'not_submitted' | 'submitted';
  performances?: PerformanceItem[];
  groomFamilyAttendance?: string;
  brideFamilyAttendance?: string;
  groomFamilyTitle?: string;
  brideFamilyTitle?: string;
  omitGroomFamilyHug?: boolean;
  omitBrideFamilyHug?: boolean;
  description?: string;
  [key: string]: unknown;
};

export type CeremonyItem = {
  id: string;
  type: CeremonyItemType;
  title: string;
  order: number;
  active: boolean;
  parentId?: string;
  children?: CeremonyItem[];
  participants?: PersonRef[];
  detailConfig: CeremonyDetailConfig;
  useDefaultNarration: boolean;
  customIntro?: string;
  narrationOverride?: string;
  cueOverride?: string[];
  requestNote?: string;
  estimatedTimeSeconds?: number;
};

export type CeremonyDraft = {
  id: string;
  basicInfo: {
    weddingDate: string;
    venueName: string;
    hallName: string;
    groomName: string;
    brideName: string;
    banquetLocation: string;
    photoGuide?: string;
    globalRequestNote?: string;
  };
  ceremonyType: CeremonyType;
  items: CeremonyItem[];
  templateVersion: string;
  lastStep: number;
  updatedAt: string;
};

export type ScriptSection = {
  id: string;
  parentId?: string;
  title: string;
  narration: string;
  cue: string[];
  note: string[];
  orderPath: number[];
  estimatedTimeSeconds?: number;
};

export type ScriptPackage = {
  preCeremonyChecklist: ScriptSection[];
  ceremonySections: ScriptSection[];
  globalRequestNote?: string;
  totalEstimatedTimeSeconds: number;
};

export type ValidationIssue = {
  id: string;
  itemId?: string;
  field?: string;
  severity: 'blocking' | 'warning';
  message: string;
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
