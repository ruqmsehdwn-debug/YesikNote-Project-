import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createCustomItem,
  createId,
  createTemplate,
  resetOrders,
  restoreCanonicalOrder,
} from '../data/ceremonyTemplates';
import type {
  CeremonyDraft,
  CeremonyItem,
  CeremonyType,
  SaveStatus,
  ValidationIssue,
} from '../models/ceremony';
import { completionRate, validateDraft } from '../services/draftValidator';
import { ceremonyItemDisplayTitle, generateScript } from '../services/scriptEngine';
import {
  ItemDetailEditor,
  type ItemFocusTarget,
} from '../components/ItemDetailEditor';
import { ScriptPreview } from '../components/ScriptPreview';
import { SortableItemList } from '../components/SortableItemList';
import { VenueChecklistPreview } from '../components/VenueChecklistPreview';
import { FinalCeremonySheet } from '../components/FinalCeremonySheet';
import { CeremonyItemNavigator } from '../components/CeremonyItemNavigator';
import {
  ToastRegion,
  type ToastMessage,
} from '../components/ToastRegion';
import { buildCeremonyProjection } from '../services/ceremonyProjection';

type Props = {
  draft: CeremonyDraft;
  setDraft: (update: CeremonyDraft | ((previous: CeremonyDraft) => CeremonyDraft)) => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  onSaveNow?: () => boolean;
  compositionHandlers: {
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  };
};

const steps = ['예식 기본정보', '예식 유형', '전체 식순', '상세 설정', '최종 확인'];

type BasicFocusTarget = {
  field: string;
  requestId: number;
};

type ReviewFlowState = {
  issueIds: string[];
  currentIssueId: string;
};

export function OwnerBuilderPage({
  draft,
  setDraft,
  saveStatus,
  lastSavedAt,
  onSaveNow,
  compositionHandlers,
}: Props) {
  const [step, setStepState] = useState(Math.min(Math.max(draft.lastStep, 1), 5));
  const [selectedId, setSelectedId] = useState(draft.items[0]?.id);
  const [basicFocusTarget, setBasicFocusTarget] = useState<BasicFocusTarget>();
  const [performanceFocusTarget, setPerformanceFocusTarget] = useState<{ ceremonyItemId: string; section?: string; performanceId?: string; field?: string; requestId: number }>();
  const [itemFocusTarget, setItemFocusTarget] = useState<ItemFocusTarget>();
  const [reviewFlow, setReviewFlow] = useState<ReviewFlowState>();
  const [toast, setToast] = useState<ToastMessage>();
  const toastIdRef = useRef(0);
  const editRequestRef = useRef(0);
  const script = useMemo(() => generateScript(draft), [draft]);
  const ceremonyProjection = useMemo(
    () => buildCeremonyProjection(draft, script),
    [draft, script],
  );
  const issues = useMemo(() => validateDraft(draft), [draft]);
  const blocking = issues.filter((issue) => issue.severity === 'blocking');
  const selectedItem = draft.items.find((item) => item.id === selectedId) ?? draft.items[0];
  const pronouncementParticipant = draft.items
    .find((item) => item.type === 'pronouncement')
    ?.participants?.[0];
  const displayedSelectedItem = selectedItem
    ? { ...selectedItem, title: ceremonyItemDisplayTitle(selectedItem) }
    : undefined;

  const notify = useCallback((text: string) => {
    setToast({ id: ++toastIdRef.current, text });
  }, []);

  const setStep = (next: number) => {
    const value = Math.min(Math.max(next, 1), 5);
    if (value === 5 && step !== 5) notify('최종 식순표 업데이트 완료');
    setStepState(value);
    setDraft((previous) => ({ ...previous, lastStep: value }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateItems = (items: CeremonyItem[]) => setDraft((previous) => ({ ...previous, items: resetOrders(items) }));
  const selectItem = (id: string) => {
    setPerformanceFocusTarget(undefined);
    setItemFocusTarget(undefined);
    setSelectedId(id);
  };

  const focusPerformanceEntry = (
    ceremonyItemId: string,
    performanceId: string,
    announce = false,
  ) => {
    setSelectedId(ceremonyItemId);
    setItemFocusTarget(undefined);
    setPerformanceFocusTarget({
      ceremonyItemId,
      section: 'performances',
      performanceId,
      field: 'performerName',
      requestId: ++editRequestRef.current,
    });
    if (step !== 4) setStep(4);
    if (announce) notify('확인할 입력칸으로 이동했습니다.');
  };

  const withInitialPerformance = (item: CeremonyItem) => {
    if (
      item.type !== 'performance'
      || !item.active
      || (item.detailConfig.performances?.length ?? 0) > 0
    ) {
      return { item };
    }
    const performanceId = createId('performance');
    return {
      item: {
        ...item,
        detailConfig: {
          ...item.detailConfig,
          performances: [{
            id: performanceId,
            type: 'song' as const,
            performerName: '',
            samePerformerAsPrevious: false,
            order: 0,
          }],
        },
      },
      performanceId,
    };
  };

  const updateItem = (next: CeremonyItem) => {
    const previous = draft.items.find((item) => item.id === next.id);
    const activating = !!previous && !previous.active && next.active;
    const prepared = activating ? withInitialPerformance(next) : { item: next };
    updateItems(draft.items.map((item) => item.id === next.id ? prepared.item : item));
    if (prepared.performanceId) {
      focusPerformanceEntry(next.id, prepared.performanceId);
    }
  };

  const toggleItem = (id: string) => {
    let createdPerformanceId: string | undefined;
    const items = draft.items.map((item) => {
      if (item.id !== id) return item;
      const activating = !item.active;
      const toggled = {
        ...item,
        active: activating,
        detailConfig:
          activating && item.type === 'candle_lighting' && item.detailConfig.mode === 'omit'
            ? { ...item.detailConfig, mode: String(item.detailConfig.previousMode ?? 'mothers') }
            : item.detailConfig,
      };
      const prepared = activating ? withInitialPerformance(toggled) : { item: toggled };
      createdPerformanceId = prepared.performanceId;
      return prepared.item;
    });
    updateItems(items);
    if (createdPerformanceId) focusPerformanceEntry(id, createdPerformanceId);
  };

  const navigateToIssue = (issue: ValidationIssue) => {
    const ceremonyItemId = issue.ceremonyItemId ?? issue.itemId;
    if (!ceremonyItemId && issue.field) {
      setBasicFocusTarget({ field: issue.field, requestId: ++editRequestRef.current });
      setStep(1);
      notify('확인할 입력칸으로 이동했습니다.');
      return;
    }
    if (!ceremonyItemId) return;
    setSelectedId(ceremonyItemId);
    if (issue.section === 'performances' || issue.performanceId) {
      setItemFocusTarget(undefined);
      setPerformanceFocusTarget({
        ceremonyItemId,
        section: issue.section,
        performanceId: issue.performanceId,
        field: issue.field,
        requestId: ++editRequestRef.current,
      });
    } else {
      setPerformanceFocusTarget(undefined);
      setItemFocusTarget({
        field: issue.field,
        policyOnly: !issue.field,
        requestId: ++editRequestRef.current,
      });
    }
    setStep(4);
    notify('확인할 입력칸으로 이동했습니다.');
  };

  const startReviewFlow = (reviewIssues: ValidationIssue[]) => {
    const first = reviewIssues[0];
    if (!first) return;
    setReviewFlow({
      issueIds: reviewIssues.map((issue) => issue.id),
      currentIssueId: first.id,
    });
    navigateToIssue(first);
  };

  const reviewFlowTarget = (direction: -1 | 1) => {
    if (!reviewFlow) return undefined;
    const currentIndex = reviewFlow.issueIds.indexOf(reviewFlow.currentIssueId);
    const issueById = new Map(blocking.map((issue) => [issue.id, issue]));
    for (
      let index = currentIndex + direction;
      index >= 0 && index < reviewFlow.issueIds.length;
      index += direction
    ) {
      const issue = issueById.get(reviewFlow.issueIds[index]);
      if (issue) return issue;
    }
    return undefined;
  };

  const moveReviewFlow = (direction: -1 | 1) => {
    const target = reviewFlowTarget(direction);
    if (!target) {
      if (direction === 1) {
        setReviewFlow(undefined);
        setStep(5);
      }
      return;
    }
    setReviewFlow((previous) => previous
      ? { ...previous, currentIssueId: target.id }
      : previous);
    navigateToIssue(target);
  };

  const duplicateItem = (id: string) => {
    const index = draft.items.findIndex((item) => item.id === id);
    const source = draft.items[index];
    if (!source) return;
    const newId = createId('copy');
    const copy: CeremonyItem = {
      ...structuredClone(source),
      id: newId,
      title: `${source.title} 복사본`,
      children: source.children?.map((child) => ({ ...child, id: createId('child'), parentId: newId })),
    };
    const next = [...draft.items];
    next.splice(index + 1, 0, copy);
    updateItems(next);
    setSelectedId(newId);
  };

  const changeCeremonyType = (type: CeremonyType) => {
    if (type === draft.ceremonyType) return;
    if (draft.items.length > 0 && !window.confirm('예식 유형을 바꾸면 현재 식순이 새 기본값으로 교체됩니다. 계속할까요?')) return;
    const items = createTemplate(type);
    setDraft((previous) => ({ ...previous, ceremonyType: type, items }));
    setSelectedId(items[0]?.id);
  };

  return (
    <div className="owner-shell" {...compositionHandlers}>
      <header className="app-header">
        <Link to="/" className="brand" aria-label="예식노트 홈">
          <span className="brand-mark">예</span>
          <span><strong>예식노트</strong><small>Owner Script Builder</small></span>
        </Link>
        <div className="header-status">
          <span className="role-badge" aria-label="현재 화면: 신랑·신부용">신랑·신부용</span>
          <span className={`save-dot ${saveStatus}`} />
          <span>{saveStatus === 'saving' ? '저장 중…' : saveStatus === 'failed' ? '저장하지 못했어요' : saveStatus === 'saved' ? '자동 저장됨' : '자동 저장'}{lastSavedAt && saveStatus === 'saved' ? ` · ${new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
          {onSaveNow && <button type="button" className="save-now-button" onClick={() => {
            if (onSaveNow()) notify('저장 완료');
          }}>{saveStatus === 'failed' ? '다시 저장' : '저장'}</button>}
        </div>
      </header>

      <div className="progress-wrap">
        <div className="completion-copy"><strong>작성률 {completionRate(draft)}%</strong><span>미결정 {blocking.length}개</span></div>
        <div className="completion-bar"><span style={{ width: `${completionRate(draft)}%` }} /></div>
        <nav className="step-nav" aria-label="작성 단계">
          {steps.map((label, index) => (
            <button type="button" key={label} className={step === index + 1 ? 'current' : step > index + 1 ? 'done' : ''} onClick={() => setStep(index + 1)}>
              <span>{index + 1}</span>{label}
            </button>
          ))}
        </nav>
      </div>

      <main className={`workspace ${step >= 3 && step <= 4 ? 'with-preview' : ''}`}>
        <section className="workspace-main">
          {step === 1 && <BasicInfoStep draft={draft} setDraft={setDraft} focusTarget={basicFocusTarget} />}
          {step === 2 && <CeremonyTypeStep draft={draft} onChange={changeCeremonyType} />}
          {step === 3 && (
            <OrderStep
              draft={draft}
              selectedId={selectedId}
              onItemsChange={updateItems}
              onReorder={(items) => {
                updateItems(items);
                notify('식순 순서 변경 완료');
              }}
              onSelect={(id) => { selectItem(id); setStep(4); }}
              onToggle={toggleItem}
              onDuplicate={duplicateItem}
              onDelete={(id) => {
                const target = draft.items.find((item) => item.id === id);
                if (target && window.confirm(`‘${ceremonyItemDisplayTitle(target)}’ 식순을 삭제할까요? 미진행과 달리 입력값도 삭제됩니다.`)) {
                  updateItems(draft.items.filter((item) => item.id !== id));
                }
              }}
              onAdd={() => {
                const custom = createCustomItem(draft.items.length);
                updateItems([...draft.items, custom]);
                setSelectedId(custom.id);
              }}
              onReset={() => {
                if (window.confirm('기존 입력값은 유지하고 식순을 기본 순서로 되돌릴까요?')) {
                  const items = restoreCanonicalOrder(draft.items, draft.ceremonyType);
                  updateItems(items);
                  setSelectedId(items[0]?.id);
                }
              }}
            />
          )}
          {step === 4 && (
            <div className="detail-layout">
              <CeremonyItemNavigator
                items={draft.items}
                selectedId={selectedItem?.id}
                issues={blocking}
                onSelect={selectItem}
              />
              {selectedItem && displayedSelectedItem ? (
                <ItemDetailEditor
                  item={displayedSelectedItem}
                  pronouncementParticipant={pronouncementParticipant}
                  performanceFocusTarget={performanceFocusTarget?.ceremonyItemId === selectedItem.id ? performanceFocusTarget : undefined}
                  itemFocusTarget={itemFocusTarget}
                  onPerformanceCreated={(performanceId) => focusPerformanceEntry(selectedItem.id, performanceId, true)}
                  onChange={(next) => updateItem({
                    ...next,
                    title: next.title === displayedSelectedItem.title ? selectedItem.title : next.title,
                  })}
                />
              ) : <EmptyCustom onAdd={() => { const custom = createCustomItem(0); updateItems([custom]); setSelectedId(custom.id); }} />}
            </div>
          )}
          {step === 5 && <ReviewStep draft={draft} script={script} projection={ceremonyProjection} blocking={blocking} onNotify={notify} onEdit={navigateToIssue} onStartReview={startReviewFlow} />}

          {reviewFlow && step !== 5 ? (
            <div className="step-controls review-flow-controls" aria-label="연속 확인 이동">
              <button
                type="button"
                className="button secondary"
                disabled={!reviewFlowTarget(-1)}
                onClick={() => moveReviewFlow(-1)}
              >
                이전 확인 항목
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setReviewFlow(undefined);
                  setStep(5);
                }}
              >
                최종 확인으로 나가기
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => moveReviewFlow(1)}
              >
                {reviewFlowTarget(1) ? '다음 확인 항목' : '확인 완료 후 돌아가기'}
              </button>
            </div>
          ) : (
            <div className="step-controls">
              <button type="button" className="button secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>이전</button>
              {step < 5 && <button type="button" className="button primary" onClick={() => setStep(step + 1)}>다음 단계</button>}
              {step === 5 && blocking.length === 0 && <Link className="button primary" to="/mc">사회자용 대본 열기</Link>}
            </div>
          )}
        </section>
        {step >= 3 && step <= 4 && <ScriptPreview script={script} items={draft.items} selectedCeremonyItemId={selectedId} />}
      </main>
      <ToastRegion message={toast} onDismiss={() => setToast(undefined)} />
    </div>
  );
}

function BasicInfoStep({ draft, setDraft, focusTarget }: Pick<Props, 'draft' | 'setDraft'> & { focusTarget?: BasicFocusTarget }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const update = (field: keyof CeremonyDraft['basicInfo'], value: string) => setDraft((previous) => ({ ...previous, basicInfo: { ...previous.basicInfo, [field]: value } }));
  useEffect(() => {
    if (!focusTarget) return;
    const field = sectionRef.current?.querySelector<HTMLElement>(`[data-basic-field="${focusTarget.field}"]`);
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
  }, [focusTarget]);
  return (
    <div className="page-section" ref={sectionRef}>
      <div className="page-heading"><span className="section-kicker">STEP 1</span><h1>두 분의 예식 정보를 알려주세요</h1><p>입력한 정보는 사회자 대본에 정확히 반영됩니다.</p></div>
      <div className="panel form-panel">
        <div className="form-grid two">
          <label>신랑 이름 <em>필수</em><input className="field-input" data-basic-field="groomName" value={draft.basicInfo.groomName} onChange={(e) => update('groomName', e.target.value)} placeholder="홍길동" /></label>
          <label>신부 이름 <em>필수</em><input className="field-input" data-basic-field="brideName" value={draft.basicInfo.brideName} onChange={(e) => update('brideName', e.target.value)} placeholder="김예식" /></label>
          <label>예식일 <em>필수</em><input className="field-input" data-basic-field="weddingDate" type="date" value={draft.basicInfo.weddingDate} onChange={(e) => update('weddingDate', e.target.value)} /></label>
          <label>예식장명<input className="field-input" value={draft.basicInfo.venueName} onChange={(e) => update('venueName', e.target.value)} placeholder="예식노트 웨딩홀" /></label>
          <label>홀명<input className="field-input" value={draft.basicInfo.hallName} onChange={(e) => update('hallName', e.target.value)} placeholder="그랜드홀" /></label>
        </div>
        <div className="venue-box">
          <div><span className="eyebrow">예식장 제공 정보 · 임시 입력</span><p>정식 서비스에서는 예식장이 관리하는 공식 정보입니다.</p></div>
          <div className="form-grid two">
            <label>피로연 장소 <em>필수</em><input className="field-input" data-basic-field="banquetLocation" value={draft.basicInfo.banquetLocation} onChange={(e) => update('banquetLocation', e.target.value)} placeholder="지하 1층 연회장" /></label>
            <label>사진 촬영 안내<input className="field-input" value={draft.basicInfo.photoGuide ?? ''} onChange={(e) => update('photoGuide', e.target.value)} placeholder="가족·친지 촬영 순서 안내" /></label>
          </div>
        </div>
        <label>전체 요청사항<textarea className="field-input" rows={4} value={draft.basicInfo.globalRequestNote ?? ''} onChange={(e) => update('globalRequestNote', e.target.value)} placeholder="예식 전체에서 사회자가 확인해야 할 내용을 적어 주세요." /><small>MC 화면 상단에 고정되며 낭독하지 않습니다.</small></label>
      </div>
    </div>
  );
}

function CeremonyTypeStep({ draft, onChange }: { draft: CeremonyDraft; onChange: (type: CeremonyType) => void }) {
  const options: Array<{ type: CeremonyType; title: string; count?: number; description: string }> = [
    { type: 'no_officiant', title: '주례 없는 예식', count: 13, description: '신랑·신부 중심의 완성형 기본 식순' },
    { type: 'officiant', title: '주례 있는 예식', count: 15, description: '주례 소개와 주례사가 포함된 기본 식순' },
    { type: 'religious', title: '예배식·종교식', description: '템플릿 준비 중 · 직접 식순 작성' },
    { type: 'custom', title: '기타·직접 구성', description: '템플릿 없이 모든 식순을 직접 작성' },
  ];
  return (
    <div className="page-section">
      <div className="page-heading"><span className="section-kicker">STEP 2</span><h1>예식 진행 방식을 선택하세요</h1><p>모든 기본 식순은 다음 단계에서 자유롭게 바꿀 수 있습니다.</p></div>
      <div className="type-grid">
        {options.map((option) => <button type="button" key={option.type} className={`type-card ${draft.ceremonyType === option.type ? 'selected' : ''}`} onClick={() => onChange(option.type)}><span className="type-radio" /><strong>{option.title}</strong><p>{option.description}</p>{option.count && <small>권장 식순 {option.count}개</small>}{(option.type === 'religious' || option.type === 'custom') && <span className="status-chip">템플릿 준비 중</span>}</button>)}
      </div>
      {(draft.ceremonyType === 'religious' || draft.ceremonyType === 'custom') && <div className="notice warm">이 유형은 MVP에서 기본 대본을 생성하지 않습니다. 다음 단계에서 자유 식순을 추가하고 제목, 설명, MC 대본을 직접 입력해 주세요.</div>}
    </div>
  );
}

function OrderStep({ draft, selectedId, onItemsChange, onReorder, onSelect, onToggle, onDuplicate, onDelete, onAdd, onReset }: { draft: CeremonyDraft; selectedId?: string; onItemsChange: (items: CeremonyItem[]) => void; onReorder: (items: CeremonyItem[]) => void; onSelect: (id: string) => void; onToggle: (id: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void; onReset: () => void }) {
  const storedTitles = new Map(draft.items.map((item) => [item.id, item.title]));
  const displayedItems = draft.items.map((item) => ({
    ...item,
    title: ceremonyItemDisplayTitle(item),
  }));
  return (
    <div className="page-section">
      <div className="heading-row"><div className="page-heading"><span className="section-kicker">STEP 3</span><h1>전체 식순을 완성하세요</h1><p>끌어서 옮기거나 화살표 버튼으로 순서를 조정하세요.</p></div><div className="heading-actions"><button type="button" className="button secondary" onClick={onReset} disabled={draft.ceremonyType === 'religious' || draft.ceremonyType === 'custom'}>기본 순서로 되돌리기</button><button type="button" className="button primary" onClick={onAdd}>+ 자유 식순 추가</button></div></div>
      {draft.items.length ? <SortableItemList items={displayedItems} selectedId={selectedId} onChange={(items) => onReorder(items.map((item) => ({ ...item, title: storedTitles.get(item.id) ?? item.title })))} onSelect={onSelect} onToggle={onToggle} onDuplicate={onDuplicate} onDelete={onDelete} onSpeechTypeChange={(id, speechType) => onItemsChange(draft.items.map((item) => item.id === id ? { ...item, detailConfig: { ...item.detailConfig, speechType } } : item))} /> : <EmptyCustom onAdd={onAdd} />}
    </div>
  );
}

function EmptyCustom({ onAdd }: { onAdd: () => void }) { return <div className="empty-state"><span className="empty-icon">＋</span><strong>직접 구성할 첫 식순을 추가해 주세요</strong><p>기본 대본은 생성되지 않으며 MC 대본을 직접 입력합니다.</p><button type="button" className="button primary" onClick={onAdd}>자유 식순 추가</button></div>; }

function reviewGuidance(rate: number, remainingCount: number) {
  if (rate === 0) return '필수 입력을 모두 완료하면 사회자용 대본을 확인할 수 있어요.';
  if (remainingCount > 0) {
    return `사회자용 대본을 확인하려면 필수 입력 ${remainingCount}개를 더 완료해 주세요.`;
  }
  return '필수 작성은 완료됐습니다. 현장 확인 항목은 아래에서 따로 확인해 주세요.';
}

function ownerFieldConfirmations(
  draft: CeremonyDraft,
  warnings: string[],
  userActions: ValidationIssue[],
) {
  const actionSourceIds = new Set(
    userActions
      .map((issue) => issue.ceremonyItemId ?? issue.itemId)
      .filter((sourceId): sourceId is string => !!sourceId),
  );
  return warnings.filter((warning) => {
    if (
      warning.includes('항목을 찾을 수 없습니다')
      || warning.includes('구조화된 인물 정보가 없습니다')
      || warning.includes('종교 예식 또는 직접 구성 예식')
    ) {
      return false;
    }
    return !draft.items.some((item) => (
      actionSourceIds.has(item.id)
      && (
        warning.includes(`(${item.id})`)
        || warning.includes(item.title)
        || warning.includes(ceremonyItemDisplayTitle(item))
      )
    ));
  });
}

function ReviewStep({ draft, script, projection, blocking, onEdit, onNotify, onStartReview }: { draft: CeremonyDraft; script: ReturnType<typeof generateScript>; projection: ReturnType<typeof buildCeremonyProjection>; blocking: ReturnType<typeof validateDraft>; onEdit: (issue: ValidationIssue) => void; onNotify: (message: string) => void; onStartReview: (issues: ValidationIssue[]) => void }) {
  const [copyError, setCopyError] = useState('');
  const rate = completionRate(draft);
  const activeOutputCount = script.ceremonySections.filter((section) => !section.parentId).length;
  const fieldConfirmations = ownerFieldConfirmations(
    draft,
    projection.sourceWarnings,
    blocking,
  );
  const ownerProjection = {
    ...projection,
    sourceWarnings: fieldConfirmations,
  };
  const fieldConfirmationCount = fieldConfirmations.length;
  const finalReviewComplete = blocking.length === 0 && fieldConfirmationCount === 0;
  const copyScript = async () => {
    const text = script.ceremonySections
      .map((section, index) => `${index + 1}. ${section.title}\n${section.narration}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyError('');
      onNotify('복사 완료');
    } catch {
      setCopyError('대본을 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };
  return (
    <div className="page-section">
      <div className="page-heading"><span className="section-kicker">STEP 5</span><h1>최종 대본을 확인하세요</h1><p>{reviewGuidance(rate, blocking.length)}</p></div>
      {!!blocking.length && <IssueSummary issues={blocking} items={draft.items} onEdit={onEdit} onStartReview={onStartReview} />}
      {!!fieldConfirmationCount && <FieldConfirmationSummary warnings={fieldConfirmations} items={draft.items} ownerComplete={!blocking.length} />}
      <div className="review-summary">
        <div><span>작성 상태</span><strong className={blocking.length ? 'text-danger' : 'text-success'}>{blocking.length ? `필수 입력 ${blocking.length}개 남음` : '필수 입력 완료'}</strong></div>
        <div><span>수정 필요</span><strong className={blocking.length ? 'text-danger' : 'text-success'}>{blocking.length ? `${blocking.length}개` : '없음'}</strong></div>
        <div><span>현장 확인</span><strong className={fieldConfirmationCount ? 'text-field' : 'text-success'}>{fieldConfirmationCount ? `${fieldConfirmationCount}개` : '없음'}</strong></div>
        <div><span>최종 상태</span><strong className={finalReviewComplete ? 'text-success' : ''}>{finalReviewComplete ? '최종 확인 완료' : '최종 확인 전'}</strong></div>
        <div><span>활성 식순</span><strong>{activeOutputCount}</strong></div>
        <div><span>예상 시간</span><strong>{Math.ceil(script.totalEstimatedTimeSeconds / 60)}분</strong></div>
      </div>
      {!blocking.length && (
        <div className="notice success review-status-explanation">
          필수 작성은 완료됐습니다.
          {fieldConfirmationCount
            ? ` 예식장과 함께 확인할 항목이 ${fieldConfirmationCount}개 남아 있습니다.`
            : ' 현장 확인 항목도 모두 정리됐습니다.'}
        </div>
      )}
      {draft.basicInfo.globalRequestNote && (
        <details className="global-note">
          <summary>전체 요청사항</summary>
          <p>{draft.basicInfo.globalRequestNote}</p>
        </details>
      )}
      <FinalCeremonySheet draft={draft} projection={ownerProjection} script={script} issues={blocking} onNotify={onNotify} onEdit={onEdit} />
      <VenueChecklistPreview projection={ownerProjection} />
      <details className="owner-script-review">
        <summary>사회자 자동 대본 미리보기</summary>
        <div className="owner-script-tools">
          <button type="button" className="button secondary" onClick={copyScript}>전체 대본 복사</button>
          {copyError && <p role="alert">{copyError}</p>}
        </div>
        <div className="review-script">{script.ceremonySections.map((section, index) => <article key={section.id}><div className="review-number">{index + 1}</div><div><h3>{section.title}</h3><p>{section.narration || 'MC 대본이 비어 있습니다.'}</p>{!!section.cue.length && <div className="preview-support review-cue"><strong>Cue</strong><ul>{section.cue.map((cue) => <li key={cue}>{cue}</li>)}</ul></div>}{!!section.note.length && <div className="inline-note"><strong>Note</strong><ul>{section.note.map((note) => <li key={note}>{note}</li>)}</ul></div>}</div></article>)}</div>
      </details>
    </div>
  );
}

function IssueSummary({ issues, items, onEdit, onStartReview }: { issues: ReturnType<typeof validateDraft>; items: CeremonyItem[]; onEdit: (issue: ValidationIssue) => void; onStartReview: (issues: ValidationIssue[]) => void }) {
  return (
    <section className="owner-issue-summary" aria-labelledby="owner-issue-summary-title">
      <div>
        <span className="section-kicker">USER ACTION</span>
        <h2 id="owner-issue-summary-title">수정이 필요한 항목 {issues.length}개</h2>
        <div className="owner-issue-items">
          {issues.slice(0, 5).map((issue) => {
            const item = items.find((candidate) => candidate.id === (issue.ceremonyItemId ?? issue.itemId));
            const canEdit = !!(issue.field || issue.itemId || issue.ceremonyItemId);
            return (
              <div key={issue.id}>
                <p>{item && <strong>{ceremonyItemDisplayTitle(item)}</strong>}{issue.message}</p>
                {canEdit && <button type="button" onClick={() => onEdit(issue)}>바로 수정</button>}
              </div>
            );
          })}
        </div>
      </div>
      <button type="button" className="button primary" onClick={() => onStartReview(issues)}>한 번에 확인하기</button>
    </section>
  );
}

function FieldConfirmationSummary({ warnings, items, ownerComplete }: { warnings: string[]; items: CeremonyItem[]; ownerComplete: boolean }) {
  return (
    <details className="field-confirmation-summary">
      <summary>
        예식장과 확인할 항목 {warnings.length}개
        <small>{ownerComplete ? '필수 작성은 완료됐습니다. ' : ''}아래 내용은 예식장과 최종 미팅에서 확인해 주세요.</small>
      </summary>
      <ul>
        {warnings.map((warning) => (
          <li key={warning}>
            {items.reduce(
              (value, item) => value.replace(` (${item.id})`, ''),
              warning,
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
