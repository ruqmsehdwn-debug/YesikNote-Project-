# YesikNote 변경 이력

날짜와 Commit이 Git에서 확인되는 변경만 확정 기록합니다. 독립 Commit이 없는 QA Correction은 최신 누적 Commit 아래에 포함합니다.

## Unreleased — Documentation Baseline Alignment

- README, Project Ledger, PRD, Todos, Decisions, Changelog, 기존 Acceptance Criteria의 역할·상태 정렬
- 현재 MVP, 파일럿 전 필요 후보, 장기 범위를 구분
- Documentation Recovery Commit·Push 사실과 과거 승인 근거의 `MISSING EVIDENCE`를 구분
- 코드·데이터 변경 없음
- 아직 Commit·Push되지 않음

## 2026-07-17 — Documentation Recovery

Commit: `b6f937c` · `docs(project): restore YesikNote project ledger and governance`

- README와 AGENTS를 현재 운영 상태에 맞게 병합
- 프로젝트 현황, PRD, Todos, Decisions, QA Log, Backlog, Workflow 복구
- 코드 변경 없음
- Commit 생성과 `origin/main` Push 확인
- 과거 Product Owner 승인 대화·과정은 `MISSING EVIDENCE`

## 2026-07-17 — Post-Patch QA·Owner UX 안정화

Commit: `6e136bc` · `fix(qa): finalize owner UX and validation flows`

- 선택 식순과 실시간 미리보기 동기화
- 덕담·축사 편집과 사용자 표시 개선
- 공연 카드 편집, 소개 문장 조합, 중복 대본 방지
- 안정 ID 기반 Validation Navigation
- 정확한 공연 카드 스크롤·강조·입력 focus
- IME 안전 Autosave와 수동 저장 상태
- 최종 확인 오류별 `수정하기`
- 누적 회귀 테스트 135개 통과 기록
- GitHub Actions #6과 Pages 배포 성공

QA Correction 3, Preview Sync, QA Correction 5, 현재 UX Patch의 독립 Commit 구분은 `MISSING EVIDENCE`이며 이 Commit에 누적되어 있습니다.

## 2026-07-15 — Batch B.1 브라우저 QA 보완

Commit: `5baa2ec` · `fix(batch-b.1): complete browser QA corrections`

- 신랑 입장 방식별 대본·Cue·Note
- 모든 식순 소개 멘트 공통 출력
- 혼인서약·성혼선언 사회자 진행 조합과 통합 출력
- 임시 문구 제거와 중복 순서 방지
- 최종 확인 안내 문구와 역할 배지
- 덕담·축사 / 축가·축무·축주 의미 분리
- 성혼선언자 중립 표현

## 2026-07-14 — Batch B Reactive Script

Commit: `5b65c4a` · `feat(batch-b): align speech labels reactive cues and intro rendering`

- speechType 기반 덕담·축사 표시
- 신부 입장 방식별 Cue·Note
- 혼인서약 소개 문장과 본문 결합
- Owner와 MC 표시 결과 정합성 보완

## 2026-07-14 — Batch A Canonical·Draft Migration

Commit: `af88668` · `feat: align canonical ceremony templates and draft migration`

- 주례 없음 13개 / 주례 있음 15개
- 신랑·신부 맞절과 예물교환 안정 ID
- 화촉 A8 / B7
- schema 1 Draft의 비파괴 migration과 backup
- 기존 사용자 입력·Custom Item·active·Child ID 보존

## 2026-07-14 — GitHub Pages 배포 수정

Commit: `5f4c976` · `Fix GitHub Pages deployment`

- Vite base를 저장소 경로에 맞춤
- `dist`를 배포하는 pnpm 기반 GitHub Actions 추가

## 2026-07-14 — Owner Builder MVP

Commit: `114ad94` · `Implement Owner Builder MVP v1.4`

- Owner 5단계 Builder
- 규칙 기반 Script Engine
- localStorage Draft 저장·복원
- MC 읽기 전용 프롬프터
- DnD와 한국어 IME 저장 처리

## 2026-07-13 — 저장소 생성

Commit: `bfd7b2b` · `Initial commit`
