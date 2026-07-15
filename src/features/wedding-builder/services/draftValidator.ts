import type {
  CeremonyDraft,
  CeremonyItem,
  ValidationIssue,
} from '../models/ceremony';
import { ceremonyItemDisplayTitle } from './scriptEngine';

function activeTree(items: CeremonyItem[]) {
  return items.flatMap((item) =>
    item.active ? [item, ...(item.children?.filter((child) => child.active) ?? [])] : [],
  );
}

export function validateDraft(draft: CeremonyDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const combinedMcLedVows = draft.items.some(
    (item) => item.active && item.type === 'vows' && item.detailConfig.mode === 'mc',
  ) && draft.items.some(
    (item) => item.active
      && item.type === 'pronouncement'
      && item.detailConfig.speakerMode === 'mc',
  );
  const requiredBasic = [
    ['weddingDate', draft.basicInfo.weddingDate, '예식일을 입력해 주세요.'],
    ['groomName', draft.basicInfo.groomName, '신랑 이름을 입력해 주세요.'],
    ['brideName', draft.basicInfo.brideName, '신부 이름을 입력해 주세요.'],
    ['banquetLocation', draft.basicInfo.banquetLocation, '피로연 장소를 입력해 주세요.'],
  ] as const;

  requiredBasic.forEach(([field, value, message]) => {
    if (!value.trim()) {
      issues.push({ id: `basic-${field}`, field, severity: 'blocking', message });
    }
  });

  if (
    (draft.ceremonyType === 'religious' || draft.ceremonyType === 'custom') &&
    !draft.items.some((item) => item.active)
  ) {
    issues.push({
      id: 'custom-type-empty',
      severity: 'blocking',
      message: '직접 진행할 식순을 하나 이상 추가해 주세요.',
    });
  }

  activeTree(draft.items).forEach((item) => {
    if (combinedMcLedVows && item.type === 'pronouncement') return;

    if (item.type === 'custom') {
      if (!item.title.trim()) {
        issues.push({
          id: `${item.id}-title`,
          itemId: item.id,
          field: 'title',
          severity: 'blocking',
          message: '자유 식순의 제목을 입력해 주세요.',
        });
      }
      if (!String(item.detailConfig.description ?? '').trim()) {
        issues.push({
          id: `${item.id}-description`,
          itemId: item.id,
          field: 'description',
          severity: 'blocking',
          message: '자유 식순의 설명을 입력해 주세요.',
        });
      }
      if (!item.narrationOverride?.trim()) {
        issues.push({
          id: `${item.id}-narration`,
          itemId: item.id,
          field: 'narrationOverride',
          severity: 'blocking',
          message: '자유 식순의 MC 대본을 입력해 주세요.',
        });
      }
    }

    if (!item.useDefaultNarration && !item.narrationOverride?.trim()) {
      issues.push({
        id: `${item.id}-override`,
        itemId: item.id,
        field: 'narrationOverride',
        severity: 'blocking',
        message: `${ceremonyItemDisplayTitle(item)}의 MC 대본을 입력해 주세요.`,
      });
    }

    const people = item.participants ?? [];
    people.forEach((person) => {
      if (!person.name.trim() && !person.displayTitle?.trim()) {
        issues.push({
          id: `${item.id}-${person.id}-name`,
          itemId: item.id,
          severity: 'blocking',
          message: `${ceremonyItemDisplayTitle(item)} 소개 대상의 이름 또는 호칭을 입력해 주세요.`,
        });
      }
      if (person.introMode === 'custom' && !person.introText?.trim()) {
        issues.push({
          id: `${item.id}-${person.id}-intro`,
          itemId: item.id,
          severity: 'blocking',
          message: '소개 멘트를 입력해 주세요.',
        });
      }
    });

    if (
      ['officiant_entrance', 'speech'].includes(item.type) &&
      people.length === 0
    ) {
      issues.push({
        id: `${item.id}-required-person`,
        itemId: item.id,
        severity: 'blocking',
        message: `${ceremonyItemDisplayTitle(item)} 소개 대상의 이름 또는 호칭을 입력해 주세요.`,
      });
    }

    if (
      item.type === 'pronouncement' &&
      !['mc', 'officiant'].includes(String(item.detailConfig.speakerMode)) &&
      people.length === 0
    ) {
      issues.push({
        id: `${item.id}-required-speaker`,
        itemId: item.id,
        severity: 'blocking',
        message: '성혼선언자의 이름 또는 호칭을 입력해 주세요.',
      });
    }

    if (
      item.type === 'ring_exchange' &&
      item.detailConfig.flowerChildEnabled &&
      !item.detailConfig.flowerChild?.name.trim() &&
      !item.detailConfig.flowerChild?.displayTitle?.trim()
    ) {
      issues.push({
        id: `${item.id}-flower-child`,
        itemId: item.id,
        severity: 'blocking',
        message: '화동의 이름 또는 표시 호칭을 입력해 주세요.',
      });
    }

    if (item.type === 'performance') {
      const performances = item.detailConfig.performances ?? [];
      if (performances.length === 0) {
        issues.push({
          id: `${item.id}-performance-empty`,
          itemId: item.id,
          severity: 'blocking',
          message: '진행할 공연을 하나 이상 추가하거나 이 식순을 미진행으로 바꿔 주세요.',
        });
      }
      performances.forEach((performance) => {
        if (!performance.performerName.trim()) {
          issues.push({
            id: `${item.id}-${performance.id}-performer`,
            itemId: item.id,
            severity: 'blocking',
            message: '공연자의 이름 또는 호칭을 입력해 주세요.',
          });
        }
      });
    }
  });

  const order = draft.items
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order)
    .map((item) => item.type);
  const vows = order.indexOf('vows');
  const rings = order.indexOf('ring_exchange');
  const pronouncement = order.indexOf('pronouncement');
  if (vows >= 0 && rings >= 0 && pronouncement >= 0 && !(vows < rings && rings < pronouncement)) {
    issues.push({
      id: 'recommended-core-order',
      severity: 'warning',
      message: '권장 순서는 혼인서약 → 예물교환 → 성혼선언입니다. 저장은 계속할 수 있습니다.',
    });
  }

  return issues;
}

export function completionRate(draft: CeremonyDraft) {
  const active = activeTree(draft.items);
  const basicValues = [
    draft.basicInfo.weddingDate,
    draft.basicInfo.groomName,
    draft.basicInfo.brideName,
    draft.basicInfo.banquetLocation,
  ];
  const completedBasic = basicValues.filter((value) => value.trim()).length;
  const customItems = active.filter((item) => item.type === 'custom');
  const completedCustom = customItems.filter(
    (item) =>
      item.title.trim() &&
      String(item.detailConfig.description ?? '').trim() &&
      item.narrationOverride?.trim(),
  ).length;
  const total = basicValues.length + customItems.length;
  return total ? Math.round(((completedBasic + completedCustom) / total) * 100) : 100;
}
