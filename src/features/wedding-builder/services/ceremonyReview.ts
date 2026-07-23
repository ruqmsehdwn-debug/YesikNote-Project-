import type {
  CeremonyDraft,
  CeremonyItem,
  ScriptPackage,
  ValidationIssue,
} from '../models/ceremony';
import type {
  CeremonyProjection,
  PerformanceProjection,
} from './ceremonyProjection';
import { ceremonyItemDisplayTitle } from './scriptEngine';

export type CeremonyReviewDetail = {
  label: string;
  value: string;
};

export type CeremonyReviewRow = {
  sourceId: string;
  title: string;
  summary: string;
  details: CeremonyReviewDetail[];
  cues: string[];
  notes: string[];
  warnings: string[];
};

const performanceTypeLabels: Record<
  PerformanceProjection['items'][number]['type'],
  string
> = {
  song: '축가',
  dance: '축무',
  instrumental: '축주',
};

function displayText(value?: string) {
  return value
    ?.trim()
    .replace(/님의(?=[가-힣])/g, '님의 ')
    .replace(/고등학교친구/g, '고등학교 친구')
    .replace(/중학교친구/g, '중학교 친구')
    .replace(/\s+/g, ' ');
}

function projectionWarningForItem(
  warning: string,
  item: CeremonyItem,
) {
  return (
    warning.includes(`(${item.id})`)
    || warning.includes(item.title)
    || warning.includes(ceremonyItemDisplayTitle(item))
  );
}

function cleanWarning(warning: string, item: CeremonyItem) {
  return warning.replace(` (${item.id})`, '');
}

function scriptValues(
  item: CeremonyItem,
  script: ScriptPackage,
  field: 'cue' | 'note',
) {
  return script.ceremonySections
    .filter((section) => section.id === item.id || section.parentId === item.id)
    .flatMap((section) => section[field].map((value) => (
      section.id === item.id ? value : `${section.title}: ${value}`
    )));
}

function validationWarnings(
  item: CeremonyItem,
  issues: ValidationIssue[],
) {
  return issues
    .filter((issue) => (
      (issue.ceremonyItemId ?? issue.itemId) === item.id
    ))
    .map((issue) => issue.message);
}

function checklistSummary(
  item: CeremonyItem,
  projection: CeremonyProjection,
) {
  const projected = projection.venueChecklistItems
    .find((candidate) => candidate.sourceId === item.id);
  if (!projected || projected.summary.includes('UNKNOWN')) return '확인 필요';
  return projected.summary
    .replace(/^진행 · 낭독:\s*/, '')
    .replace(/^진행 · 주체:\s*/, '')
    .replace(/^덕담 · 주체:\s*/, '')
    .replace(/^축사 · 주체:\s*/, '');
}

function entranceDetails(item: CeremonyItem): CeremonyReviewDetail[] {
  if (item.type === 'groom_entrance') {
    const mode = item.detailConfig.mode === 'solo'
      ? '단독 입장'
      : item.detailConfig.mode === 'with_father'
        ? '아버님 동반'
        : item.detailConfig.mode === 'custom'
          ? '직접 구성'
          : '확인 필요';
    return [
      { label: '입장 방식', value: mode },
      ...(displayText(item.detailConfig.escortEndPoint)
        ? [{ label: '동행 종료 위치', value: displayText(item.detailConfig.escortEndPoint)! }]
        : []),
    ];
  }
  if (item.type !== 'bride_entrance') return [];
  const appearance = item.detailConfig.appearance === 'reveal_then_enter'
    ? '먼저 등장'
    : item.detailConfig.appearance === 'direct'
      ? '바로 입장'
      : '확인 필요';
  const escort = item.detailConfig.escort === 'father'
    ? '아버님 동반'
    : item.detailConfig.escort === 'solo'
      ? '단독 입장'
      : item.detailConfig.escort === 'custom'
        ? '직접 구성'
        : '확인 필요';
  return [
    { label: '등장 방식', value: appearance },
    { label: '입장 방식', value: escort },
    ...(displayText(item.detailConfig.handoffPoint)
      ? [{ label: '인계 위치', value: displayText(item.detailConfig.handoffPoint)! }]
      : []),
  ];
}

function performanceDetails(
  projection: PerformanceProjection,
): CeremonyReviewDetail[] {
  return [
    { label: '공연', value: `${projection.items.length}건` },
    ...projection.items.flatMap((performance, index) => {
      const number = index + 1;
      return [
        { label: `${number}번 종류`, value: performanceTypeLabels[performance.type] },
        ...(displayText(performance.title)
          ? [{ label: `${number}번 곡명·공연명`, value: displayText(performance.title)! }]
          : []),
        ...(displayText(performance.performerName)
          ? [{ label: `${number}번 진행자`, value: displayText(performance.performerName)! }]
          : []),
        ...(displayText(performance.performerRelation)
          ? [{ label: `${number}번 관계`, value: displayText(performance.performerRelation)! }]
          : []),
      ];
    }),
  ];
}

function itemDetails(
  item: CeremonyItem,
  projection: CeremonyProjection,
): CeremonyReviewDetail[] {
  const participant = item.participants?.[0];
  const base: CeremonyReviewDetail[] = [
    { label: '진행 여부', value: item.active ? '진행' : '미진행' },
  ];
  if (item.type === 'performance') {
    return [...base, ...performanceDetails(projection.performance)];
  }
  if (item.type === 'vows') {
    return [
      ...base,
      { label: '낭독자', value: projection.vow.participant ?? '확인 필요' },
    ];
  }
  if (item.type === 'pronouncement') {
    return [
      ...base,
      { label: '진행자', value: projection.declaration.participant ?? '확인 필요' },
      ...(displayText(participant?.relation)
        ? [{ label: '관계', value: displayText(participant?.relation)! }]
        : []),
    ];
  }
  if (item.type === 'speech') {
    const speakerLabel = item.detailConfig.speechType === 'congratulatory'
      ? '축사자'
      : '덕담자';
    return [
      ...base,
      { label: speakerLabel, value: projection.blessingOrSpeech.participant ?? '확인 필요' },
      ...(displayText(participant?.relation)
        ? [{ label: '관계', value: displayText(participant?.relation)! }]
        : []),
    ];
  }
  if (item.type === 'groom_entrance' || item.type === 'bride_entrance') {
    return [...base, ...entranceDetails(item)];
  }
  if (item.type === 'candle_lighting') {
    const children = [...(item.children ?? [])]
      .filter((child) => child.active)
      .sort((a, b) => a.order - b.order);
    return [
      ...base,
      { label: '진행 방식', value: projection.candleLighting.summary.split(' · ')[0] },
      ...children.map((child, index) => ({
        label: `세부 순서 ${index + 1}`,
        value: child.title,
      })),
    ];
  }
  const summary = checklistSummary(item, projection);
  return [
    ...base,
    ...(summary !== '진행'
      ? [{ label: '진행 정보', value: summary }]
      : []),
  ];
}

function rowSummary(
  item: CeremonyItem,
  projection: CeremonyProjection,
) {
  if (item.type === 'candle_lighting') {
    return projection.candleLighting.summary.split(' · ')[0];
  }
  if (item.type === 'groom_entrance') {
    return projection.entrance.groom.summary.split(' · ')[0];
  }
  if (item.type === 'bride_entrance') {
    return entranceDetails(item)
      .filter((detail) => detail.label === '등장 방식' || detail.label === '입장 방식')
      .map((detail) => detail.value)
      .join(' · ');
  }
  if (item.type === 'performance') {
    const first = projection.performance.items[0];
    const performer = displayText(first?.performerName);
    return [
      `공연 ${projection.performance.items.length}건`,
      performer,
    ].filter(Boolean).join(' · ');
  }
  if (item.type === 'vows') {
    return projection.vow.participant
      ? `${projection.vow.participant} 낭독`
      : '낭독자 확인 필요';
  }
  if (item.type === 'pronouncement') {
    return projection.declaration.participant
      ? `${projection.declaration.participant} 진행`
      : '진행자 확인 필요';
  }
  if (item.type === 'speech') {
    const label = item.detailConfig.speechType === 'congratulatory' ? '축사' : '덕담';
    return projection.blessingOrSpeech.participant
      ? `${projection.blessingOrSpeech.participant} ${label}`
      : `${label} 진행자 확인 필요`;
  }
  return checklistSummary(item, projection);
}

export function buildCeremonyReviewRows(
  draft: CeremonyDraft,
  projection: CeremonyProjection,
  script: ScriptPackage,
  issues: ValidationIssue[] = [],
): CeremonyReviewRow[] {
  return [...draft.items]
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const summary = rowSummary(item, projection);
      const warnings = [
        ...validationWarnings(item, issues),
        ...projection.sourceWarnings
          .filter((warning) => projectionWarningForItem(warning, item))
          .map((warning) => cleanWarning(warning, item)),
        ...(summary.includes('확인 필요') ? ['진행 정보를 확인해 주세요.'] : []),
      ].filter((value, index, values) => values.indexOf(value) === index);
      return {
        sourceId: item.id,
        title: ceremonyItemDisplayTitle(item),
        summary,
        details: itemDetails(item, projection),
        cues: scriptValues(item, script, 'cue'),
        notes: scriptValues(item, script, 'note'),
        warnings,
      };
    });
}
