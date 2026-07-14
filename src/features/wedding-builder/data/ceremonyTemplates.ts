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

const candleDefinitions: Record<
  Exclude<CandleMode, 'omit' | 'custom'>,
  Array<[string, string]>
> = {
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

export function createCandleChildren(
  parentId: string,
  mode: CandleMode,
): CeremonyItem[] {
  if (mode === 'omit' || mode === 'custom') return [];
  return candleDefinitions[mode].map(([type, title], order) =>
    child(parentId, type, title, order),
  );
}

export function reconcileCandleChildren(
  parentId: string,
  children: CeremonyItem[],
  mode: CandleMode,
): CeremonyItem[] {
  if (mode === 'omit' || mode === 'custom') {
    return [...children]
      .sort((a, b) => a.order - b.order)
      .map((current, order) => ({ ...current, parentId, order }));
  }

  const sorted = [...children].sort((a, b) => a.order - b.order);
  const usedIds = new Set<string>();
  const canonical = candleDefinitions[mode].map(([type, title], order) => {
    const existing = sorted.find(
      (current) => current.type === type && !usedIds.has(current.id),
    );
    if (!existing) return child(parentId, type, title, order);
    usedIds.add(existing.id);
    return { ...existing, parentId, order };
  });
  const extras = sorted
    .filter((current) => !usedIds.has(current.id))
    .map((current, index) => ({
      ...current,
      parentId,
      order: canonical.length + index,
    }));
  return [...canonical, ...extras];
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

function definitionsFor(type: CeremonyType) {
  if (type === 'religious' || type === 'custom') return [];
  return type === 'officiant' ? officiantDefinitions : noOfficiantDefinitions;
}

function candleMode(value: unknown): CandleMode | null {
  return ['mothers', 'parents_a', 'parents_b', 'single_host', 'omit', 'custom'].includes(
    String(value),
  )
    ? (value as CandleMode)
    : null;
}

function reconcileCandleItem(current: CeremonyItem): CeremonyItem {
  if (current.type !== 'candle_lighting') return current;
  const mode = candleMode(current.detailConfig.mode);
  if (!mode) return current;
  return {
    ...current,
    children: reconcileCandleChildren(current.id, current.children ?? [], mode),
  };
}

export function restoreCanonicalOrder(
  items: CeremonyItem[],
  type: CeremonyType,
): CeremonyItem[] {
  const definitions = definitionsFor(type);
  if (definitions.length === 0) return resetOrders(items);

  const sorted = [...items].sort((a, b) => a.order - b.order);
  const usedIds = new Set<string>();
  const canonical = definitions.map(([itemType, title, config], order) => {
    const existing = sorted.find(
      (current) => current.type === itemType && !usedIds.has(current.id),
    );
    if (!existing) return item(itemType, title, order, config);
    usedIds.add(existing.id);
    return reconcileCandleItem({ ...existing, order });
  });
  const extras = sorted
    .filter((current) => !usedIds.has(current.id))
    .map((current, index) => ({ ...current, order: canonical.length + index }));
  return [...canonical, ...extras];
}

const semanticTitles: Record<'couple_bow' | 'ring_exchange', string[]> = {
  couple_bow: ['신랑·신부 맞절', '신랑 신부 맞절'],
  ring_exchange: ['예물교환', '예물 교환'],
};

function normalizedTitle(value: string) {
  return value.replace(/[\s·-]/g, '');
}

function hasSemanticItem(
  items: CeremonyItem[],
  type: 'couple_bow' | 'ring_exchange',
) {
  const titles = semanticTitles[type].map(normalizedTitle);
  return items.some(
    (current) =>
      current.type === type || titles.includes(normalizedTitle(current.title)),
  );
}

function insertAfterType(
  items: CeremonyItem[],
  anchorType: CeremonyItemType,
  inserted: CeremonyItem,
) {
  const index = items.findIndex((current) => current.type === anchorType);
  if (index < 0) throw new Error(`Legacy migration anchor not found: ${anchorType}`);
  const result = [...items];
  result.splice(index + 1, 0, inserted);
  return result;
}

function canSafelyReconcileLegacyChildren(current: CeremonyItem, mode: CandleMode) {
  if (mode === 'omit' || mode === 'custom') return true;
  const canonicalTypes = new Set(candleDefinitions[mode].map(([type]) => type));
  const children = current.children ?? [];
  return children.every(
    (nested) => nested.type === 'custom' || canonicalTypes.has(nested.type),
  ) && [...canonicalTypes].every(
    (type) => children.filter((nested) => nested.type === type).length <= 1,
  );
}

function migrateLegacyCandleChildren(
  parentId: string,
  children: CeremonyItem[],
  mode: CandleMode,
) {
  if (mode === 'omit' || mode === 'custom') {
    return [...children]
      .sort((a, b) => a.order - b.order)
      .map((nested, order) => ({ ...nested, parentId, order }));
  }

  const definitions = candleDefinitions[mode];
  const result = [...children].sort((a, b) => a.order - b.order);
  definitions.forEach(([type, title], canonicalIndex) => {
    if (result.some((nested) => nested.type === type)) return;

    const previousTypes = definitions
      .slice(0, canonicalIndex)
      .map(([previousType]) => previousType)
      .reverse();
    const previousIndex = previousTypes
      .map((previousType) => result.findIndex((nested) => nested.type === previousType))
      .find((index) => index >= 0);
    if (previousIndex !== undefined) {
      result.splice(previousIndex + 1, 0, child(parentId, type, title, 0));
      return;
    }

    const nextTypes = definitions
      .slice(canonicalIndex + 1)
      .map(([nextType]) => nextType);
    const nextIndex = nextTypes
      .map((nextType) => result.findIndex((nested) => nested.type === nextType))
      .find((index) => index >= 0);
    result.splice(nextIndex ?? result.length, 0, child(parentId, type, title, 0));
  });

  return result.map((nested, order) => ({ ...nested, parentId, order }));
}

export function migrateLegacyTemplate(draft: CeremonyDraft): CeremonyDraft {
  if (
    draft.templateVersion === TEMPLATE_VERSION ||
    draft.ceremonyType === 'religious' ||
    draft.ceremonyType === 'custom'
  ) {
    return draft;
  }

  const definitions = definitionsFor(draft.ceremonyType);
  const canonicalTypes = definitions.map(([type]) => type);
  const missingCoupleBow = !hasSemanticItem(draft.items, 'couple_bow');
  const missingRingExchange = !hasSemanticItem(draft.items, 'ring_exchange');
  const allowedMissing = new Set<CeremonyItemType>([
    ...(missingCoupleBow ? ['couple_bow' as const] : []),
    ...(missingRingExchange ? ['ring_exchange' as const] : []),
  ]);

  const safeLegacyShape = canonicalTypes.every((type) => {
    const count = draft.items.filter((current) => current.type === type).length;
    return allowedMissing.has(type) ? count === 0 : count === 1;
  });
  if (!safeLegacyShape) {
    if (missingCoupleBow || missingRingExchange) {
      throw new Error('Legacy ceremony items cannot be migrated without ambiguity.');
    }
    return draft;
  }

  let items = [...draft.items].sort((a, b) => a.order - b.order);
  if (missingCoupleBow) {
    items = insertAfterType(
      items,
      'bride_entrance',
      item('couple_bow', '신랑·신부 맞절', 0),
    );
  }
  if (missingRingExchange) {
    items = insertAfterType(
      items,
      'vows',
      item('ring_exchange', '예물교환', 0, { flowerChildEnabled: false }),
    );
  }

  items = items.map((current) => {
    if (current.type !== 'candle_lighting') return current;
    const mode = candleMode(current.detailConfig.mode);
    if (!mode) return current;
    if (!canSafelyReconcileLegacyChildren(current, mode)) {
      throw new Error('Legacy candle children cannot be migrated without ambiguity.');
    }
    return {
      ...current,
      children: migrateLegacyCandleChildren(current.id, current.children ?? [], mode),
    };
  });

  return {
    ...draft,
    items: resetOrders(items),
    templateVersion: TEMPLATE_VERSION,
  };
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
