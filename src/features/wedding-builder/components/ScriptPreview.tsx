import type { ScriptPackage } from '../models/ceremony';

export function ScriptPreview({ script }: { script: ScriptPackage }) {
  return (
    <aside className="preview-panel">
      <div className="section-kicker">실시간 미리보기</div>
      <h2>사회자 대본</h2>
      <p className="muted">활성 식순 {script.ceremonySections.length}개 · 예상 {Math.ceil(script.totalEstimatedTimeSeconds / 60)}분</p>
      <div className="preview-scroll">
        {script.ceremonySections.length === 0 ? (
          <div className="empty-state small">
            <strong>대본이 아직 없습니다.</strong>
            <p>자유 식순을 추가하고 MC 대본을 직접 입력해 주세요.</p>
          </div>
        ) : (
          script.ceremonySections.map((section, index) => (
            <article className="script-preview-card" key={section.id}>
              <span>{index + 1}</span>
              <h3>{section.title}</h3>
              <p className="preview-narration">{section.narration || 'MC 대본 입력이 필요합니다.'}</p>
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
