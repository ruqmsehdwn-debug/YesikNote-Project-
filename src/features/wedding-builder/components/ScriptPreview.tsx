import { useEffect, useRef, useState } from 'react';
import type { CeremonyItem, ScriptPackage, ScriptSection } from '../models/ceremony';
import { resolvedIntroForItem } from '../services/scriptEngine';

function findItem(items: CeremonyItem[], id: string): CeremonyItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = item.children ? findItem(item.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}

function previewNarration(section: ScriptSection, items?: CeremonyItem[]) {
  const item = items ? findItem(items, section.id) : undefined;
  const intro = item ? resolvedIntroForItem(item) : '';
  if (!intro || !section.narration.startsWith(intro)) {
    return <span className="preview-body">{section.narration || 'MC 대본 입력이 필요합니다.'}</span>;
  }
  const body = section.narration.slice(intro.length).replace(/^\n/, '');
  return (
    <>
      <span className="preview-intro"><small>소개 문장</small>{intro}</span>
      {!!body && <span className="preview-body">{body}</span>}
    </>
  );
}

export function ScriptPreview({ script, items, selectedCeremonyItemId }: { script: ScriptPackage; items?: CeremonyItem[]; selectedCeremonyItemId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedId, setHighlightedId] = useState<string>();
  const selectedSection = script.ceremonySections.find((section) => section.id === selectedCeremonyItemId);
  const selectedSectionSignature = selectedSection
    ? [selectedSection.title, selectedSection.narration, ...selectedSection.cue, ...selectedSection.note].join('\u0000')
    : '';

  useEffect(() => {
    if (!selectedCeremonyItemId || !scrollRef.current) return;
    const card = [...scrollRef.current.querySelectorAll<HTMLElement>('[data-ceremony-item-id]')]
      .find((candidate) => candidate.dataset.ceremonyItemId === selectedCeremonyItemId);
    if (!card) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const top = card.offsetTop - (scrollRef.current.clientHeight - card.offsetHeight) / 2;
    if (typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    setHighlightedId(selectedCeremonyItemId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedId(undefined), 2000);

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [selectedCeremonyItemId, selectedSectionSignature]);

  return (
    <aside className={`preview-panel ${selectedCeremonyItemId ? 'has-selection' : ''}`}>
      <div className="section-kicker">실시간 미리보기</div>
      <h2>사회자 대본</h2>
      <p className="muted">활성 식순 {script.ceremonySections.length}개 · 예상 {Math.ceil(script.totalEstimatedTimeSeconds / 60)}분</p>
      <div className="preview-scroll" ref={scrollRef}>
        {script.ceremonySections.length === 0 ? (
          <div className="empty-state small">
            <strong>대본이 아직 없습니다.</strong>
            <p>자유 식순을 추가하고 MC 대본을 직접 입력해 주세요.</p>
          </div>
        ) : (
          script.ceremonySections.map((section, index) => (
            <article
              className={`script-preview-card ${selectedCeremonyItemId === section.id ? 'preview-selected' : ''} ${highlightedId === section.id ? 'preview-target' : ''}`}
              data-ceremony-item-id={section.id}
              key={section.id}
            >
              <span>{index + 1}</span>
              <h3>{section.title}</h3>
              <p className="preview-narration">{previewNarration(section, items)}</p>
              {!!section.cue.length && (
                <div className="preview-support preview-cue">
                  <small>진행 큐</small>
                  <ul>{section.cue.map((cue) => <li key={cue}>{cue}</li>)}</ul>
                </div>
              )}
              {!!section.note.length && (
                <div className="preview-support preview-note">
                  <small>주의사항 / 실행 메모</small>
                  <ul>{section.note.map((note) => <li key={note}>{note}</li>)}</ul>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
