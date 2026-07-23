import type {
  CeremonyProjection,
  CeremonyProjectionSummary,
} from '../services/ceremonyProjection';

type Props = {
  projection: CeremonyProjection;
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

export function VenueChecklistPreview({ projection }: Props) {
  const officiant = projection.officiantType === 'officiant'
    ? '주례 있음'
    : projection.officiantType === 'no_officiant'
      ? '무주례'
      : '확인 필요';
  const rows = [
    ['예식 형태', projection.ceremonyType.status === 'known'
      ? projection.ceremonyType.label
      : '확인 필요'],
    ['주례 유무', officiant],
    ['화촉점화', summaryValue(projection.candleLighting)],
    ['신랑 입장', summaryValue(projection.entrance.groom)],
    ['신부 입장 및 동반자', summaryValue(projection.entrance.bride)],
    ['혼인서약', summaryValue(projection.vow)],
    ['성혼선언', summaryValue(projection.declaration)],
    ['덕담', speechValue(projection.blessingOrSpeech, '덕담')],
    ['축사', speechValue(projection.blessingOrSpeech, '축사')],
    ['축가·축무', summaryValue(projection.performance)],
    ['예물교환', summaryValue(projection.giftExchange)],
    ['양가 부모님 및 내빈께 인사', summaryValue(projection.familyGreeting)],
    ['행진', summaryValue(projection.procession)],
    ['자료 준비 상태', '확인 필요'],
    ['음원 재생 타이밍', '확인 필요'],
  ] as const;

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

      <dl className="venue-checklist-grid">
        {rows.map(([label, value]) => (
          <div className="venue-checklist-row" key={label}>
            <dt>{label}</dt>
            <dd className={value === '확인 필요' ? 'needs-confirmation' : ''}>{value}</dd>
          </div>
        ))}
      </dl>

      {!!projection.notes.length && (
        <section className="venue-checklist-notes" aria-labelledby="venue-notes-title">
          <h3 id="venue-notes-title">현장 비고</h3>
          <ul>
            {projection.notes.map((note) => (
              <li key={`${note.sourceId}-${note.value}`}>
                <strong>{note.title}</strong>
                <span>{note.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="venue-checklist-warnings" aria-labelledby="venue-warnings-title">
        <h3 id="venue-warnings-title">확인 필요</h3>
        {projection.sourceWarnings.length ? (
          <ul>
            {projection.sourceWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        ) : <p>현재 Projection에서 추가로 확인할 항목이 없습니다.</p>}
      </section>
    </section>
  );
}
