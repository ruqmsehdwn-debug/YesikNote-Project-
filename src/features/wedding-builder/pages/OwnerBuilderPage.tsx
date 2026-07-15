import { useMemo, useState } from 'react';
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
} from '../models/ceremony';
import { completionRate, validateDraft } from '../services/draftValidator';
import { ceremonyItemDisplayTitle, generateScript } from '../services/scriptEngine';
import { ItemDetailEditor } from '../components/ItemDetailEditor';
import { ScriptPreview } from '../components/ScriptPreview';
import { SortableItemList } from '../components/SortableItemList';

type Props = {
  draft: CeremonyDraft;
  setDraft: (update: CeremonyDraft | ((previous: CeremonyDraft) => CeremonyDraft)) => void;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  compositionHandlers: {
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  };
};

const steps = ['예식 기본정보', '예식 유형', '전체 식순', '상세 설정', '최종 확인'];

export function OwnerBuilderPage({
  draft,
  setDraft,
  saveStatus,
  lastSavedAt,
  compositionHandlers,
}: Props) {
  const [step, setStepState] = useState(Math.min(Math.max(draft.lastStep, 1), 5));
  const [selectedId, setSelectedId] = useState(draft.items[0]?.id);
  const script = useMemo(() => generateScript(draft), [draft]);
  const issues = useMemo(() => validateDraft(draft), [draft]);
  const blocking = issues.filter((issue) => issue.severity === 'blocking');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const selectedItem = draft.items.find((item) => item.id === selectedId) ?? draft.items[0];
  const displayedSelectedItem = selectedItem
    ? { ...selectedItem, title: ceremonyItemDisplayTitle(selectedItem) }
    : undefined;

  const setStep = (next: number) => {
    const value = Math.min(Math.max(next, 1), 5);
    setStepState(value);
    setDraft((previous) => ({ ...previous, lastStep: value }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateItems = (items: CeremonyItem[]) => setDraft((previous) => ({ ...previous, items: resetOrders(items) }));
  const updateItem = (next: CeremonyItem) => updateItems(draft.items.map((item) => item.id === next.id ? next : item));

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
          <span>{saveStatus === 'saving' ? '저장 중' : saveStatus === 'failed' ? '저장 실패' : saveStatus === 'saved' ? '저장됨' : '자동 저장'}</span>
          {lastSavedAt && <small>{new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</small>}
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
          {step === 1 && <BasicInfoStep draft={draft} setDraft={setDraft} />}
          {step === 2 && <CeremonyTypeStep draft={draft} onChange={changeCeremonyType} />}
          {step === 3 && (
            <OrderStep
              draft={draft}
              selectedId={selectedId}
              onItemsChange={updateItems}
              onSelect={(id) => { setSelectedId(id); setStep(4); }}
              onToggle={(id) => updateItems(draft.items.map((item) => {
                if (item.id !== id) return item;
                const activating = !item.active;
                return {
                  ...item,
                  active: activating,
                  detailConfig:
                    activating && item.type === 'candle_lighting' && item.detailConfig.mode === 'omit'
                      ? { ...item.detailConfig, mode: String(item.detailConfig.previousMode ?? 'mothers') }
                      : item.detailConfig,
                };
              }))}
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
              <div className="detail-rail">
                <label className="select-label">편집할 식순<select value={selectedItem?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>{draft.items.map((item) => <option value={item.id} key={item.id}>{item.order + 1}. {ceremonyItemDisplayTitle(item)}{item.active ? '' : ' (미진행)'}</option>)}</select></label>
              </div>
              {selectedItem && displayedSelectedItem ? (
                <ItemDetailEditor
                  item={displayedSelectedItem}
                  onChange={(next) => updateItem({
                    ...next,
                    title: next.title === displayedSelectedItem.title ? selectedItem.title : next.title,
                  })}
                />
              ) : <EmptyCustom onAdd={() => { const custom = createCustomItem(0); updateItems([custom]); setSelectedId(custom.id); }} />}
            </div>
          )}
          {step === 5 && <ReviewStep draft={draft} script={script} blocking={blocking} warnings={warnings} onEdit={(id) => { setSelectedId(id); setStep(4); }} />}

          <div className="step-controls">
            <button type="button" className="button secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>이전</button>
            {step < 5 && <button type="button" className="button primary" onClick={() => setStep(step + 1)}>다음 단계</button>}
            {step === 5 && blocking.length === 0 && <Link className="button primary" to="/mc">사회자용 대본 열기</Link>}
          </div>
        </section>
        {step >= 3 && step <= 4 && <ScriptPreview script={script} />}
      </main>
    </div>
  );
}

function BasicInfoStep({ draft, setDraft }: Pick<Props, 'draft' | 'setDraft'>) {
  const update = (field: keyof CeremonyDraft['basicInfo'], value: string) => setDraft((previous) => ({ ...previous, basicInfo: { ...previous.basicInfo, [field]: value } }));
  return (
    <div className="page-section">
      <div className="page-heading"><span className="section-kicker">STEP 1</span><h1>두 분의 예식 정보를 알려주세요</h1><p>입력한 정보는 사회자 대본에 정확히 반영됩니다.</p></div>
      <div className="panel form-panel">
        <div className="form-grid two">
          <label>신랑 이름 <em>필수</em><input className="field-input" value={draft.basicInfo.groomName} onChange={(e) => update('groomName', e.target.value)} placeholder="홍길동" /></label>
          <label>신부 이름 <em>필수</em><input className="field-input" value={draft.basicInfo.brideName} onChange={(e) => update('brideName', e.target.value)} placeholder="김예식" /></label>
          <label>예식일 <em>필수</em><input className="field-input" type="date" value={draft.basicInfo.weddingDate} onChange={(e) => update('weddingDate', e.target.value)} /></label>
          <label>예식장명<input className="field-input" value={draft.basicInfo.venueName} onChange={(e) => update('venueName', e.target.value)} placeholder="예식노트 웨딩홀" /></label>
          <label>홀명<input className="field-input" value={draft.basicInfo.hallName} onChange={(e) => update('hallName', e.target.value)} placeholder="그랜드홀" /></label>
        </div>
        <div className="venue-box">
          <div><span className="eyebrow">예식장 제공 정보 · 임시 입력</span><p>정식 서비스에서는 예식장이 관리하는 공식 정보입니다.</p></div>
          <div className="form-grid two">
            <label>피로연 장소 <em>필수</em><input className="field-input" value={draft.basicInfo.banquetLocation} onChange={(e) => update('banquetLocation', e.target.value)} placeholder="지하 1층 연회장" /></label>
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

function OrderStep({ draft, selectedId, onItemsChange, onSelect, onToggle, onDuplicate, onDelete, onAdd, onReset }: { draft: CeremonyDraft; selectedId?: string; onItemsChange: (items: CeremonyItem[]) => void; onSelect: (id: string) => void; onToggle: (id: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void; onAdd: () => void; onReset: () => void }) {
  const storedTitles = new Map(draft.items.map((item) => [item.id, item.title]));
  const displayedItems = draft.items.map((item) => ({
    ...item,
    title: ceremonyItemDisplayTitle(item),
  }));
  return (
    <div className="page-section">
      <div className="heading-row"><div className="page-heading"><span className="section-kicker">STEP 3</span><h1>전체 식순을 완성하세요</h1><p>끌어서 옮기거나 화살표 버튼으로 순서를 조정하세요.</p></div><div className="heading-actions"><button type="button" className="button secondary" onClick={onReset} disabled={draft.ceremonyType === 'religious' || draft.ceremonyType === 'custom'}>기본 순서로 되돌리기</button><button type="button" className="button primary" onClick={onAdd}>+ 자유 식순 추가</button></div></div>
      {draft.items.length ? <SortableItemList items={displayedItems} selectedId={selectedId} onChange={(items) => onItemsChange(items.map((item) => ({ ...item, title: storedTitles.get(item.id) ?? item.title })))} onSelect={onSelect} onToggle={onToggle} onDuplicate={onDuplicate} onDelete={onDelete} /> : <EmptyCustom onAdd={onAdd} />}
    </div>
  );
}

function EmptyCustom({ onAdd }: { onAdd: () => void }) { return <div className="empty-state"><span className="empty-icon">＋</span><strong>직접 구성할 첫 식순을 추가해 주세요</strong><p>기본 대본은 생성되지 않으며 MC 대본을 직접 입력합니다.</p><button type="button" className="button primary" onClick={onAdd}>자유 식순 추가</button></div>; }

function reviewGuidance(rate: number, remainingCount: number) {
  if (rate === 0) return '필수 입력을 모두 완료하면 사회자용 대본을 확인할 수 있어요.';
  if (remainingCount > 0) {
    return `사회자용 대본을 확인하려면 필수 입력 ${remainingCount}개를 더 완료해 주세요.`;
  }
  return '준비가 완료되었습니다. 사회자용 대본을 확인해 보세요.';
}

function ReviewStep({ draft, script, blocking, warnings, onEdit }: { draft: CeremonyDraft; script: ReturnType<typeof generateScript>; blocking: ReturnType<typeof validateDraft>; warnings: ReturnType<typeof validateDraft>; onEdit: (id: string) => void }) {
  const rate = completionRate(draft);
  const activeOutputCount = script.ceremonySections.filter((section) => !section.parentId).length;
  return (
    <div className="page-section">
      <div className="page-heading"><span className="section-kicker">STEP 5</span><h1>최종 대본을 확인하세요</h1><p>{reviewGuidance(rate, blocking.length)}</p></div>
      <div className="review-summary"><div><span>활성 식순</span><strong>{activeOutputCount}</strong></div><div><span>대본 섹션</span><strong>{script.ceremonySections.length}</strong></div><div><span>예상 시간</span><strong>{Math.ceil(script.totalEstimatedTimeSeconds / 60)}분</strong></div><div><span>완료 상태</span><strong className={blocking.length ? 'text-danger' : 'text-success'}>{blocking.length ? `미결정 ${blocking.length}` : '확인 완료'}</strong></div></div>
      {!!blocking.length && <IssueList title="완료 전 확인이 필요해요" issues={blocking} onEdit={onEdit} />}
      {!!warnings.length && <IssueList title="순서를 한번 확인해 주세요" issues={warnings} onEdit={onEdit} warning />}
      {!blocking.length && <div className="notice success">필수 입력이 모두 완료되었습니다.</div>}
      {draft.basicInfo.globalRequestNote && <div className="global-note"><span>전체 요청사항</span><p>{draft.basicInfo.globalRequestNote}</p></div>}
      <div className="review-script">{script.ceremonySections.map((section, index) => <article key={section.id}><div className="review-number">{index + 1}</div><div><h3>{section.title}</h3><p>{section.narration || 'MC 대본이 비어 있습니다.'}</p>{!!section.cue.length && <ul>{section.cue.map((cue) => <li key={cue}>{cue}</li>)}</ul>}{!!section.note.length && <div className="inline-note"><strong>주의사항 / 실행 메모</strong>{section.note.join(' · ')}</div>}</div></article>)}</div>
    </div>
  );
}

function IssueList({ title, issues, onEdit, warning = false }: { title: string; issues: ReturnType<typeof validateDraft>; onEdit: (id: string) => void; warning?: boolean }) { return <section className={`issue-list ${warning ? 'warning' : ''}`}><h2>{title}</h2>{issues.map((issue) => <div key={issue.id}><span>{warning ? '!' : '·'}</span><p>{issue.message}</p>{issue.itemId && <button type="button" onClick={() => onEdit(issue.itemId!)}>수정하기</button>}</div>)}</section>; }
