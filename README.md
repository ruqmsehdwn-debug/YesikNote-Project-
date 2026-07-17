# YesikNote · 예식노트

예비 신랑·신부가 예식 정보를 입력하고 식순을 정리하면, 같은 순서와 데이터로 사회자 대본·진행 큐·주의사항을 만드는 React 기반 MVP입니다.

## 해결하는 문제

결혼식 식순은 신랑·신부, 사회자, 예식장이 서로 다른 문서로 관리하기 쉽습니다. 예식노트는 Owner Builder에서 입력한 내용을 규칙 기반 대본으로 조합해, 편집 화면과 최종 확인 화면, MC 읽기 전용 화면이 같은 결과를 사용하도록 합니다.

## 현재 MVP

- Owner 5단계 식순 작성 화면
- 주례 없는 예식 13개 / 주례 있는 예식 15개 Canonical 템플릿
- 화촉점화 유형 A 8개 / 유형 B 7개 Child Item
- 식순 Drag & Drop과 모바일 위·아래 이동
- 진행·미진행, 추가, 복제, 삭제, 이름 변경
- 소개 문장, 기본 대본, 직접 수정 대본, 진행 큐, 주의사항
- 덕담·축사와 축가·축무·축주의 의미 분리
- 공연 카드별 입력과 안정 ID 기반 오류 이동
- Owner 실시간 미리보기와 최종 확인, MC 화면의 공통 Script Engine 결과
- 한국어 IME를 고려한 자동 저장, 수동 저장, 새로고침 복원
- MC 읽기 전용 프롬프터

인증, Supabase, 실제 공유 링크, 역할 권한, 파일 업로드, 결제 기능은 아직 포함하지 않습니다. Draft는 현재 브라우저 `localStorage`에 저장됩니다.

## 현재 프로젝트 상태

- Branch: `main`
- 최신 안정 Commit: `6e136bcf9ac4e347df71654f609fc729a79885f0`
- 최신 배포 Commit: `6e136bcf9ac4e347df71654f609fc729a79885f0`
- 현재 단계: Documentation Recovery
- 자동 테스트: 135개 통과 기록
- 공개 화면: [GitHub Pages](https://ruqmsehdwn-debug.github.io/YesikNote-Project-/)
- 배포 기록: [GitHub Actions](https://github.com/ruqmsehdwn-debug/YesikNote-Project-/actions/runs/29521311659)

세부 현황과 다음 행동은 [프로젝트 전체 현황](./docs/PROJECT_LEDGER.md)을 기준으로 확인합니다.

## 기술 구성

- React 19
- TypeScript
- Vite
- Vitest / Testing Library
- dnd-kit
- pnpm
- GitHub Actions / GitHub Pages

## 로컬 실행

```bash
pnpm install
pnpm dev
```

Vite의 기본 개발 주소는 `http://localhost:5173/YesikNote-Project-/`입니다. 다른 포트를 사용한 경우 터미널에 표시된 주소를 따릅니다.

## 검사 명령

```bash
pnpm test
pnpm build
pnpm exec tsc --noEmit
```

별도의 lint 명령은 현재 구성되어 있지 않습니다.

## 주요 화면

- `/`: Owner 5단계 식순 작성 화면
- `/mc`: 같은 브라우저 Draft를 사용하는 MC 읽기 전용 화면

GitHub Pages에서는 저장소 경로 `/YesikNote-Project-/` 아래에서 실행됩니다.

## 데이터 안전 기준

- Draft key: `yesiknote:owner-builder:draft:v1`
- Draft schema: `2`
- schema 변경과 migration은 Product Owner 승인 없이 수행하지 않습니다.
- 비활성 항목은 데이터를 지우지 않으며 다시 진행으로 바꾸면 기존 입력을 복원합니다.
- 안정 ID를 배열 순번이나 화면 번호로 대체하지 않습니다.
- 한국어 IME 조합 중인 값을 성급하게 저장하지 않습니다.
- API key, token, 개인정보, `.env` 값을 Commit하지 않습니다.

## 프로젝트 문서

- [프로젝트 전체 현황](./docs/PROJECT_LEDGER.md)
- [제품 요구사항](./docs/PRD.md)
- [개발 체크리스트](./docs/Todos.md)
- [주요 의사결정](./docs/DECISIONS.md)
- [변경 이력](./docs/CHANGELOG.md)
- [QA 기록](./docs/QA_LOG.md)
- [향후 기능](./docs/BACKLOG.md)
- [작업 운영 규칙](./docs/WORKFLOW.md)
- [Codex 작업 지침](./AGENTS.md)
- [MVP 범위](./docs/MVP_V0_1_SCOPE.md)
- [Canonical 식순](./docs/CEREMONY_TEMPLATES.md)
- [표준 대본 규칙](./docs/SCRIPT_RULES.md)
- [기존 Acceptance Criteria](./docs/ACCEPTANCE_CRITERIA.md)

## 새 팀원 확인 순서

1. `README.md`
2. `AGENTS.md`
3. `docs/PROJECT_LEDGER.md`
4. `docs/PRD.md`
5. `docs/Todos.md`
6. `docs/DECISIONS.md`
7. `docs/BACKLOG.md`
8. 현재 Batch와 관련된 코드·테스트

문서와 코드가 다르면 즉시 코드를 바꾸지 말고 차이를 먼저 보고합니다.
