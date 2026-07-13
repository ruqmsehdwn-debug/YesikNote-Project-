import { createCandleChildren, createId, type CandleMode } from '../data/ceremonyTemplates';
import type { CeremonyItem, PerformanceItem, PersonRef } from '../models/ceremony';
import { SortableItemList } from './SortableItemList';

type Props = {
  item: CeremonyItem;
  onChange: (item: CeremonyItem) => void;
};

const inputClass = 'field-input';

function createPerson(role: string): PersonRef {
  return { id: createId('person'), role, name: '', introMode: 'default', introText: '' };
}

export function ItemDetailEditor({ item, onChange }: Props) {
  const update = (patch: Partial<CeremonyItem>) => onChange({ ...item, ...patch });
  const updateConfig = (patch: Record<string, unknown>) =>
    update({ detailConfig: { ...item.detailConfig, ...patch } });
  const participant = item.participants?.[0];

  const updateParticipant = (patch: Partial<PersonRef>, role = 'speaker') => {
    const current = participant ?? createPerson(role);
    update({ participants: [{ ...current, ...patch }] });
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

  return (
    <section className="detail-editor">
      <div className="detail-header">
        <div>
          <span className="section-kicker">항목 상세 설정</span>
          <h2>{item.title}</h2>
        </div>
        <div className="segmented" role="group" aria-label="진행 여부">
          <button type="button" className={item.active ? 'active' : ''} onClick={() => update({ active: true, detailConfig: item.type === 'candle_lighting' && item.detailConfig.mode === 'omit' ? { ...item.detailConfig, mode: String(item.detailConfig.previousMode ?? 'mothers') } : item.detailConfig })}>진행</button>
          <button type="button" className={!item.active ? 'active' : ''} onClick={() => update({ active: false })}>미진행</button>
        </div>
      </div>

      {!item.active && (
        <div className="notice warm">미진행 항목은 최종 대본과 MC 화면에서 제외되며, 현재 입력값은 보존됩니다.</div>
      )}

      <div className="form-grid two">
        <label>
          식순 이름
          <input className={inputClass} value={item.title} onChange={(event) => update({ title: event.target.value })} />
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

      {item.type === 'ring_exchange' && item.active && (
        <fieldset className="option-group">
          <legend>화동 설정</legend>
          <label className="switch-row"><input type="checkbox" checked={!!item.detailConfig.flowerChildEnabled} onChange={(e) => updateConfig({ flowerChildEnabled: e.target.checked, flowerChild: item.detailConfig.flowerChild ?? createPerson('flower_child') })} />화동 있음</label>
          {item.detailConfig.flowerChildEnabled && (
            <div className="form-grid two">
              <label>이름 또는 표시 호칭<input className={inputClass} value={item.detailConfig.flowerChild?.name ?? ''} onChange={(e) => updateConfig({ flowerChild: { ...(item.detailConfig.flowerChild ?? createPerson('flower_child')), name: e.target.value } })} /></label>
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
          <label>진행자<select className={inputClass} value={item.detailConfig.speakerMode ?? 'mc'} onChange={(e) => updateConfig({ speakerMode: e.target.value })}><option value="mc">사회자 대독</option><option value="groom_father">신랑 아버님</option><option value="bride_father">신부 아버님</option><option value="groom_mother">신랑 어머님</option><option value="bride_mother">신부 어머님</option><option value="family_representative">양가 부모님 대표</option><option value="officiant">주례 선생님</option><option value="custom">직접 입력</option></select></label>
          {item.detailConfig.speakerMode !== 'mc' && <label>이름 또는 호칭<input className={inputClass} value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'pronouncement_speaker')} /></label>}
        </div>
      )}

      {item.type === 'officiant_entrance' && (
        <div className="form-grid two">
          <label>주례 성함<input className={inputClass} value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'officiant')} /></label>
          <label>약력 또는 소개<input className={inputClass} value={participant?.introText ?? ''} onChange={(e) => updateParticipant({ introText: e.target.value }, 'officiant')} /></label>
        </div>
      )}

      {item.type === 'speech' && (
        <div className="form-grid two">
          <label>구분<select className={inputClass} value={item.detailConfig.speechType ?? 'words'} onChange={(e) => updateConfig({ speechType: e.target.value })}><option value="words">덕담</option><option value="congratulatory">축사</option></select></label>
          <label>진행자 이름 또는 호칭<input className={inputClass} value={participant?.name ?? ''} onChange={(e) => updateParticipant({ name: e.target.value }, 'speaker')} /></label>
          <label>관계<input className={inputClass} value={participant?.relation ?? ''} onChange={(e) => updateParticipant({ relation: e.target.value }, 'speaker')} /></label>
          <label className="switch-row"><input type="checkbox" checked={!!item.detailConfig.sameAsPronouncement} onChange={(e) => updateConfig({ sameAsPronouncement: e.target.checked })} />성혼선언자와 동일 인물</label>
        </div>
      )}

      {item.type === 'performance' && (
        <PerformanceEditor
          performances={item.detailConfig.performances ?? []}
          onChange={(performances) => updateConfig({ performances })}
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
          <textarea className={inputClass} rows={3} value={String(item.detailConfig.description ?? '')} onChange={(e) => updateConfig({ description: e.target.value })} placeholder="진행 방식과 참여자를 적어 주세요." />
        </label>
      )}

      {item.type !== 'custom' && (
        <label className="switch-row bordered">
          <input type="checkbox" checked={item.useDefaultNarration} onChange={(e) => update({ useDefaultNarration: e.target.checked })} />
          예식노트 기본 멘트 사용
        </label>
      )}

      <label>
        소개 멘트 추가
        <textarea className={inputClass} rows={3} value={item.customIntro ?? ''} onChange={(event) => update({ customIntro: event.target.value })} placeholder="사회자가 실제로 읽을 추가 소개 문장" />
      </label>
      <label>
        {item.type === 'custom' ? 'MC 대본 (필수)' : '전체 대본 직접 수정'}
        <textarea className={inputClass} rows={7} value={item.narrationOverride ?? ''} onChange={(event) => update({ narrationOverride: event.target.value })} placeholder={item.type === 'custom' || !item.useDefaultNarration ? '사회자가 읽을 전체 대본을 입력해 주세요.' : '입력하면 기본 대본 전체를 대체합니다.'} />
      </label>
      <label>
        사회자 요청사항
        <textarea className={inputClass} rows={3} value={item.requestNote ?? ''} onChange={(event) => update({ requestNote: event.target.value })} placeholder="낭독하지 않고 MC 화면에서 확인할 실행 메모" />
      </label>
    </section>
  );
}

function AttendanceField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label>{label}<select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}><option value="both_parents">부모님 두 분</option><option value="father_only">아버님 한 분</option><option value="mother_only">어머님 한 분</option><option value="single_host">혼주님 한 분</option><option value="absent">참석하지 않음</option><option value="custom">사용자 지정 호칭</option></select></label>;
}

function PerformanceEditor({ performances, onChange }: { performances: PerformanceItem[]; onChange: (value: PerformanceItem[]) => void }) {
  const update = (id: string, patch: Partial<PerformanceItem>) => onChange(performances.map((p) => p.id === id ? { ...p, ...patch } : p));
  return (
    <fieldset className="option-group">
      <div className="subheading-row"><legend>공연 목록</legend><button type="button" className="text-button" onClick={() => onChange([...performances, { id: createId('performance'), type: 'song', performerName: '', samePerformerAsPrevious: false, order: performances.length }])}>+ 공연 추가</button></div>
      {performances.length === 0 && <p className="muted">공연을 진행하려면 공연 항목을 추가해 주세요.</p>}
      {performances.map((performance, index) => (
        <div className="performance-card" key={performance.id}>
          <strong>공연 {index + 1}</strong>
          <div className="form-grid two">
            <label>유형<select className={inputClass} value={performance.type} onChange={(e) => update(performance.id, { type: e.target.value as PerformanceItem['type'] })}><option value="song">축가</option><option value="dance">축무</option><option value="instrumental">축주</option></select></label>
            <label>진행자<input className={inputClass} value={performance.performerName} onChange={(e) => update(performance.id, { performerName: e.target.value })} /></label>
            <label>곡명/공연명<input className={inputClass} value={performance.title ?? ''} onChange={(e) => update(performance.id, { title: e.target.value })} /></label>
            <label>관계<input className={inputClass} value={performance.performerRelation ?? ''} onChange={(e) => update(performance.id, { performerRelation: e.target.value })} /></label>
          </div>
          {index > 0 && <label className="switch-row"><input type="checkbox" checked={performance.samePerformerAsPrevious} onChange={(e) => update(performance.id, { samePerformerAsPrevious: e.target.checked })} />앞 공연과 같은 진행자</label>}
          <button type="button" className="text-button danger" onClick={() => onChange(performances.filter((p) => p.id !== performance.id).map((p, order) => ({ ...p, order })))}>공연 삭제</button>
        </div>
      ))}
    </fieldset>
  );
}
