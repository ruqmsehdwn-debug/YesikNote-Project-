import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CeremonyDraft } from '../../wedding-builder/models/ceremony';
import { generateScript } from '../../wedding-builder/services/scriptEngine';
import {
  loadMcState,
  saveMcState,
  type McPrompterState,
} from '../../wedding-builder/storage/draftStorage';

export function McPrompterPage({ draft }: { draft: CeremonyDraft }) {
  const script = useMemo(() => generateScript(draft), [draft]);
  const allSections = [...script.preCeremonyChecklist, ...script.ceremonySections];
  const [state, setState] = useState<McPrompterState>(() => loadMcState(draft.id));
  const initialIndex = Math.max(0, allSections.findIndex((section) => section.id === state.currentSectionId));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const current = allSections[currentIndex];
  const next = allSections[currentIndex + 1];

  useEffect(() => {
    setState((previous) => {
      if (previous.currentSectionId === current?.id) return previous;
      const nextState = { ...previous, currentSectionId: current?.id };
      saveMcState(nextState);
      return nextState;
    });
  }, [current?.id]);

  const updateState = (patch: Partial<McPrompterState>) => setState((previous) => {
    const nextState = { ...previous, currentSectionId: current?.id, ...patch };
    saveMcState(nextState);
    return nextState;
  });

  const completeCurrent = () => {
    if (!current) return;
    updateState({ completedSectionIds: [...new Set([...state.completedSectionIds, current.id])] });
    if (currentIndex < allSections.length - 1) setCurrentIndex(currentIndex + 1);
  };

  if (!current) {
    return <div className="mc-empty"><strong>표시할 활성 대본이 없습니다.</strong><Link to="/">Owner 화면으로 돌아가기</Link></div>;
  }

  return (
    <div className={`mc-shell ${state.theme} font-${state.fontScale} ${state.scrollLocked ? 'scroll-locked' : ''}`}>
      <header className="mc-header">
        <div className="mc-brand"><span>예식노트 MC</span><small>읽기 전용 프롬프터</small></div>
        <div className="mc-progress"><span>진행 {currentIndex + 1} / {allSections.length}</span><div><i style={{ width: `${((currentIndex + 1) / allSections.length) * 100}%` }} /></div></div>
        <div className="mc-now"><small>현재 순서 <span className="role-badge mc-role-badge" aria-label="현재 화면: 사회자용">사회자용</span></small><strong>{current.title}</strong></div>
        <div className="mc-next"><small>다음 순서</small><strong>{next?.title ?? '예식 종료'}</strong></div>
        <div className="mc-settings">
          <button type="button" onClick={() => updateState({ theme: state.theme === 'dark' ? 'light' : 'dark' })}>{state.theme === 'dark' ? '밝게' : '어둡게'}</button>
          <select aria-label="글자 크기" value={state.fontScale} onChange={(e) => updateState({ fontScale: e.target.value as McPrompterState['fontScale'] })}><option value="small">작게</option><option value="medium">보통</option><option value="large">크게</option><option value="xlarge">아주 크게</option></select>
          <button type="button" className={state.scrollLocked ? 'active' : ''} onClick={() => updateState({ scrollLocked: !state.scrollLocked })}>스크롤 {state.scrollLocked ? '잠김' : '잠금'}</button>
        </div>
      </header>

      {script.globalRequestNote && <aside className="mc-global-note"><strong>전체 요청사항</strong><p>{script.globalRequestNote}</p></aside>}

      <main className="mc-content">
        <article className="mc-script-card">
          <div className="mc-section-label"><span>{currentIndex + 1}</span><strong>{current.title}</strong>{state.completedSectionIds.includes(current.id) && <em>완료</em>}</div>
          <div className="mc-narration">{current.narration.split('\n').map((paragraph, index) => <p key={`${paragraph}-${index}`}>{paragraph}</p>)}</div>
        </article>
        <div className="mc-support-grid">
          <section className="mc-cue"><h2>진행 큐</h2>{current.cue.length ? <ol>{current.cue.map((cue) => <li key={cue}>{cue}</li>)}</ol> : <p>별도 진행 큐가 없습니다.</p>}</section>
          <section className="mc-note"><h2>주의사항 / 실행 메모</h2>{current.note.length ? <ul>{current.note.map((note) => <li key={note}>{note}</li>)}</ul> : <p>별도 주의사항이 없습니다.</p>}</section>
        </div>
      </main>

      <footer className="mc-controls">
        <button type="button" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>← 이전</button>
        <button type="button" className="complete" onClick={completeCurrent}>완료</button>
        <button type="button" onClick={() => setCurrentIndex(Math.min(allSections.length - 1, currentIndex + 1))} disabled={currentIndex === allSections.length - 1}>다음 →</button>
      </footer>
      <Link className="owner-return" to="/">Owner 화면</Link>
    </div>
  );
}
