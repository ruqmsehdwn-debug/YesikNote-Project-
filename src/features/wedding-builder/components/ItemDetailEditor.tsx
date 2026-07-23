import { useEffect, useRef } from 'react';
import { createCandleChildren, createId, type CandleMode } from '../data/ceremonyTemplates';
import type { CeremonyItem, PerformanceItem, PersonRef } from '../models/ceremony';
import {
  generatedIntroForItem,
  introPresentationMode,
} from '../services/scriptEngine';
import { SortableItemList } from './SortableItemList';

type Props = {
  item: CeremonyItem;
  onChange: (item: CeremonyItem) => void;
  pronouncementParticipant?: PersonRef;
  performanceFocusTarget?: PerformanceFocusTarget;
  itemFocusTarget?: ItemFocusTarget;
  onPerformanceCreated?: (performanceId: string) => void;
};

export type PerformanceFocusTarget = {
  section?: string;
  performanceId?: string;
  field?: string;
  requestId: number;
};

export type ItemFocusTarget = {
  field?: string;
  policyOnly?: boolean;
  requestId: number;
};

const inputClass = 'field-input';

function createPerson(role: string): PersonRef {
  return { id: createId('person'), role, name: '', introMode: 'default', introText: '' };
}

export function ItemDetailEditor({
  item,
  onChange,
  pronouncementParticipant,
  performanceFocusTarget,
  itemFocusTarget,
  onPerformanceCreated,
}: Props) {
  const editorRef = useRef<HTMLElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (patch: Partial<CeremonyItem>) => onChange({ ...item, ...patch });
  const updateConfig = (patch: Record<string, unknown>) =>
    update({ detailConfig: { ...item.detailConfig, ...patch } });
  const participant = item.participants?.[0];
  const introMode = introPresentationMode(item.customIntro);
  const generatedIntro = generatedIntroForItem(item);
  const hasPronouncementParticipant = !!(
    pronouncementParticipant?.displayTitle?.trim()
    || pronouncementParticipant?.name.trim()
    || pronouncementParticipant?.relation?.trim()
  );

  useEffect(() => {
    if (!itemFocusTarget || !editorRef.current) return;
    const field = !itemFocusTarget.policyOnly && itemFocusTarget.field
      ? editorRef.current.querySelector<HTMLElement>(
        `[data-item-field="${itemFocusTarget.field}"]`,
      )
      : undefined;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const target = field ?? editorRef.current;
    target.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
    editorRef.current.classList.add('detail-editor-target');
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(
      () => editorRef.current?.classList.remove('detail-editor-target'),
      2000,
    );
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      editorRef.current?.classList.remove('detail-editor-target');
    };
  }, [itemFocusTarget]);

  const updateParticipant = (patch: Partial<PersonRef>, role = 'speaker') => {
    const current = participant ?? createPerson(role);
    update({ participants: [{ ...current, ...patch }] });
  };

  const setIntroMode = (mode: 'auto' | 'custom' | 'omit') => {
    if (mode === 'auto') {
      update({ customIntro: '' });
      return;
    }
    if (mode === 'omit') {
      update({ customIntro: introMode === 'omit' ? item.customIntro : '없음' });
      return;
    }
    update({ customIntro: introMode === 'custom' ? item.customIntro : ' ' });
  };

  const importPronouncementParticipant = (checked: boolean) => {
    if (!checked || !pronouncementParticipant) {
      updateConfig({ sameAsPronouncement: false });
      return;
    }
    const current = participant ?? createPerson('speaker');
    update({
      detailConfig: { ...item.detailConfig, sameAsPronouncement: true },
      participants: [{
        ...current,
        name: pronouncementParticipant.name,
        relation: pronouncementParticipant.relation,
        displayTitle: pronouncementParticipant.displayTitle,
      }],
    });
  };

  const setCandleMode = (mode: CandleMode) => {
    update({
      active: mode !== 'omit',
      detailConfig: {
        ...item.detailConfig,
        mode,
        ...(mode === 'omit' ? { previousMode: item.detailConfig.mode ?? 'mothers' } : {}),
      },
      children:
        mode === 'omit' || mode === 'custom'
          ? item.children ?? []
          : createCandleChildren(item.id, mode),
    });
  };
  const reactivateItem = () => update({
    active: true,
    detailConfig: item.type === 'candle_lighting' && item.detailConfig.mode === 'omit'
      ? {
        ...item.detailConfig,
        mode: String(item.detailConfig.previousMode ?? 'mothers'),
      }
      : item.detailConfig,
  });

  return (
    <section className="detail-editor" ref={editorRef}>
      <div className="detail-header">
        <div>
          <span className="section-kicker">항목 상세 설정</span>
          <h2>{item.title}</h2>
        </div>
        <div className="segmented" role="group" aria-label="진행 여부">
          <button type="button" className={item.active ? 'active' : ''} onClick={reactivateItem}>진행</button>
          <button type="button" className={!item.active ? 'active' : ''} onClick={() => update({ active: false })}>미진행</button>
        </div>
      </div>

      {!item.active && (
        <div className="inactive-guidance" role="status">
          <div>
            <strong>이 식순은 진행하지 않아요</strong>
            <p>작성한 내용은 보관되며, 다시 진행으로 바꾸면 그대로 사용할 수 있어요.</p>
          </div>
          <button type="button" onClick={reactivateItem}>다시 진행하기</button>
        </div>
      )}

      <div className="form-grid two">
        <label>
          식순 이름
          <input data-item-field="title" className={inputClass} value={item.title} onChange={(event) => update({ title: event.target.value })} />
        </label>
        <label>
          예상 시간(초)
          <input
            className={inputClass}
            type="number"
            min="0"
            value={item.estimatedTimeSeconds ?? ''}
            onChange={(event) => update({ estimatedTimeSeconds: Number(event.target.value) || 0 })}
          />
        </label>
      </div>

      {item.type === 'candle_lighting' && (
        <fieldset className="option-group">
          <legend>화촉점화 구성</legend>
          <div className="choice-grid">
            {[
              ['mothers', '양가 어머님'],
              ['parents_a', '부모님 유형 A'],
              ['parents_b', '부모님 유형 B'],
              ['single_host', '한쪽 혼주님'],
              ['omit', '생략'],
              ['custom', '직접 구성'],
            ].map(([value, label]) => (
              <label className="choice-card" key={value}>
                <input
                  type="radio"
                  name={`candle-${item.id}`}
                  checked={item.detailConfig.mode === value}
                  onChange={() => setCandleMode(value as CandleMode)}
                />
                {label}
              </label>
            ))}
          </div>
          {item.detailConfig.mode === 'single_host' && (
            <label>
              사용자 지정 호칭
              <input
                className={inputClass}
                placeholder="비어 있으면 혼주님"
                value={item.detailConfig.customHostTitle ?? ''}
                onChange={(event) => updateConfig({ customHostTitle: event.target.value })}
              />
            </label>
          )}
          {item.active && (
            <div className="child-editor">
              <div className="subheading-row">
                <h3>하위 식순</h3>
                {item.detailConfig.mode === 'custom' && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      const nested: CeremonyItem = {
                        id: createId('child'),
                        parentId: item.id,
                        type: 'custom',
                        title: '새 하위 식순',
                        order: item.children?.length ?? 0,
                        active: true,
                        detailConfig: { description: '' },
                        useDefaultNarration: false,
                        narrationOverride: '',
                      };
                      update({ children: [...(item.children ?? []), nested] });
                    }}
                  >
                    + 하위 식순 추가
                  </button>
                )}
              </div>
              <SortableItemList
                compact
                items={item.children ?? []}
                onChange={(children) => update({ children })}
                onToggle={(id) => update({ children: item.children?.map((child) => child.id === id ? { ...child, active: !child.active } : child) })}
              />
              {item.detailConfig.mode === 'custom' && item.children?.map((nested) => (
                <div className="performance-card" key={`edit-${nested.id}`}>
                  <div className="form-grid two">
                    <label>하위 식순 이름<input className={inputClass} value={nested.title} onChange={(event) => update({ children: item.children?.map((child) => child.id === nested.id ? { ...child, title: event.target.value } : child) })} /></label>
                    <label>설명<input className={inputClass} value={String(nested.detailConfig.description ?? '')} onChange={(event) => update({ children: item.children?.map((child) => child.id === nested.id ? { ...child, detailConfig: { ...child.detailConfig, description: event.target.value } } : child) })} /></label>
                    <label className="full">MC 대본<textarea className={inputClass} rows={3} value={nested.narrationOverride ?? ''} onChange={(event) => update({ children: item.children?.map((child) => child.id === nested.id ? { ...child, narrationOverride: event.target.value } : child) })} /></label>
                  </div>
                  <button type="button" className="text-button danger" onClick={() => update({ children: item.children?.filter((child) => child.id !== nested.id).map((child, order) => ({ ...child, order })) })}>하위 식순 삭제</button>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {item.type === 'groom_entrance' && (
        <div className="form-grid two">
          <label>입장 방식<select className={inputClass} value={item.detailConfig.mode ?? 'solo'} onChange={(e) => updateConfig({ mode: e.target.value })}><option value="solo">신랑 단독</option><option value="with_father">아버님과 입장</option><option value="custom">직접 구성</option></select></label>
          {item.detailConfig.mode === 'with_father' && <label>동행 종료 지점<input className={inputClass} value={item.detailConfig.escortEndPoint ?? ''} onChange={(e) => updateConfig({ escortEndPoint: e.target.value })} /></label>}
        </div>
      )}

      {item.type === 'bride_entrance' && (
        <div className="form-grid two">
          <label>등장 방식<select className={inputClass} value={item.detailConfig.appearance ?? 'reveal_then_enter'} onChange={(e) => updateConfig({ appearance: e.target.value })}><option value="reveal_then_enter">먼저 등장 후 입장</option><option value="direct">바로 입장</option></select></label>
          <label>입장 방식<select className={inputClass} value={item.detailConfig.escort ?? 'father'} onChange={(e) => updateConfig({ escort: e.target.value })}><option value="father">신부 아버님과 입장</option><option value="solo">신부 단독 입장</option><option value="custom">직접 구성</option></select></label>
          {item.detailConfig.escort === 'father' && <label>인계 지점<input className={inputClass} value={item.detailConfig.handoffPoint ?? ''} onChange={(e) => updateConfig({ handoffPoint: e.target.value })} /></label>}
        </div>
      )}

      {item.type === 'vows' && (
        <label className="switch-row bordered">
          <input
            type="checkbox"
            checked={item.detailConfig.mode === 'mc'}
            onChange={(event) => updateConfig({ mode: event.target.checked ? 'mc' : 'together' })}
          />
          혼인서약 사회자 진행
        </label>
      )}

      {item.type === 'ring_exchange' && item.active && (
        <fieldset className="option-group">
          <legend>화동 설정</legend>
          <label className="switch-row"><input type="checkbox" checked={!!item.detailConfig.flowerChildEnabled} onChange={(e) => updateConfig({ flowerChildEnabled: e.target.checked, flowerChild: item.detailConfig.flowerChild ?? createPerson('flower_child') })} />화동 있음</label>
          {item.detailConfig.flowerChildEnabled && (
            <div className="form-grid two">
              <label>이름 또는 표시 호칭<input data-item-field="flowerChildName" className={inputClass} value={item.detailConfig.flowerChild?.name ?? ''} onChange={(e) => updateConfig({ flowerChild: { ...(item.detailConfig.flowerChild ?? createPerson('flower_child')), name: e.target.value } })} /></label>
              <label>신랑·신부와의 관계<input className={inputClass} value={item.detailConfig.flowerChild?.relation ?? ''} onChange={(e) => updateConfig({ flowerChild: { ...(item.detailConfig.flowerChild ?? createPerson('flower_child')), relation: e.target.value } })} /></label>
              <label className="full">화동 소개 멘트<input className={inputClass} value={item.detailConfig.flowerChild?.introText ?? ''} onChange={(e) => updateConfig({ flowerChild: { ...(item.detailConfig.flowerChild ?? createPerson('flower_child')), introText: e.target.value } })} /></label>
              <label>이동 동선<input className={inputClass} value={item.detailConfig.flowerChildRoute ?? ''} onChange={(e) => updateConfig({ flowerChildRoute: e.target.value })} /></label>
              <label>반지 전달 대상<input className={inputClass} value={item.detailConfig.ringRecipient ?? ''} onChange={(e) => updateConfig({ ringRecipient: e.target.value })} /></label>
            </div>
          )}
        </fieldset>
      )}

      {item.type === 'pronouncement' && (
        <div className="form-grid two">
          <label>성혼선언 진행 방식<select className={inputClass} value={item.detailConfig.speakerMode ?? 'mc'} onChange={(e) => updateConfig({ speakerMode: e.target.value })}><option value="mc">사회자 대독</option><option value="groom_father">신랑 아버님</option><option value="bride_father">신부 아버님</option><option value="groom_mother">신랑 어머님</option><option value="bride_mother">신부 어머님</option><option value="family_representative">양가 부모님 대표</option><option value="officiant">주례 선생님</option><option value="custom">직접 입력</option></select></label>
          {item.detailConfig.speakerMode !== 'mc' && (
            <>
              <label>성혼선언자 이름 또는 호칭<input data-item-field="participantName" className={inputClass} placeholder="비어 있으면 선택한 관계 호칭을 사용합니다." value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'pronouncement_speaker')} /></label>
              <label>신랑·신부와의 관계<input className={inputClass} placeholder="예: 대학 은사" value={participant?.relation ?? ''} onChange={(e) => updateParticipant({ relation: e.target.value }, 'pronouncement_speaker')} /></label>
            </>
          )}
        </div>
      )}

      {item.type === 'officiant_entrance' && (
        <div className="form-grid two">
          <label>주례 성함<input data-item-field="participantName" className={inputClass} value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'officiant')} /></label>
          <label>직함 또는 관계<input className={inputClass} value={participant?.relation ?? ''} onChange={(e) => updateParticipant({ relation: e.target.value }, 'officiant')} placeholder="예: 담임목사, 대학 은사" /></label>
          <label>약력 또는 소개<input className={inputClass} value={participant?.introText ?? ''} onChange={(e) => updateParticipant({ introText: e.target.value }, 'officiant')} /></label>
        </div>
      )}

      {item.type === 'speech' && (
        <div className="form-grid two">
          <div className="full speech-type-selector">
            <span className="speech-type-label">덕담·축사 구분</span>
            <div className="segmented" role="group" aria-label="덕담·축사 구분">
              <button type="button" className={(item.detailConfig.speechType ?? 'words') === 'words' ? 'active' : ''} aria-pressed={(item.detailConfig.speechType ?? 'words') === 'words'} onClick={() => updateConfig({ speechType: 'words' })}>덕담</button>
              <button type="button" className={item.detailConfig.speechType === 'congratulatory' ? 'active' : ''} aria-pressed={item.detailConfig.speechType === 'congratulatory'} onClick={() => updateConfig({ speechType: 'congratulatory' })}>축사</button>
            </div>
            <small>선택한 구분에 맞춰 화면 제목과 사회자 대본이 함께 바뀝니다.</small>
          </div>
          <label>{item.detailConfig.speechType === 'congratulatory' ? '축사자 이름 또는 호칭' : '덕담자 이름 또는 호칭'}<input data-item-field="participantName" className={inputClass} placeholder={item.detailConfig.speechType === 'congratulatory' ? '예: 이동주, 김예식' : '예: 김영수'} value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'speaker')} /></label>
          <label>신랑·신부와의 관계<input className={inputClass} placeholder={item.detailConfig.speechType === 'congratulatory' ? '예: 신부의 고등학교 친구, 신랑의 직장 동료' : '예: 신랑 아버지, 신부 어머니, 신랑 측 회사 대표'} value={participant?.relation ?? ''} onChange={(e) => updateParticipant({ relation: e.target.value }, 'speaker')} /></label>
          <p className="speech-participant-help full">이름 또는 관계를 입력하면 선택한 내용에 맞춰 사회자가 읽을 소개 문장을 자동으로 만들어요.</p>
          {hasPronouncementParticipant && (
            <label className="switch-row full"><input type="checkbox" checked={!!item.detailConfig.sameAsPronouncement} onChange={(e) => importPronouncementParticipant(e.target.checked)} /><span>성혼선언자 정보 불러오기<small>성혼선언자에 입력한 이름과 관계를 불러옵니다.</small></span></label>
          )}
        </div>
      )}

      {item.type === 'performance' && (
        <PerformanceEditor
          performances={item.detailConfig.performances ?? []}
          onChange={(performances) => updateConfig({ performances })}
          focusTarget={performanceFocusTarget}
          onCreated={onPerformanceCreated}
        />
      )}

      {item.type === 'family_guest_greeting' && (
        <div className="form-grid two">
          <AttendanceField label="신부 측 혼주" value={item.detailConfig.brideFamilyAttendance ?? 'both_parents'} onChange={(value) => updateConfig({ brideFamilyAttendance: value })} />
          <AttendanceField label="신랑 측 혼주" value={item.detailConfig.groomFamilyAttendance ?? 'both_parents'} onChange={(value) => updateConfig({ groomFamilyAttendance: value })} />
          <label className="switch-row"><input type="checkbox" checked={!!item.detailConfig.omitBrideFamilyHug} onChange={(e) => updateConfig({ omitBrideFamilyHug: e.target.checked })} />신부 측 포옹 안내 생략</label>
          <label className="switch-row"><input type="checkbox" checked={!!item.detailConfig.omitGroomFamilyHug} onChange={(e) => updateConfig({ omitGroomFamilyHug: e.target.checked })} />신랑 측 포옹 안내 생략</label>
        </div>
      )}

      {item.type === 'custom' && (
        <label>
          식순 설명
          <textarea data-item-field="description" className={inputClass} rows={3} value={String(item.detailConfig.description ?? '')} onChange={(e) => updateConfig({ description: e.target.value })} placeholder="진행 방식과 참여자를 적어 주세요." />
        </label>
      )}

      {item.type !== 'custom' && (
        <label className="switch-row bordered">
          <input type="checkbox" checked={item.useDefaultNarration} onChange={(e) => update({ useDefaultNarration: e.target.checked })} />
          예식노트 기본 대본 사용
        </label>
      )}

      <fieldset className="option-group intro-settings">
        <legend>소개 문장 설정</legend>
        <div className="choice-grid intro-mode-grid">
          {[
            ['auto', '자동 생성'],
            ['custom', '직접 입력'],
            ['omit', '소개 생략'],
          ].map(([value, label]) => (
            <label className="choice-card" key={value}>
              <input type="radio" name={`intro-${item.id}`} checked={introMode === value} onChange={() => setIntroMode(value as 'auto' | 'custom' | 'omit')} />
              {label}
            </label>
          ))}
        </div>
        {introMode === 'auto' && (
          generatedIntro
            ? <div className="intro-generated"><small>자동 생성 문장</small><p>{generatedIntro}</p></div>
            : <p className="intro-help">{item.type === 'speech' ? '이름 또는 호칭을 입력하면 완성된 소개 문장을 자동으로 만들어요.' : '이 식순은 자동 소개 문장을 생성하지 않습니다. 필요한 경우 직접 입력을 선택해 주세요.'}</p>
        )}
        {introMode === 'custom' && (
          <label>
            소개 문장 직접 입력
            <textarea className={inputClass} rows={3} value={item.customIntro ?? ''} onChange={(event) => update({ customIntro: event.target.value })} placeholder="사회자가 실제로 읽을 소개 문장" />
            <small>사회자가 실제로 읽을 완성된 문장으로 작성해 주세요.</small>
          </label>
        )}
        {introMode === 'omit' && <p className="intro-help">소개 문장은 Owner 미리보기, 최종 대본, 사회자 화면에 표시되지 않습니다.</p>}
      </fieldset>
      <label>
        {item.type === 'custom' ? 'MC 대본 (필수)' : '기본 대본 전체 바꾸기'}
        <textarea data-item-field="narrationOverride" className={inputClass} rows={7} value={item.narrationOverride ?? ''} onChange={(event) => update({ narrationOverride: event.target.value })} placeholder={item.type === 'custom' || !item.useDefaultNarration ? '사회자가 읽을 전체 대본을 입력해 주세요.' : '입력하면 기본 대본 전체를 대체합니다.'} />
        {item.type !== 'custom' && <small>내용을 입력하면 예식노트 기본 대본 대신 이 문장이 사용됩니다. 소개 문장 설정은 별도로 적용됩니다.</small>}
      </label>
      <label>
        사회자 요청사항
        <textarea className={inputClass} rows={3} value={item.requestNote ?? ''} onChange={(event) => update({ requestNote: event.target.value })} placeholder="낭독하지 않고 MC 화면에서 확인할 실행 메모" />
      </label>
      {itemFocusTarget?.policyOnly && (
        <div className="notice warm" role="status">
          아직 입력 항목이 제공되지 않습니다. Product Owner 정책 확인이 필요합니다.
        </div>
      )}
    </section>
  );
}

function AttendanceField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="both_parents">부모님 두 분</option><option value="father_only">아버님 한 분</option><option value="mother_only">어머님 한 분</option><option value="single_host">혼주님 한 분</option><option value="absent">참석하지 않음</option><option value="custom">사용자 지정 호칭</option></select></label>;
}

const performanceCopy: Record<PerformanceItem['type'], { label: string; participantHeading: string }> = {
  song: { label: '축가', participantHeading: '축가자' },
  dance: { label: '축무', participantHeading: '공연자' },
  instrumental: { label: '축주', participantHeading: '연주자' },
};

function PerformanceEditor({ performances, onChange, focusTarget, onCreated }: { performances: PerformanceItem[]; onChange: (value: PerformanceItem[]) => void; focusTarget?: PerformanceFocusTarget; onCreated?: (performanceId: string) => void }) {
  const settingsRef = useRef<HTMLFieldSetElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = (id: string, patch: Partial<PerformanceItem>) => onChange(performances.map((p) => p.id === id ? { ...p, ...patch } : p));
  const addPerformance = () => {
    const id = createId('performance');
    onChange([...performances, {
      id,
      type: 'song',
      performerName: '',
      samePerformerAsPrevious: false,
      order: performances.length,
    }]);
    onCreated?.(id);
  };

  useEffect(() => {
    if (!focusTarget || !settingsRef.current) return;
    if (focusTarget.section && focusTarget.section !== 'performances') return;
    const cards = [...settingsRef.current.querySelectorAll<HTMLElement>('[data-performance-id]')];
    const card = focusTarget.performanceId
      ? cards.find((candidate) => candidate.dataset.performanceId === focusTarget.performanceId)
      : undefined;
    const scope = card ?? settingsRef.current;
    const field = focusTarget.field
      ? [...scope.querySelectorAll<HTMLElement>('[data-performance-field]')]
        .find((candidate) => candidate.dataset.performanceField === focusTarget.field)
      : undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const scrollTarget = card ?? (focusTarget.section === 'performances' ? settingsRef.current : undefined);
    scrollTarget?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
    if (card) {
      card.classList.add('performance-target');
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => card.classList.remove('performance-target'), 2000);
    }

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      card?.classList.remove('performance-target');
    };
  }, [focusTarget]);

  return (
    <fieldset className="option-group" ref={settingsRef}>
      <div className="subheading-row"><legend>축가·축무·축주 설정</legend>{performances.length > 0 && <button type="button" className="text-button" data-performance-field="performances" onClick={addPerformance}>+ 공연 추가</button>}</div>
      {performances.length === 0 && (
        <div className="performance-empty-state">
          <strong>등록된 공연이 없습니다</strong>
          <p>축가·축무를 진행하려면 공연 정보를 추가해 주세요.</p>
          <button type="button" className="button secondary" data-performance-field="performances" onClick={addPerformance}>첫 공연 추가</button>
        </div>
      )}
      {performances.map((performance, index) => (
        <div className="performance-card" data-performance-id={performance.id} key={performance.id}>
          <strong>공연 {index + 1} · {performanceCopy[performance.type].label}</strong>
          <div className="form-grid two">
            <label>공연 종류<select className={inputClass} data-performance-field="type" value={performance.type} onChange={(e) => update(performance.id, { type: e.target.value as PerformanceItem['type'] })}><option value="song">축가</option><option value="dance">축무</option><option value="instrumental">축주</option></select></label>
            <label>{performanceCopy[performance.type].participantHeading}<input className={inputClass} data-performance-field="performerName" value={performance.performerName} onChange={(e) => update(performance.id, { performerName: e.target.value })} placeholder="예: 이동주, 김예식" /></label>
            <label>곡명/공연명<input className={inputClass} data-performance-field="title" value={performance.title ?? ''} onChange={(e) => update(performance.id, { title: e.target.value })} /></label>
            <label>신랑·신부와의 관계<input className={inputClass} data-performance-field="performerRelation" value={performance.performerRelation ?? ''} onChange={(e) => update(performance.id, { performerRelation: e.target.value })} placeholder="예: 신랑의 고등학교 친구" /></label>
          </div>
          {index > 0 && <label className="switch-row"><input type="checkbox" checked={performance.samePerformerAsPrevious} onChange={(e) => update(performance.id, { samePerformerAsPrevious: e.target.checked })} />앞 공연과 같은 분</label>}
          <button type="button" className="text-button danger" onClick={() => onChange(performances.filter((p) => p.id !== performance.id).map((p, order) => ({ ...p, order })))}>공연 삭제</button>
        </div>
      ))}
    </fieldset>
  );
}
