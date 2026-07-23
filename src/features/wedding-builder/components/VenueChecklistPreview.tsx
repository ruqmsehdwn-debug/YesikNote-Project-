import type {
  CeremonyProjection,
  CeremonyProjectionSummary,
} from '../services/ceremonyProjection';

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
  const officiant = projection.officiantType === 'officiant'
    ? '주례 있음'
    : projection.officiantType === 'no_officiant'
      ? '무주례'
      : '확인 필요';
  const rows = [
    ['예식 형태', projection.ceremonyType.status === 'known'
      ? projection.ceremonyType.label
      : '확인 필요', undefined],
    ['주례 유무', officiant, undefined],
    ['화촉점화', summaryValue(projection.candleLighting), projection.candleLighting.sourceId ?? undefined],
    ['신랑 입장', summaryValue(projection.entrance.groom), projection.entrance.groom.sourceId ?? undefined],
    ['신부 입장 및 동반자', summaryValue(projection.entrance.bride), projection.entrance.bride.sourceId ?? undefined],
    ['혼인서약', summaryValue(projection.vow), projection.vow.sourceId ?? undefined],
    ['성혼선언', summaryValue(projection.declaration), projection.declaration.sourceId ?? undefined],
    ['덕담', speechValue(projection.blessingOrSpeech, '덕담'), projection.blessingOrSpeech.sourceId ?? undefined],
    ['축사', speechValue(projection.blessingOrSpeech, '축사'), projection.blessingOrSpeech.sourceId ?? undefined],
    ['축가·축무', summaryValue(projection.performance), projection.performance.sourceId ?? undefined],
    ['예물교환', summaryValue(projection.giftExchange), projection.giftExchange.sourceId ?? undefined],
    ['양가 부모님 및 내빈께 인사', summaryValue(projection.familyGreeting), projection.familyGreeting.sourceId ?? undefined],
    ['행진', summaryValue(projection.procession), projection.procession.sourceId ?? undefined],
    ['자료 준비 상태', '확인 필요', undefined],
    ['음원 재생 타이밍', '확인 필요', projection.procession.sourceId ?? undefined],
  ] as const;
  const projectionSourceIds = rows
    .map(([, , sourceId]) => sourceId)
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
          {rows.map(([label, value, sourceId]) => (
            <div className="venue-checklist-row" key={label}>
              <dt>{label}</dt>
              <dd className={value === '확인 필요' ? 'needs-confirmation' : ''}>
                {value === '확인 필요' && onNavigate
                  ? <button type="button" onClick={() => onNavigate(sourceId, `${label} 확인 필요`)}>{value}</button>
                  : value}
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
