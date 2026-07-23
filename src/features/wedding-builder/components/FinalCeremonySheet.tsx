import type {
  CeremonyDraft,
  CeremonyItem,
  ScriptPackage,
} from '../models/ceremony';
import {
  ceremonyItemDisplayTitle,
} from '../services/scriptEngine';
import type {
  CeremonyProjection,
  PerformanceProjection,
} from '../services/ceremonyProjection';

type Props = {
  draft: CeremonyDraft;
  projection: CeremonyProjection;
  script: ScriptPackage;
};

const performanceTypeLabels: Record<
  PerformanceProjection['items'][number]['type'],
  string
> = {
  song: '축가',
  dance: '축무',
  instrumental: '축주',
};

function valueOrConfirmation(value?: string) {
  return value?.trim() || '확인 필요';
}

function formatWeddingDate(value: string) {
  if (!value) return '확인 필요';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 필요';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function venueLabel(draft: CeremonyDraft) {
  const values = [
    draft.basicInfo.venueName.trim(),
    draft.basicInfo.hallName.trim(),
  ].filter(Boolean);
  return values.length ? values.join(' · ') : '확인 필요';
}

function officiantLabel(projection: CeremonyProjection) {
  if (projection.officiantType === 'officiant') return '주례 있음';
  if (projection.officiantType === 'no_officiant') return '무주례';
  return '확인 필요';
}

function cleanWarning(warning: string, sourceId: string) {
  return warning.replace(` (${sourceId})`, '');
}

function cleanAllSourceIds(
  warning: string,
  items: CeremonyItem[],
) {
  return items.reduce(
    (value, item) => cleanWarning(value, item.id),
    warning,
  );
}

function warningsForItem(
  item: CeremonyItem,
  projection: CeremonyProjection,
) {
  return projection.sourceWarnings
    .filter((warning) => (
      warning.includes(`(${item.id})`)
      || warning.includes(item.title)
      || warning.includes(ceremonyItemDisplayTitle(item))
    ))
    .map((warning) => cleanWarning(warning, item.id));
}

function performanceSummary(performance: PerformanceProjection) {
  if (!performance.items.length) return '확인 필요';
  return [
    `공연 카드 ${performance.items.length}건`,
    ...performance.items.map((item, index) => {
      const performer = [
        item.performerName.trim(),
        item.performerRelation?.trim(),
      ].filter(Boolean).join(' · ');
      const detail = [
        item.title?.trim(),
        performer,
      ].filter(Boolean).join(' / ');
      return `${index + 1}. ${performanceTypeLabels[item.type]}${detail ? ` — ${detail}` : ''}`;
    }),
  ].join('\n');
}

function rowSummary(
  item: CeremonyItem,
  projection: CeremonyProjection,
) {
  if (item.id === projection.performance.sourceId) {
    return performanceSummary(projection.performance);
  }
  const checklistItem = projection.venueChecklistItems
    .find((candidate) => candidate.sourceId === item.id);
  if (!checklistItem) return '확인 필요';
  if (
    checklistItem.summary.includes('UNKNOWN')
    || checklistItem.summary === '진행 · 세부 정보 UNKNOWN'
  ) {
    return '확인 필요';
  }
  return checklistItem.summary;
}

function supportValues(
  item: CeremonyItem,
  script: ScriptPackage,
  field: 'cue' | 'note',
) {
  return script.ceremonySections
    .filter((section) => section.id === item.id || section.parentId === item.id)
    .flatMap((section) => section[field].map((value) => ({
      id: `${section.id}-${field}-${value}`,
      value: section.id === item.id ? value : `${section.title}: ${value}`,
    })));
}

function SheetValue({ value }: { value: string }) {
  return (
    <span className={value === '확인 필요' ? 'needs-confirmation' : ''}>
      {value}
    </span>
  );
}

function SupportList({
  values,
}: {
  values: Array<{ id: string; value: string }>;
}) {
  if (!values.length) return <span className="sheet-empty">—</span>;
  return (
    <ul>
      {values.map((item) => <li key={item.id}>{item.value}</li>)}
    </ul>
  );
}

export function FinalCeremonySheet({
  draft,
  projection,
  script,
}: Props) {
  const orderedItems = [...draft.items].sort((a, b) => a.order - b.order);
  const activeItems = orderedItems.filter((item) => item.active);
  const inactiveItems = orderedItems.filter((item) => !item.active);

  return (
    <section
      className="final-ceremony-sheet"
      aria-labelledby="final-ceremony-sheet-title"
    >
      <header className="final-sheet-header">
        <div>
          <span className="section-kicker">읽기 전용 · PROPOSED</span>
          <h2 id="final-ceremony-sheet-title">최종 예식 식순표</h2>
          <p>
            신랑·신부가 작성한 최종 식순과 진행 정보를 예식장, 예도,
            사회자가 함께 확인할 수 있도록 정리한 표입니다.
          </p>
        </div>
        <div className="final-sheet-actions">
          <span className="readonly-badge">편집 불가</span>
          <button
            type="button"
            className="button secondary print-sheet-button"
            onClick={() => window.print()}
          >
            인쇄
          </button>
        </div>
      </header>

      <dl className="final-sheet-meta">
        <div><dt>신랑</dt><dd><SheetValue value={valueOrConfirmation(draft.basicInfo.groomName)} /></dd></div>
        <div><dt>신부</dt><dd><SheetValue value={valueOrConfirmation(draft.basicInfo.brideName)} /></dd></div>
        <div><dt>예식 날짜</dt><dd><SheetValue value={formatWeddingDate(draft.basicInfo.weddingDate)} /></dd></div>
        <div><dt>예식 시간</dt><dd><span className="needs-confirmation">확인 필요</span></dd></div>
        <div><dt>예식장·홀</dt><dd><SheetValue value={venueLabel(draft)} /></dd></div>
        <div><dt>예식 형태</dt><dd><SheetValue value={projection.ceremonyType.status === 'known' ? projection.ceremonyType.label : '확인 필요'} /></dd></div>
        <div><dt>주례 유무</dt><dd><SheetValue value={officiantLabel(projection)} /></dd></div>
        <div><dt>현재 상태</dt><dd>미리보기 · PROPOSED</dd></div>
      </dl>

      <div className="final-sheet-table-wrap">
        <table className="final-sheet-table">
          <thead>
            <tr>
              <th scope="col">순번</th>
              <th scope="col">식순</th>
              <th scope="col">진행 정보</th>
              <th scope="col">Cue</th>
              <th scope="col">Note</th>
              <th scope="col">확인 필요</th>
            </tr>
          </thead>
          <tbody>
            {activeItems.map((item, index) => {
              const cues = supportValues(item, script, 'cue');
              const notes = supportValues(item, script, 'note');
              const warnings = warningsForItem(item, projection);
              return (
                <tr key={item.id} data-source-id={item.id}>
                  <td data-label="순번">{index + 1}</td>
                  <th scope="row" data-label="식순">{ceremonyItemDisplayTitle(item)}</th>
                  <td data-label="진행 정보" className="sheet-summary">
                    {rowSummary(item, projection)}
                  </td>
                  <td data-label="Cue"><SupportList values={cues} /></td>
                  <td data-label="Note"><SupportList values={notes} /></td>
                  <td data-label="확인 필요">
                    {warnings.length ? (
                      <ul className="sheet-warnings">
                        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    ) : <span className="sheet-empty">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!!inactiveItems.length && (
        <section className="inactive-ceremony-items" aria-labelledby="inactive-ceremony-title">
          <h3 id="inactive-ceremony-title">미진행 식순</h3>
          <p>인쇄용 기본 표에서는 제외되며 입력값은 Draft에 그대로 보존됩니다.</p>
          <ul>
            {inactiveItems.map((item) => (
              <li key={item.id}>{ceremonyItemDisplayTitle(item)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="final-sheet-confirmations" aria-labelledby="final-sheet-confirmations-title">
        <h3 id="final-sheet-confirmations-title">공동 확인 필요사항</h3>
        {projection.sourceWarnings.length ? (
          <ul>
            {projection.sourceWarnings.map((warning) => (
              <li key={warning}>
                {cleanAllSourceIds(warning, orderedItems)}
              </li>
            ))}
          </ul>
        ) : <p>현재 Projection에서 추가로 확인할 항목이 없습니다.</p>}
      </section>

      <footer className="final-sheet-footer">
        <span>출력 기준: Draft 마지막 수정 {formatUpdatedAt(draft.updatedAt)}</span>
        <span>Final Snapshot이 아닌 읽기 전용 미리보기입니다.</span>
      </footer>
    </section>
  );
}
