import type {
  CeremonyProjection,
  CeremonyProjectionSummary,
} from '../services/ceremonyProjection';
import { StatusBadge } from './StatusBadge';

type Props = {
  projection: CeremonyProjection;
  onNavigate?: (sourceId: string | undefined, message: string) => void;
};

function summaryValue(summary: CeremonyProjectionSummary) {
  return summary.status === 'unknown' || summary.summary.includes('UNKNOWN')
    ? '확인 필요'
    : summary.summary;
}

function speechValue(
  summary: CeremonyProjectionSummary,
  kind: '덕담' | '축사',
) {
  if (!summary.active) return summaryValue(summary);
  return summary.summary.startsWith(kind) ? summaryValue(summary) : '확인 필요';
}

function displayWarning(value: string) {
  return value.replace(/ \([a-z0-9-]{20,}\)$/i, '');
}

export function VenueChecklistPreview({ projection, onNavigate }: Props) {
  const rows = [
    {
      label: '예식 형태',
      value: projection.ceremonyType.status === 'known'
        ? projection.ceremonyType.label
        : '확인 필요',
      sourceId: undefined,
    },
    ...(projection.officiantType === 'officiant'
      ? [{
        label: '주례 정보',
        value: summaryValue(projection.officiant),
        sourceId: projection.officiant.sourceId ?? undefined,
        status: projection.officiant.active ? undefined : 'inactive' as const,
      }]
      : []),
    {
      label: '화촉점화',
      value: summaryValue(projection.candleLighting),
      sourceId: projection.candleLighting.sourceId ?? undefined,
      status: !projection.candleLighting.active && projection.candleLighting.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '신랑 입장',
      value: summaryValue(projection.entrance.groom),
      sourceId: projection.entrance.groom.sourceId ?? undefined,
      status: !projection.entrance.groom.active && projection.entrance.groom.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '신부 입장 및 동반자',
      value: summaryValue(projection.entrance.bride),
      sourceId: projection.entrance.bride.sourceId ?? undefined,
      status: !projection.entrance.bride.active && projection.entrance.bride.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '혼인서약',
      value: summaryValue(projection.vow),
      sourceId: projection.vow.sourceId ?? undefined,
      roleLabel: projection.vow.active && projection.vow.participant ? '낭독자' : undefined,
      roleValue: projection.vow.active ? projection.vow.participant : undefined,
      status: !projection.vow.active && projection.vow.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '성혼선언',
      value: summaryValue(projection.declaration),
      sourceId: projection.declaration.sourceId ?? undefined,
      roleLabel: projection.declaration.active && projection.declaration.participant ? '진행자' : undefined,
      roleValue: projection.declaration.active ? projection.declaration.participant : undefined,
      status: !projection.declaration.active && projection.declaration.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '덕담',
      value: speechValue(projection.blessingOrSpeech, '덕담'),
      sourceId: projection.blessingOrSpeech.sourceId ?? undefined,
      roleLabel: projection.blessingOrSpeech.active
        && projection.blessingOrSpeech.summary.startsWith('덕담')
        && projection.blessingOrSpeech.participant
        ? '덕담자'
        : undefined,
      roleValue: projection.blessingOrSpeech.summary.startsWith('덕담')
        ? projection.blessingOrSpeech.participant
        : undefined,
    },
    {
      label: '축사',
      value: speechValue(projection.blessingOrSpeech, '축사'),
      sourceId: projection.blessingOrSpeech.sourceId ?? undefined,
      roleLabel: projection.blessingOrSpeech.active
        && projection.blessingOrSpeech.summary.startsWith('축사')
        && projection.blessingOrSpeech.participant
        ? '축사자'
        : undefined,
      roleValue: projection.blessingOrSpeech.summary.startsWith('축사')
        ? projection.blessingOrSpeech.participant
        : undefined,
    },
    {
      label: '축가·축무',
      value: summaryValue(projection.performance),
      sourceId: projection.performance.sourceId ?? undefined,
      status: !projection.performance.active && projection.performance.status === 'known'
        ? 'inactive' as const
        : undefined,
      performanceItems: projection.performance.active
        ? projection.performance.items
        : undefined,
    },
    {
      label: '예물교환',
      value: summaryValue(projection.giftExchange),
      sourceId: projection.giftExchange.sourceId ?? undefined,
      status: !projection.giftExchange.active && projection.giftExchange.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '양가 부모님 및 내빈께 인사',
      value: summaryValue(projection.familyGreeting),
      sourceId: projection.familyGreeting.sourceId ?? undefined,
      status: !projection.familyGreeting.active && projection.familyGreeting.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    {
      label: '행진',
      value: summaryValue(projection.procession),
      sourceId: projection.procession.sourceId ?? undefined,
      status: !projection.procession.active && projection.procession.status === 'known'
        ? 'inactive' as const
        : undefined,
    },
    { label: '자료 준비 상태', value: '확인 필요', sourceId: undefined },
    {
      label: '음원 재생 타이밍',
      value: '확인 필요',
      sourceId: projection.procession.sourceId ?? undefined,
    },
  ];
  const projectionSourceIds = rows
    .map(({ sourceId }) => sourceId)
    .filter((sourceId): sourceId is string => !!sourceId);
  const warningSourceId = (warning: string) => {
    const direct = projectionSourceIds
      .find((sourceId) => warning.includes(`(${sourceId})`));
    if (direct) return direct;
    if (warning.includes('화촉점화')) return projection.candleLighting.sourceId ?? undefined;
    if (warning.includes('혼인서약')) return projection.vow.sourceId ?? undefined;
    if (warning.includes('성혼선언')) return projection.declaration.sourceId ?? undefined;
    if (warning.includes('덕담') || warning.includes('축사')) {
      return projection.blessingOrSpeech.sourceId ?? undefined;
    }
    if (warning.includes('공연') || warning.includes('축가') || warning.includes('축무')) {
      return projection.performance.sourceId ?? undefined;
    }
    if (warning.includes('신랑 입장')) return projection.entrance.groom.sourceId ?? undefined;
    if (warning.includes('신부 입장')) return projection.entrance.bride.sourceId ?? undefined;
    if (warning.includes('행진') || warning.includes('음원')) {
      return projection.procession.sourceId ?? undefined;
    }
    return undefined;
  };

  return (
    <section className="venue-checklist-preview" aria-labelledby="venue-checklist-title">
      <header>
        <div>
          <span className="section-kicker">읽기 전용 · PROPOSED</span>
          <h2 id="venue-checklist-title">예식장 전달용 체크표 미리보기</h2>
          <p>신랑·신부가 작성한 내용을 예식장과 사회자가 확인하기 쉬운 형식으로 정리한 미리보기입니다.</p>
        </div>
        <span className="readonly-badge">편집 불가</span>
      </header>

      <details className="venue-checklist-details">
        <summary>예식장 확인용 전체 요약 보기</summary>
        <dl className="venue-checklist-grid">
          {rows.map((row) => (
            <div className="venue-checklist-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd className={row.value === '확인 필요' ? 'needs-confirmation' : ''}>
                {row.status === 'inactive' ? (
                  <StatusBadge tone="inactive">미진행</StatusBadge>
                ) : row.value === '확인 필요' ? (
                  onNavigate
                    ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(row.sourceId, `${row.label} 확인 필요`)}
                      >
                        <StatusBadge tone="needs-review">확인 필요</StatusBadge>
                      </button>
                    )
                    : <StatusBadge tone="needs-review">확인 필요</StatusBadge>
                ) : row.performanceItems?.length ? (
                  <span className="checklist-performance">
                    <strong>축가 {row.performanceItems.length}곡</strong>
                    {row.performanceItems.map((performance) => (
                      <span key={performance.sourceId}>
                        <small>
                          {performance.type === 'song'
                            ? '축가자'
                            : performance.type === 'dance'
                              ? '공연자'
                              : '연주자'}
                        </small>
                        <b>{performance.performerName || '확인 필요'}</b>
                        {performance.title && <em>{performance.title}</em>}
                      </span>
                    ))}
                  </span>
                ) : row.roleLabel && row.roleValue ? (
                  <span className="checklist-role">
                    <small>{row.roleLabel}</small>
                    <strong>{row.roleValue}</strong>
                  </span>
                ) : (
                  row.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="venue-checklist-notes">
        <summary>
          현장 비고 {projection.notes.length}개 · 확인 필요 {projection.sourceWarnings.length}개
          <small>예식 당일 확인할 진행 메모입니다.</small>
        </summary>
        {projection.notes.length ? (
          <ul>
            {projection.notes.map((note) => (
              <li key={`${note.sourceId}-${note.value}`}>
                <strong>{note.title}</strong>
                <span>{note.value}</span>
              </li>
            ))}
          </ul>
        ) : <p>현재 등록된 현장 비고가 없습니다.</p>}
      </details>

      {!!projection.sourceWarnings.length && (
        <details className="venue-checklist-warnings">
          <summary>예식장 확인 필요사항 {projection.sourceWarnings.length}개</summary>
          <ul>
            {projection.sourceWarnings.map((warning) => (
              <li key={warning}>
                {onNavigate
                  ? <button type="button" onClick={() => onNavigate(warningSourceId(warning), warning)}>{displayWarning(warning)}</button>
                  : displayWarning(warning)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
