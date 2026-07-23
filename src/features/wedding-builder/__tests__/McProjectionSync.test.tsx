import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { McPrompterPage } from '../../mc-prompter/pages/McPrompterPage';
import { createDraft } from '../data/ceremonyTemplates';
import { generateScript } from '../services/scriptEngine';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('MC Projection 동기화', () => {
  it('직접 수정 대본을 보존하고 Cue·Note·확인 필요를 서로 다른 영역에 표시한다', () => {
    const draft = createDraft();
    const declaration = draft.items.find((item) => item.type === 'pronouncement')!;
    declaration.narrationOverride = '사용자가 직접 수정한 성혼선언 대본';
    declaration.cueOverride = ['성혼선언자 마이크 준비'];
    declaration.requestNote = '성혼선언자 위치 확인';
    draft.items = [declaration];
    const script = generateScript(draft);
    const targetIndex = [...script.preCeremonyChecklist, ...script.ceremonySections]
      .findIndex((section) => section.id === declaration.id);
    const view = render(
      <MemoryRouter>
        <McPrompterPage draft={draft} />
      </MemoryRouter>,
    );

    for (let index = 0; index < targetIndex; index += 1) {
      fireEvent.click(view.getByRole('button', { name: '다음 →' }));
    }

    expect(view.getByText('사용자가 직접 수정한 성혼선언 대본')).toBeInTheDocument();
    const cue = view.getByRole('heading', { name: '진행 큐' }).closest('section')!;
    const note = view.getByRole('heading', { name: '주의사항 / 실행 메모' }).closest('section')!;
    expect(within(cue).getByText('성혼선언자 마이크 준비')).toBeInTheDocument();
    expect(within(note).getByText('성혼선언자 위치 확인')).toBeInTheDocument();
    expect(view.getByRole('heading', { name: '현재 식순 확인 필요' })).toBeInTheDocument();
    expect(view.getByText(/직접 수정 대본 확인 필요/)).toBeInTheDocument();
  });
});
