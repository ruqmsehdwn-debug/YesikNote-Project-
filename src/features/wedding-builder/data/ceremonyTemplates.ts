import type {
  CeremonyDraft,
  CeremonyItem,
  CeremonyItemType,
  CeremonyType,
} from '../models/ceremony';

export const TEMPLATE_VERSION = 'v0.2.1';

let fallbackId = 0;

export function createId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

function child(
  parentId: string,
  type: string,
  title: string,
  order: number,
): CeremonyItem {
  return {
    id: createId('child'),
    parentId,
    type,
    title,
    order,
    active: true,
    detailConfig: {},
    useDefaultNarration: true,
    estimatedTimeSeconds: 20,
  };
}

export type CandleMode =
  | 'mothers'
  | 'parents_a'
  | 'parents_b'
  | 'single_host'
  | 'omit'
  | 'custom';

export function createCandleChildren(
  parentId: string,
  mode: CandleMode,
): CeremonyItem[] {
  const definitions: Record<Exclude<CandleMode, 'omit' | 'custom'>, Array<[string, string]>> = {
    mothers: [
      ['candle_mothers_entry', '양가 어머님 입장'],
      ['candle_groom_mother_light', '신랑 어머님 화촉점화'],
      ['candle_bride_mother_light', '신부 어머님 화촉점화'],
      ['candle_mothers_bow', '양가 어머님 맞절'],
      ['candle_mothers_guest_bow', '양가 어머님 내빈께 인사'],
      ['candle_mothers_seat', '자리 이동'],
    ],
    parents_a: [
      ['candle_groom_parents_entry', '신랑 부모님 입장'],
      ['candle_bride_parents_entry', '신부 부모님 입장'],
      ['candle_parents_bow', '양가 부모님 맞절'],
      ['candle_fathers_seat', '양가 아버님 자리 착석'],
      ['candle_groom_mother_light', '신랑 어머님 화촉점화'],
      ['candle_bride_mother_light', '신부 어머님 화촉점화'],
      ['candle_mothers_guest_bow', '양가 어머님 내빈께 인사'],
      ['candle_mothers_seat', '양가 어머님 자리 이동'],
    ],
    parents_b: [
      ['candle_groom_parents_entry', '신랑 부모님 입장'],
      ['candle_bride_parents_entry', '신부 부모님 입장'],
      ['candle_groom_parents_light', '신랑 부모님 화촉점화'],
      ['candle_bride_parents_light', '신부 부모님 화촉점화'],
      ['candle_parents_bow', '양가 부모님 맞절'],
      ['candle_parents_guest_bow', '양가 부모님 내빈께 인사'],
      ['candle_parents_seat', '양가 부모님 자리 이동'],
    ],
    single_host: [
      ['candle_single_entry', '혼주님 입장'],
      ['candle_single_light', '혼주님 화촉점화'],
      ['candle_single_guest_bow', '혼주님 내빈께 인사'],
      ['candle_single_seat', '혼주님 자리 이동'],
    ],
  };

  if (mode === 'omit' || mode === 'custom') return [];
  return definitions[mode].map(([type, title], order) =>
    child(parentId, type, title, order),
  );
}

function item(
  type: CeremonyItemType,
  title: string,
  order: number,
  detailConfig: CeremonyItem['detailConfig'] = {},
): CeremonyItem {
  const id = createId(type.replaceAll('_', '-'));
  const result: CeremonyItem = {
    id,
    type,
    title,
    order,
    active: true,
    detailConfig,
    useDefaultNarration: true,
    estimatedTimeSeconds: 90,
  };
  if (type === 'candle_lighting') {
    result.children = createCandleChildren(id, 'mothers');
  }
  return result;
}

const noOfficiantDefinitions: Array<[
  CeremonyItemType,
  string,
  CeremonyItem['detailConfig']?,
]> = [
  ['opening', '개식사'],
  ['candle_lighting', '화촉점화', { mode: 'mothers' }],
  ['groom_entrance', '신랑 입장', { mode: 'solo' }],
  [
    'bride_entrance',
    '신부 입장',
    { appearance: 'reveal_then_enter', escort: 'father' },
  ],
  ['couple_bow', '신랑·신부 맞절'],
  ['vows', '혼인서약', { mode: 'together' }],
  ['ring_exchange', '예물교환', { flowerChildEnabled: false }],
  ['pronouncement', '성혼선언', { speakerMode: 'mc' }],
  [
    'speech',
    '덕담/축사',
    { speechType: 'words', sameAsPronouncement: false, manuscriptStatus: 'not_submitted' },
  ],
  ['performance', '축가/축무/축주', { performances: [] }],
  [
    'family_guest_greeting',
    '양가 부모님 및 내빈께 인사',
    {
      groomFamilyAttendance: 'both_parents',
      brideFamilyAttendance: 'both_parents',
      omitGroomFamilyHug: false,
      omitBrideFamilyHug: false,
    },
  ],
  ['recessional', '신랑·신부 행진'],
  ['closing', '폐회식'],
];

const officiantDefinitions: typeof noOfficiantDefinitions = [
  ['opening', '개식사'],
  ['candle_lighting', '화촉점화', { mode: 'mothers' }],
  ['officiant_entrance', '주례 소개(등단)'],
  ['groom_entrance', '신랑 입장', { mode: 'solo' }],
  [
    'bride_entrance',
    '신부 입장',
    { appearance: 'reveal_then_enter', escort: 'father' },
  ],
  ['couple_bow', '신랑·신부 맞절'],
  ['vows', '혼인서약'],
  ['ring_exchange', '예물교환', { flowerChildEnabled: false }],
  ['pronouncement', '성혼선언', { speakerMode: 'officiant' }],
  ['officiant_speech', '주례사'],
  [
    'speech',
    '덕담/축사',
    { speechType: 'words', sameAsPronouncement: false, manuscriptStatus: 'not_submitted' },
  ],
  ['performance', '축가/축무/축주', { performances: [] }],
  [
    'family_guest_greeting',
    '양가 부모님 및 내빈께 인사',
    {
      groomFamilyAttendance: 'both_parents',
      brideFamilyAttendance: 'both_parents',
      omitGroomFamilyHug: false,
      omitBrideFamilyHug: false,
    },
  ],
  ['recessional', '신랑·신부 행진'],
  ['closing', '폐회식'],
];

export function createTemplate(type: CeremonyType): CeremonyItem[] {
  if (type === 'religious' || type === 'custom') return [];
  const definitions = type === 'officiant' ? officiantDefinitions : noOfficiantDefinitions;
  return definitions.map(([itemType, title, config], order) =>
    item(itemType, title, order, config),
  );
}

export function createCustomItem(order: number): CeremonyItem {
  return {
    id: createId('custom'),
    type: 'custom',
    title: '새로운 식순',
    order,
    active: true,
    detailConfig: { description: '' },
    useDefaultNarration: false,
    narrationOverride: '',
    estimatedTimeSeconds: 60,
  };
}

export function createDraft(type: CeremonyType = 'no_officiant'): CeremonyDraft {
  return {
    id: createId('draft'),
    basicInfo: {
      weddingDate: '',
      venueName: '',
      hallName: '',
      groomName: '',
      brideName: '',
      banquetLocation: '',
      photoGuide: '',
      globalRequestNote: '',
    },
    ceremonyType: type,
    items: createTemplate(type),
    templateVersion: TEMPLATE_VERSION,
    lastStep: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function resetOrders(items: CeremonyItem[]): CeremonyItem[] {
  return items.map((current, order) => ({
    ...current,
    order,
    children: current.children?.map((nested, childOrder) => ({
      ...nested,
      order: childOrder,
      parentId: current.id,
    })),
  }));
}
