# YesikNote QA 기록

Codex 자동 기능 QA와 Product Owner 사용성 QA를 구분합니다. 저장소에 원본 로그가 없는 항목은 사실을 확장하지 않습니다.

## QA-001 — Canonical·Draft 회귀 테스트

- 날짜: 최신 누적 확인 2026-07-17
- Commit: `6e136bc`
- 환경: Vitest / jsdom
- 유형: 자동 테스트
- 절차: `ceremonyTemplates.test.ts`, `validationStorage.test.ts` 실행
- 예상: 13/15, A8/B7, migration, 안정 ID 보존
- 실제: 최신 누적 테스트 135개 통과 기록에 포함
- 판정: PASSED
- 파일: `ceremonyTemplates.test.ts`, `draftStorage.ts`, `ceremonyTemplates.ts`
- 증거: 테스트 코드와 Commit 본문
- 위험: 과거 Batch별 전체 실행 로그는 `MISSING EVIDENCE`
- PO 확인: Batch A 이후 승인

## QA-002 — Script Engine·대본 정합성

- 날짜: 최신 누적 확인 2026-07-17
- Commit: `6e136bc`
- 환경: Vitest / jsdom
- 유형: 자동 테스트
- 절차: 입장 분기, 소개 문장, override, 혼인서약·성혼선언, 공연 대본 검사
- 예상: Owner·최종·MC가 같은 Script Engine 결과 사용
- 실제: 관련 회귀 테스트 통과
- 판정: PASSED
- 파일: `scriptEngine.test.ts`, `scriptEngine.ts`, `ScriptPreview.tsx`
- 증거: 테스트 코드, 135개 누적 통과 기록
- 위험: 모든 승인 대본 원문의 별도 snapshot은 없음
- PO 확인: 대표 브라우저 QA에서 화면 결과 확인

## QA-003 — Autosave·IME·Draft 복원

- 날짜: 2026-07-17
- Commit: `6e136bc`
- 환경: Vitest / Product Owner 로컬 브라우저
- 유형: 자동 기능 QA + 사용성 QA
- 절차: 입력 후 저장 상태, focus 유지, 새로고침 복원, composition 종료 저장 확인
- 예상: 다른 입력칸을 누르지 않아도 최종 입력이 저장되고 새로고침 후 복원
- 실제: 자동 테스트 통과, Product Owner가 저장 상태와 새로고침 복원을 확인
- 판정: PASSED · PO ACCEPTED
- 파일: `useDraft.test.tsx`, `useDraft.ts`, `draftStorage.ts`
- 증거: 테스트 코드와 현재 작업 대화
- 위험: 브라우저 프로세스 완전 종료 시나리오의 영구 QA 로그는 `MISSING EVIDENCE`
- PO 확인: 완료

## QA-004 — 공연 Validation Navigation

- 날짜: 2026-07-17
- Commit: `6e136bc`
- 환경: Vitest / Product Owner 로컬 브라우저
- 유형: 자동 기능 QA + 대표 사용성 QA
- 절차: 공연 오류에서 `수정하기`, 두 번째 공연 카드, field focus, 강조 해제 확인
- 예상: 덕담·축사로 잘못 이동하지 않고 안정 ID 대상에 도달
- 실제: 관련 테스트 통과, Product Owner가 대상 강조를 확인
- 판정: PASSED · PO ACCEPTED
- 파일: `validationStorage.test.ts`, `draftValidator.ts`, `ItemDetailEditor.tsx`, `OwnerBuilderPage.tsx`
- 증거: 테스트 코드와 현재 작업 대화
- 위험: 과거 모든 캡처는 저장소에 보존되지 않음
- PO 확인: 완료

## QA-005 — Preview Sync

- 날짜: 2026-07-17
- Commit: `6e136bc`
- 환경: Product Owner 데스크톱 브라우저 / 자동 테스트
- 유형: 기능·사용성 QA
- 절차: 편집할 식순을 변경하고 실시간 미리보기의 같은 식순 카드 이동 확인
- 예상: 선택할 때 한 번 이동하고 타이핑 중 반복 스크롤하지 않음
- 실제: 초기 수동 QA 실패 후 최소 수정, 재확인 통과
- 판정: PASSED · PO ACCEPTED
- 파일: `ScriptPreview.tsx`, `OwnerBuilderPage.tsx`, 관련 테스트
- 증거: 최신 코드, 테스트, Product Owner 재확인
- 위험: 정확한 초기 실패 캡처 경로는 임시 파일이므로 영구 증거가 아님

## QA-006 — 최종 Diff·보안·변경 범위

- 날짜: 2026-07-17
- Commit: Commit 전 검수 대상, 이후 `6e136bc`
- 환경: Git working tree
- 유형: 독립 검수
- 절차: 14개 누적 변경 파일, 비밀정보, Canonical, Draft, DnD, IME, Autosave 검사
- 예상: 승인 범위 밖 파일과 비밀정보 없음
- 실제: PASS 보고 후 Product Owner Commit 승인
- 판정: PASSED
- 증거: Commit 파일 목록과 현재 작업 대화
- 위험: 독립된 외부 감사 도구 결과는 없음
- PO 확인: 완료

## QA-007 — Build·Typecheck·배포

- 날짜: 2026-07-17
- Commit: `6e136bc`
- 환경: 로컬 TypeScript / GitHub Actions Ubuntu
- 유형: 자동 검증·배포 Smoke
- 절차: `pnpm build`, `pnpm exec tsc --noEmit`, Actions Pages workflow, 공개 URL 응답 확인
- 예상: build 성공, Pages asset 경로 정상
- 실제: 로컬 검수 PASS, Actions #6 success, 공개 URL HTTP 200
- 판정: PASSED · DEPLOYED
- 증거: [Actions #6](https://github.com/ruqmsehdwn-debug/YesikNote-Project-/actions/runs/29521311659), [Pages](https://ruqmsehdwn-debug.github.io/YesikNote-Project-/)
- 위험: lint 명령은 미구성
- PO 확인: Push·배포 승인 완료

## QA 운영 원칙

1. Codex가 반복 가능한 기능 QA를 직접 수행합니다.
2. 실패 시 승인 범위 안에서 최소 수정하고 자동 테스트를 다시 실행합니다.
3. Product Owner는 대표 사용자 시나리오에서 문구·이해도·흐름을 판단합니다.
4. 이미 자동 통과한 기능을 Product Owner에게 반복 입력시키지 않습니다.
5. Product Owner 최종 QA 전에는 Commit·Push·배포하지 않습니다.

