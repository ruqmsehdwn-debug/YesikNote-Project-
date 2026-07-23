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
import {
  buildCeremonyReviewRows,
  displayCues,
} from '../services/ceremonyReview';

type Props = {
  draft: CeremonyDraft;
  projection: CeremonyProjection;
  script: ScriptPackage;
  issues?: ValidationIssue[];
  onNotify?: (message: string) => void;
  onEdit?: (issue: ValidationIssue) => void;
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

function performanceSummary(performance: PerformanceProjection) {
  if (!performance.items.length) return '확인 필요';
  const songCount = performance.items
    .filter((item) => item.type === 'song').length;
  return [
    songCount === performance.items.length
      ? `축가 ${songCount}곡`
      : `공연 ${performance.items.length}건`,
    ...performance.items.map((item, index) => {
      const performer = [
        item.performerName.trim(),
        item.performerRelation?.trim(),
      ].filter(Boolean).join(' · ');
      const detail = [
        item.title?.trim(),
        performer,
      ].filter(Boolean).join('\n');
      return `${index + 1}. ${performanceTypeLabels[item.type]}${detail ? `\n${detail}` : ''}`;
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
  onEdit,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showFullTable, setShowFullTable] = useState(false);
  const orderedItems = [...draft.items].sort((a, b) => a.order - b.order);
  const activeItems = orderedItems.filter((item) => item.active);
  const inactiveItems = orderedItems.filter((item) => !item.active);
  const tableItems = orderedItems.filter(
    (item) => item.active || item.type === 'ring_exchange',
  );
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

  const editRow = (sourceId: string) => {
    const issue = issues.find(
      (candidate) => (
        candidate.severity === 'blocking'
        && (candidate.ceremonyItemId ?? candidate.itemId) === sourceId
      ),
    );
    if (issue && onEdit) {
      onEdit(issue);
      return;
    }
    setExpandedIds((previous) => new Set(previous).add(sourceId));
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
          const needsUserAction = row.userActions.length > 0;
          const needsFieldConfirmation = row.fieldConfirmations.length > 0;
          return (
            <li
              key={row.sourceId}
              className={[
                'final-review-item',
                needsUserAction ? 'needs-review' : '',
                needsFieldConfirmation ? 'needs-field-confirmation' : '',
                !row.active ? 'inactive' : '',
              ].filter(Boolean).join(' ')}
              data-source-id={row.sourceId}
            >
              <div className="final-review-main">
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
                    {!!(row.cues.length + row.notes.length) && (
                      <small className="final-review-support-count">
                        현장 메모 {row.cues.length + row.notes.length}개
                      </small>
                    )}
                  </span>
                </button>
                {!row.active ? (
                  <span className="review-status-badge inactive">미진행</span>
                ) : needsUserAction ? (
                  <button
                    type="button"
                    className="review-status-badge action"
                    onClick={() => editRow(row.sourceId)}
                  >
                    수정 필요 {row.userActions.length}
                  </button>
                ) : needsFieldConfirmation ? (
                  <span className="review-status-badge field">
                    현장 확인 {row.fieldConfirmations.length}
                  </span>
                ) : (
                  <span className="review-status-badge complete">확인 완료</span>
                )}
                <button
                  type="button"
                  className={`final-review-action ${needsUserAction ? 'fix' : ''}`}
                  aria-expanded={needsUserAction ? undefined : expanded}
                  onClick={() => needsUserAction
                    ? editRow(row.sourceId)
                    : toggleExpanded(row.sourceId)}
                >
                  {needsUserAction ? '바로 수정' : expanded ? '접기' : '자세히 보기'}
                </button>
              </div>
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
                  {!!row.userActions.length && (
                    <section className="review-row-warnings user-action" aria-label={`${row.title} 수정 필요`}>
                      <h3>수정 필요</h3>
                      <ul>{row.userActions.map((warning) => (
                        <li key={warning}>
                          <button type="button" onClick={() => editRow(row.sourceId)}>{warning}</button>
                        </li>
                      ))}</ul>
                    </section>
                  )}
                  {!!row.fieldConfirmations.length && (
                    <section className="review-row-warnings field-confirmation" aria-label={`${row.title} 현장 확인`}>
                      <h3>현장 확인</h3>
                      <ul>{row.fieldConfirmations.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}</ul>
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
            {projection.officiantType === 'officiant' && (
              <div><dt>주례 정보</dt><dd><SheetValue value={projection.officiant.status === 'known' ? projection.officiant.summary : '확인 필요'} /></dd></div>
            )}
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
                {tableItems.map((item) => {
                  const index = activeItems.findIndex((candidate) => candidate.id === item.id);
                  const rawCues = supportValues(item, script, 'cue');
                  const cues = item.active
                    ? displayCues(item, rawCues.map((cue) => cue.value))
                      .map((value) => ({ id: `${item.id}-display-cue-${value}`, value }))
                    : [];
                  const notes = item.active ? supportValues(item, script, 'note') : [];
                  const reviewRow = reviewRows.find((row) => row.sourceId === item.id);
                  const warnings = [
                    ...(reviewRow?.userActions ?? []),
                    ...(reviewRow?.fieldConfirmations ?? []),
                  ];
                  return (
                    <tr key={item.id} data-source-id={item.id}>
                      <td data-label="순번">{item.active ? index + 1 : '—'}</td>
                      <th scope="row" data-label="식순">{ceremonyItemDisplayTitle(item)}</th>
                      <td data-label="진행 정보" className="sheet-summary">
                        {item.active ? tableSummary(item, projection) : '미진행'}
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
            <h3 id="final-sheet-confirmations-title">예식장과 확인할 항목</h3>
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
