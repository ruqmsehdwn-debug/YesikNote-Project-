# YesikNote 주요 의사결정

정확한 최초 결정일이 저장소에서 확인되지 않는 경우 날짜를 추정하지 않고 `MISSING EVIDENCE`로 표시합니다.

## DEC-001 — Canonical 13/15와 화촉 A8/B7 유지

- 날짜: 2026-07-14 코드 반영
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 배경: 문서와 초기 템플릿 개수가 달랐습니다.
- 최종 결정: 주례 없음 13개, 주례 있음 15개, 화촉 A8/B7을 Canonical 기준으로 사용합니다.
- 이유: Owner·Script Engine·MC·테스트의 실제 순서를 하나로 맞추기 위해서입니다.
- 사용자 영향: 새 Draft는 승인된 기본 식순으로 시작합니다.
- 코드 영향: `ceremonyTemplates.ts`
- 데이터 영향: 기존 ID와 입력을 보존하는 migration이 필요했습니다.
- 테스트 영향: Canonical 개수·순서·Child 순서 회귀 테스트
- 되돌릴 조건: 새로운 Canonical 문서와 데이터 migration이 별도로 승인된 경우
- 관련 요구사항: `REQ-TEMPLATE-001`, `REQ-CANDLE-001`
- 관련 Batch: Batch A
- 관련 Commit: `af88668`

## DEC-002 — Draft key와 schema 2 보존

- 날짜: 2026-07-14 코드 반영
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 배경: 기존 브라우저 Draft의 사용자 입력을 잃지 않아야 했습니다.
- 최종 결정: key `yesiknote:owner-builder:draft:v1`, schema `2`를 유지하고 schema 1 원본은 backup 후 migration합니다.
- 이유: 배포 후 기존 Draft와의 호환성을 유지하기 위해서입니다.
- 데이터 영향: schema 1만 비파괴 migration, 최신 schema는 no-op
- 되돌릴 조건: 별도 schema·migration·rollback 계획 승인
- 관련 요구사항: `REQ-DRAFT-001`
- 관련 Batch: Batch A
- 관련 Commit: `af88668`

## DEC-003 — 정렬과 Navigation은 안정 ID 사용

- 날짜: 정확한 최초 결정일 `MISSING EVIDENCE`, 최신 반영 2026-07-17
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 문제: 배열 index와 화면 번호는 DnD·통합 출력 후 달라질 수 있습니다.
- 최종 결정: 식순과 공연 카드는 안정 ID로 식별하고 정렬은 order만 변경합니다.
- 사용자 영향: 오류의 `수정하기`가 정확한 식순과 공연 입력칸으로 이동합니다.
- 코드 영향: `OwnerBuilderPage.tsx`, `ItemDetailEditor.tsx`, `draftValidator.ts`
- 데이터 영향: 기존 ID 보존
- 테스트 영향: DnD 이후 이동, 두 번째 공연 focus, 카드 강조
- 관련 요구사항: `REQ-ORDER-001`, `REQ-NAV-001`
- 관련 Batch: Batch A, QA Correction 5, UX Patch
- 관련 Commit: `af88668`, `6e136bc`

## DEC-004 — 하나의 Script Engine 결과 공유

- 날짜: MVP 기준부터 적용, 정확한 최초 결정일 `MISSING EVIDENCE`
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 최종 결정: Owner 미리보기·최종 확인·MC 화면은 동일한 `ScriptPackage`를 사용합니다.
- 이유: 화면별 대본·Cue·Note 불일치를 방지하기 위해서입니다.
- 코드 영향: `scriptEngine.ts`, `ScriptPreview.tsx`, `McPrompterPage.tsx`
- 테스트 영향: 화면별 제목·대본·Cue 일치 회귀 테스트
- 관련 요구사항: `REQ-SCRIPT-001`
- 관련 Batch: Owner MVP, Batch B, Batch B.1, Preview Sync
- 관련 Commit: `114ad94`, `5b65c4a`, `5baa2ec`, `6e136bc`

## DEC-005 — 미진행은 삭제가 아니며 입력을 보존

- 날짜: MVP 정책, 정확한 최초 결정일 `MISSING EVIDENCE`
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 최종 결정: 미진행은 `active = false`로 처리하고 MC·최종 대본·Cue·Note에서 제외합니다.
- 이유: 다시 진행으로 바꿀 때 기존 입력과 설정을 복원해야 하기 때문입니다.
- 데이터 영향: 항목·Child·공연 입력 삭제 금지
- 관련 요구사항: `REQ-ACTIVE-001`
- 관련 Batch: Owner MVP 이후 전체

## DEC-006 — 기능 QA와 Product Owner 사용성 QA 분리

- 날짜: 2026-07-17 확인
- 상태: ACCEPTED
- 결정자: Product Owner
- 최종 결정: Codex가 반복 기능 QA를 먼저 수행하고 Product Owner는 대표 시나리오 3~5개로 이해도·문구·흐름을 판단합니다.
- 이유: Product Owner에게 자동화 가능한 반복 검사를 전가하지 않기 위해서입니다.
- 문서 영향: `QA_LOG.md`, `WORKFLOW.md`
- 되돌릴 조건: 팀 QA 운영 방식 변경 승인
- 관련 Batch: QA Correction 5 이후

## DEC-007 — Commit과 Push·배포는 별도 승인

- 날짜: 정확한 최초 결정일 `MISSING EVIDENCE`, 현재 운영 기준 확인 2026-07-17
- 상태: ACCEPTED
- 결정자: Product Owner
- 최종 결정: 구현, Commit, Push·배포를 각각 별도 단계로 진행합니다.
- 이유: 승인되지 않은 변경의 원격 반영과 자동 배포를 막기 위해서입니다.
- 문서 영향: `WORKFLOW.md`, `AGENTS.md`

## DEC-008 — 소개 문장과 본문을 분리하고 중복 방지

- 날짜: 2026-07-14~2026-07-17 누적 반영
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 최종 결정: 소개 문장은 본문 앞에 표시하며 자동 생성·직접 입력·소개 생략을 구분합니다. 직접 입력과 자동 문장을 중복 출력하지 않습니다.
- 사용자 영향: 소개를 생략하면 `없음` 등의 문자열이나 빈 블록이 보이지 않습니다.
- 코드 영향: `scriptEngine.ts`, `ScriptPreview.tsx`, `ItemDetailEditor.tsx`
- 테스트 영향: 소개 모드, override 우선순위, 공연 중복 방지
- 관련 요구사항: `REQ-INTRO-001`, `REQ-SCRIPT-002`
- 관련 Batch: Batch B, Batch B.1, QA Correction 3~5
- 관련 Commit: `5b65c4a`, `5baa2ec`, `6e136bc`

## DEC-009 — Preview Sync는 선택 시 한 번만 이동

- 날짜: 2026-07-17 반영
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 최종 결정: 선택한 식순의 미리보기 카드로 한 번 이동하고 타이핑 중 반복 스크롤하지 않습니다.
- 이유: 작성 위치를 잃지 않으면서 편집 대상 대본을 바로 확인하기 위해서입니다.
- 코드 영향: `ScriptPreview.tsx`, `OwnerBuilderPage.tsx`
- 테스트 영향: 선택 카드 강조·자동 해제·reduced-motion
- 관련 요구사항: `REQ-PREVIEW-001`
- 관련 Commit: `6e136bc`

## DEC-010 — IME 안전 Autosave와 수동 저장 병행

- 날짜: MVP부터 Autosave, 수동 저장은 2026-07-17 최신 반영
- 상태: ACCEPTED · DEPLOYED
- 결정자: Product Owner
- 최종 결정: 입력은 자동 저장하되 한국어 조합을 고려하고, 사용자가 즉시 저장할 수 있는 보조 버튼을 제공합니다.
- 사용자 영향: 저장 중·자동 저장됨·저장 실패 상태를 확인할 수 있습니다.
- 코드 영향: `useDraft.ts`, Owner Header
- 데이터 영향: 기존 Draft key/schema 변경 없음
- 테스트 영향: focus 유지, debounce, 새로고침 복원, IME
- 관련 요구사항: `REQ-AUTOSAVE-001`, `REQ-SAVE-001`, `REQ-IME-001`
- 관련 Commit: `6e136bc`

## DEC-011 — 기능 배포 후 문서 체계 우선 복구

- 날짜: 2026-07-17
- 상태: ACCEPTED · IN PROGRESS
- 결정자: Product Owner
- 최종 결정: 다음 기능 Batch 전에 README·현황·PRD·Todos·결정·변경·QA·Backlog·Workflow를 복구합니다.
- 이유: 코드와 의사결정, QA, 다음 우선순위를 한 기준에서 추적하기 위해서입니다.
- 코드 영향: 없음
- 문서 영향: 문서 8개 신규, README·AGENTS 병합
- 되돌릴 조건: 문서 최종 검수 실패
- 관련 Batch: Documentation Recovery
- 관련 Commit: 아직 없음

