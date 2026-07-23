import type {
  CeremonyDraft,
  CeremonyItem,
  CeremonyType,
  PerformanceItem,
  ScriptPackage,
} from '../models/ceremony';
import { generateScript } from './scriptEngine';

export type ProjectionStatus = 'known' | 'unknown';

export type CeremonyProjectionSummary = {
  sourceId: string | null;
  active: boolean;
  summary: string;
  participant?: string;
  status: ProjectionStatus;
};

export type VenueChecklistProjectionItem = {
  sourceId: string;
  title: string;
  summary: string;
};

export type McScriptHint = {
  sourceId: string;
  title: string;
  narration: string;
  participant?: string;
};

export type ProjectionSupportItem = {
  sourceId: string;
  title: string;
  value: string;
};

export type PerformanceProjection = CeremonyProjectionSummary & {
  songCount: number;
  items: Array<{
    sourceId: string;
    type: PerformanceItem['type'];
    performerName: string;
    performerRelation?: string;
    title?: string;
  }>;
};

export type CeremonyProjection = {
  ceremonyType: {
    value: CeremonyType;
    label: string;
    status: ProjectionStatus;
  };
  officiantType: 'officiant' | 'no_officiant' | 'unknown';
  officiant: CeremonyProjectionSummary;
  candleLighting: CeremonyProjectionSummary;
  vow: CeremonyProjectionSummary;
  declaration: CeremonyProjectionSummary;
  blessingOrSpeech: CeremonyProjectionSummary;
  performance: PerformanceProjection;
  giftExchange: CeremonyProjectionSummary;
  familyGreeting: CeremonyProjectionSummary;
  entrance: {
    groom: CeremonyProjectionSummary;
    bride: CeremonyProjectionSummary;
  };
  procession: CeremonyProjectionSummary;
  venueChecklistItems: VenueChecklistProjectionItem[];
  mcScriptHints: McScriptHint[];
  cues: ProjectionSupportItem[];
  notes: ProjectionSupportItem[];
  sourceWarnings: string[];
};

const ceremonyTypeLabels: Record<CeremonyType, string> = {
  no_officiant: '주례 없는 예식',
  officiant: '주례 있는 예식',
  religious: '종교 예식',
  custom: '직접 구성 예식',
};

const candleModeLabels: Record<string, string> = {
  mothers: '양가 어머님',
  parents_a: '부모님 유형 A',
  parents_b: '부모님 유형 B',
  single_host: '한쪽 혼주님',
  omit: '생략',
  custom: '직접 구성',
};

const declarationSpeakerLabels: Record<string, string> = {
  mc: '사회자',
  groom_father: '신랑 아버님',
  bride_father: '신부 아버님',
  groom_mother: '신랑 어머님',
  bride_mother: '신부 어머님',
  family_representative: '양가 부모님 대표',
  officiant: '주례 선생님',
};

const performanceTypeLabels: Record<PerformanceItem['type'], string> = {
  song: '축가',
  dance: '축무',
  instrumental: '축주',
};

function sortedItems(draft: CeremonyDraft) {
  return [...draft.items].sort((a, b) => a.order - b.order);
}

function findItem(draft: CeremonyDraft, type: string) {
  return sortedItems(draft).find((item) => item.type === type);
}

function unknownSummary(): CeremonyProjectionSummary {
  return {
    sourceId: null,
    active: false,
    summary: 'UNKNOWN',
    status: 'unknown',
  };
}

function inactiveSummary(item: CeremonyItem): CeremonyProjectionSummary {
  return {
    sourceId: item.id,
    active: false,
    summary: '미진행',
    status: 'known',
  };
}

function participantLabel(item: CeremonyItem) {
  const participant = item.participants?.[0];
  if (!participant) return undefined;
  return participant.displayTitle?.trim()
    || participant.name.trim()
    || participant.relation?.trim()
    || undefined;
}

function buildOfficiant(
  draft: CeremonyDraft,
  warnings: string[],
): CeremonyProjectionSummary {
  if (draft.ceremonyType === 'no_officiant') {
    return {
      sourceId: null,
      active: false,
      summary: '해당 없음',
      status: 'known',
    };
  }
  if (draft.ceremonyType !== 'officiant') return unknownSummary();

  const item = findItem(draft, 'officiant_entrance');
  if (!item || !item.active) {
    warnings.push('주례 소개(등단) 항목을 확인해 주세요.');
    return item ? inactiveSummary(item) : unknownSummary();
  }

  const participant = item.participants?.[0];
  const name = participant?.displayTitle?.trim() || participant?.name.trim();
  const relation = participant?.relation?.trim();
  const summary = [name, relation].filter(Boolean).join(' · ');
  if (!summary) {
    warnings.push(`주례 성함 또는 직함·관계를 입력해 주세요. (${item.id})`);
  }
  return {
    sourceId: item.id,
    active: true,
    summary: summary || '확인 필요',
    participant: summary || undefined,
    status: summary ? 'known' : 'unknown',
  };
}

function buildCandleLighting(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('화촉점화 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const mode = String(item.detailConfig.mode ?? '');
  const modeLabel = candleModeLabels[mode];
  const activeChildren = [...(item.children ?? [])]
    .filter((child) => child.active)
    .sort((a, b) => a.order - b.order);
  if (!modeLabel) warnings.push('화촉점화 방식이 확인되지 않았습니다.');

  const childSummary = activeChildren.length
    ? ` · ${activeChildren.map((child) => child.title).join(' → ')}`
    : '';
  return {
    sourceId: item.id,
    active: true,
    summary: `${modeLabel ?? 'UNKNOWN'}${childSummary}`,
    status: modeLabel ? 'known' : 'unknown',
  };
}

function buildVow(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('혼인서약 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const mode = item.detailConfig.mode;
  const participant = mode === 'mc'
    ? '사회자'
    : mode === 'together'
      ? '신랑·신부'
      : undefined;
  if (!participant) warnings.push('혼인서약 낭독 주체가 현재 데이터에서 확인되지 않았습니다.');

  return {
    sourceId: item.id,
    active: true,
    summary: participant ? `낭독자: ${participant}` : '낭독자 UNKNOWN',
    participant,
    status: participant ? 'known' : 'unknown',
  };
}

function buildDeclaration(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('성혼선언 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const speakerMode = String(item.detailConfig.speakerMode ?? '');
  const participant = participantLabel(item)
    || declarationSpeakerLabels[speakerMode];
  if (!participant) warnings.push('성혼선언 진행 주체가 현재 데이터에서 확인되지 않았습니다.');

  return {
    sourceId: item.id,
    active: true,
    summary: participant ? `진행자: ${participant}` : '진행자 UNKNOWN',
    participant,
    status: participant ? 'known' : 'unknown',
  };
}

function buildSpeech(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('덕담/축사 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const speechType = item.detailConfig.speechType;
  const label = speechType === 'congratulatory'
    ? '축사'
    : speechType === 'words'
      ? '덕담'
      : '덕담/축사';
  const participant = participantLabel(item);
  if (!participant) warnings.push(`${label} 진행 주체가 현재 데이터에서 확인되지 않았습니다.`);

  return {
    sourceId: item.id,
    active: true,
    summary: participant ? `${label}자: ${participant}` : `${label}자 UNKNOWN`,
    participant,
    status: participant ? 'known' : 'unknown',
  };
}

function buildPerformance(
  item: CeremonyItem | undefined,
  warnings: string[],
): PerformanceProjection {
  if (!item) {
    warnings.push('공연 항목을 찾을 수 없습니다.');
    return {
      ...unknownSummary(),
      songCount: 0,
      items: [],
    };
  }
  if (!item.active) {
    return {
      ...inactiveSummary(item),
      songCount: 0,
      items: [],
    };
  }

  const performances = [...(item.detailConfig.performances ?? [])]
    .sort((a, b) => a.order - b.order);
  const projectedItems = performances.map((performance) => ({
    sourceId: performance.id,
    type: performance.type,
    performerName: performance.performerName,
    performerRelation: performance.performerRelation,
    title: performance.title,
  }));
  const songs = performances.filter((performance) => performance.type === 'song');
  if (!performances.length) warnings.push(`진행 중인 공연 항목에 공연 카드가 없습니다. (${item.id})`);

  const counts = (['song', 'dance', 'instrumental'] as const)
    .map((type) => {
      const count = performances.filter((performance) => performance.type === type).length;
      if (!count) return '';
      return type === 'song'
        ? `${performanceTypeLabels[type]} ${count}곡`
        : `${performanceTypeLabels[type]} ${count}건`;
    })
    .filter(Boolean);
  const details = performances.map((performance) => {
    const title = performance.title?.trim();
    const performer = performance.performerName.trim();
    const detail = [title, performer].filter(Boolean).join(' · ');
    return detail ? `${performanceTypeLabels[performance.type]}: ${detail}` : performanceTypeLabels[performance.type];
  });

  return {
    sourceId: item.id,
    active: true,
    summary: [...counts, ...details].join(' · ') || '진행 · 세부 정보 UNKNOWN',
    status: performances.length ? 'known' : 'unknown',
    songCount: songs.length,
    items: projectedItems,
  };
}

function buildActiveOnly(
  item: CeremonyItem | undefined,
  missingWarning: string,
  activeSummary: string,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push(missingWarning);
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);
  return {
    sourceId: item.id,
    active: true,
    summary: activeSummary,
    status: 'known',
  };
}

function buildGroomEntrance(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('신랑 입장 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const mode = item.detailConfig.mode;
  const modeLabel = mode === 'solo'
    ? '신랑 단독'
    : mode === 'with_father'
      ? '아버님과 입장'
      : mode === 'custom'
        ? '직접 구성'
        : undefined;
  if (!modeLabel) warnings.push('신랑 입장 방식이 현재 데이터에서 확인되지 않았습니다.');
  const endPoint = item.detailConfig.escortEndPoint?.trim();

  return {
    sourceId: item.id,
    active: true,
    summary: [modeLabel ?? '방식 UNKNOWN', endPoint && `동행 종료: ${endPoint}`]
      .filter(Boolean)
      .join(' · '),
    status: modeLabel ? 'known' : 'unknown',
  };
}

function buildBrideEntrance(
  item: CeremonyItem | undefined,
  warnings: string[],
): CeremonyProjectionSummary {
  if (!item) {
    warnings.push('신부 입장 항목을 찾을 수 없습니다.');
    return unknownSummary();
  }
  if (!item.active) return inactiveSummary(item);

  const appearance = item.detailConfig.appearance === 'reveal_then_enter'
    ? '먼저 등장 후 입장'
    : item.detailConfig.appearance === 'direct'
      ? '바로 입장'
      : undefined;
  const escort = item.detailConfig.escort === 'father'
    ? '신부 아버님과 입장'
    : item.detailConfig.escort === 'solo'
      ? '신부 단독 입장'
      : item.detailConfig.escort === 'custom'
        ? '직접 구성'
        : undefined;
  if (!appearance || !escort) warnings.push('신부 입장 방식 일부가 현재 데이터에서 확인되지 않았습니다.');
  if (item.detailConfig.escort === 'custom') {
    warnings.push('신부 custom 동반자의 구조화된 인물 정보가 없습니다.');
  }
  const handoffPoint = item.detailConfig.handoffPoint?.trim();

  return {
    sourceId: item.id,
    active: true,
    summary: [
      appearance ?? '등장 방식 UNKNOWN',
      escort ?? '동반 방식 UNKNOWN',
      handoffPoint && `인계: ${handoffPoint}`,
    ].filter(Boolean).join(' · '),
    status: appearance && escort ? 'known' : 'unknown',
  };
}

function summaryForChecklistItem(
  item: CeremonyItem,
  projection: Omit<
    CeremonyProjection,
    'venueChecklistItems' | 'mcScriptHints' | 'cues' | 'notes'
  >,
) {
  if (item.id === projection.candleLighting.sourceId) return projection.candleLighting.summary;
  if (item.id === projection.vow.sourceId) return projection.vow.summary;
  if (item.id === projection.declaration.sourceId) return projection.declaration.summary;
  if (item.id === projection.blessingOrSpeech.sourceId) return projection.blessingOrSpeech.summary;
  if (item.id === projection.performance.sourceId) return projection.performance.summary;
  if (item.id === projection.giftExchange.sourceId) return projection.giftExchange.summary;
  if (item.id === projection.familyGreeting.sourceId) return projection.familyGreeting.summary;
  if (item.id === projection.entrance.groom.sourceId) return projection.entrance.groom.summary;
  if (item.id === projection.entrance.bride.sourceId) return projection.entrance.bride.summary;
  if (item.id === projection.procession.sourceId) return projection.procession.summary;
  return '진행';
}

export function buildCeremonyProjection(
  draft: CeremonyDraft,
  sharedScript?: ScriptPackage,
): CeremonyProjection {
  const sourceWarnings: string[] = [];
  const items = sortedItems(draft);
  sourceWarnings.push('자료 준비 상태를 예식장과 확인해 주세요.');

  const ceremonyTypeStatus: ProjectionStatus = ['no_officiant', 'officiant']
    .includes(draft.ceremonyType)
    ? 'known'
    : 'unknown';
  if (ceremonyTypeStatus === 'unknown') {
    sourceWarnings.push('종교 예식 또는 직접 구성 예식의 주례 유무를 현재 데이터에서 확정할 수 없습니다.');
  }

  const candleLighting = buildCandleLighting(
    findItem(draft, 'candle_lighting'),
    sourceWarnings,
  );
  const officiant = buildOfficiant(draft, sourceWarnings);
  const vow = buildVow(findItem(draft, 'vows'), sourceWarnings);
  const declaration = buildDeclaration(
    findItem(draft, 'pronouncement'),
    sourceWarnings,
  );
  const blessingOrSpeech = buildSpeech(
    findItem(draft, 'speech'),
    sourceWarnings,
  );
  const performance = buildPerformance(
    findItem(draft, 'performance'),
    sourceWarnings,
  );
  const giftExchange = buildActiveOnly(
    findItem(draft, 'ring_exchange'),
    '예물교환 항목을 찾을 수 없습니다.',
    '진행',
    sourceWarnings,
  );
  const familyGreeting = buildActiveOnly(
    findItem(draft, 'family_guest_greeting'),
    '양가 부모님 및 내빈께 인사 항목을 찾을 수 없습니다.',
    '진행',
    sourceWarnings,
  );
  const entrance = {
    groom: buildGroomEntrance(findItem(draft, 'groom_entrance'), sourceWarnings),
    bride: buildBrideEntrance(findItem(draft, 'bride_entrance'), sourceWarnings),
  };
  const processionItem = findItem(draft, 'recessional');
  const procession = buildActiveOnly(
    processionItem,
    '행진 항목을 찾을 수 없습니다.',
    '진행 · 방식 UNKNOWN',
    sourceWarnings,
  );
  if (processionItem?.active) {
    sourceWarnings.push(`음원 재생 타이밍을 예식장과 확인해 주세요. (${processionItem.id})`);
  }

  const projectionBase = {
    ceremonyType: {
      value: draft.ceremonyType,
      label: ceremonyTypeLabels[draft.ceremonyType],
      status: ceremonyTypeStatus,
    },
    officiantType: draft.ceremonyType === 'officiant'
      ? 'officiant' as const
      : draft.ceremonyType === 'no_officiant'
        ? 'no_officiant' as const
        : 'unknown' as const,
    officiant,
    candleLighting,
    vow,
    declaration,
    blessingOrSpeech,
    performance,
    giftExchange,
    familyGreeting,
    entrance,
    procession,
    sourceWarnings,
  };

  const venueChecklistItems = items
    .filter((item) => item.active)
    .map((item) => ({
      sourceId: item.id,
      title: item.title,
      summary: summaryForChecklistItem(item, projectionBase),
    }));

  const script = sharedScript ?? generateScript(draft);
  const participantBySourceId = new Map<string, string | undefined>([
    [vow.sourceId ?? '', vow.participant],
    [declaration.sourceId ?? '', declaration.participant],
    [blessingOrSpeech.sourceId ?? '', blessingOrSpeech.participant],
  ]);
  const mcScriptHints = script.ceremonySections.map((section) => ({
    sourceId: section.id,
    title: section.title,
    narration: section.narration,
    participant: participantBySourceId.get(section.id),
  }));
  const cues = script.ceremonySections.flatMap((section) =>
    section.cue.map((value) => ({
      sourceId: section.id,
      title: section.title,
      value,
    })));
  const notes = script.ceremonySections.flatMap((section) =>
    section.note.map((value) => ({
      sourceId: section.id,
      title: section.title,
      value,
    })));
  if (script.globalRequestNote?.trim()) {
    notes.unshift({
      sourceId: draft.id,
      title: '전체 요청사항',
      value: script.globalRequestNote.trim(),
    });
  }

  return {
    ...projectionBase,
    venueChecklistItems,
    mcScriptHints,
    cues,
    notes,
  };
}
