import { useMemo, useState } from 'react';
import type {
  CeremonyDraft,
  CeremonyItem,
  ScriptPackage,
  ValidationIssue,
} from '../models/ceremony';
import { ceremonyItemDisplayTitle } from '../services/scriptEngine';
import type {
  CeremonyProjection,
  PerformanceProjection,
} from '../services/ceremonyProjection';
import { buildCeremonyReviewRows } from '../services/ceremonyReview';

type Props = {
  draft: CeremonyDraft;
  projection: CeremonyProjection;
  script: ScriptPackage;
  issues?: ValidationIssue[];
  onNotify?: (message: string) => void;
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

function tableSummary(
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
  issues = [],
  onNotify,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showFullTable, setShowFullTable] = useState(false);
  const orderedItems = [...draft.items].sort((a, b) => a.order - b.order);
  const activeItems = orderedItems.filter((item) => item.active);
  const inactiveItems = orderedItems.filter((item) => !item.active);
  const reviewRows = useMemo(
    () => buildCeremonyReviewRows(draft, projection, script, issues),
    [draft, projection, script, issues],
  );

  const toggleExpanded = (sourceId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  };

  const preparePrint = () => {
    setShowFullTable(true);
    onNotify?.('인쇄 준비 완료');
    window.setTimeout(() => window.print(), 0);
  };

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
            기본 화면에서는 핵심 정보만 빠르게 확인하고, 각 식순을 펼치면
            진행 정보와 Cue·Note를 나누어 볼 수 있습니다.
          </p>
        </div>
        <div className="final-sheet-actions">
          <span className="readonly-badge">편집 불가</span>
          <button
            type="button"
            className="button secondary full-table-button"
            aria-expanded={showFullTable}
            onClick={() => setShowFullTable((value) => !value)}
          >
            {showFullTable ? '전체 표 닫기' : '전체 표 보기'}
          </button>
          <button
            type="button"
            className="button secondary print-sheet-button"
            onClick={preparePrint}
          >
            인쇄
          </button>
        </div>
      </header>

      <ol className="final-review-list" aria-label="최종 식순 간단 목록">
        {reviewRows.map((row, index) => {
          const expanded = expandedIds.has(row.sourceId);
          return (
            <li
              key={row.sourceId}
              className={`final-review-item ${row.warnings.length ? 'needs-review' : ''}`}
              data-source-id={row.sourceId}
            >
              <button
                type="button"
                className="final-review-toggle"
                aria-expanded={expanded}
                aria-controls={`final-review-detail-${row.sourceId}`}
                onClick={() => toggleExpanded(row.sourceId)}
              >
                <span className="final-review-number">{index + 1}</span>
                <span className="final-review-copy">
                  <strong>{row.title}</strong>
                  <small>{row.summary}</small>
                </span>
                <span className={`review-status-badge ${row.warnings.length ? 'warning' : 'complete'}`}>
                  {row.warnings.length ? `확인 필요 ${row.warnings.length}` : '확인 완료'}
                </span>
                <span className="final-review-action">
                  {expanded ? '접기' : '자세히 보기'}
                </span>
              </button>
              {expanded && (
                <div
                  id={`final-review-detail-${row.sourceId}`}
                  className="final-review-detail"
                >
                  <dl>
                    {row.details.map((detail, detailIndex) => (
                      <div key={`${detail.label}-${detailIndex}`}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="final-review-support-grid">
                    <section className="review-cue">
                      <h3>Cue</h3>
                      {row.cues.length
                        ? <ul>{row.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
                        : <p>별도 Cue가 없습니다.</p>}
                    </section>
                    <section className="review-note">
                      <h3>Note</h3>
                      {row.notes.length
                        ? <ul>{row.notes.map((note) => <li key={note}>{note}</li>)}</ul>
                        : <p>별도 Note가 없습니다.</p>}
                    </section>
                  </div>
                  {!!row.warnings.length && (
                    <section className="review-row-warnings" aria-label={`${row.title} 확인 필요`}>
                      <h3>확인 필요</h3>
                      <ul>{row.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                    </section>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {showFullTable && (
        <div className="final-sheet-full-view">
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
                        {tableSummary(item, projection)}
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
        </div>
      )}
    </section>
  );
}
