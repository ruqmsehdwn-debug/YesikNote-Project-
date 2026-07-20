# YesikNote 프로젝트 현황

최종 갱신일: 2026-07-20

## 기준선

| 항목 | 현재 값 |
|---|---|
| Repository | `ruqmsehdwn-debug/YesikNote-Project-` |
| 기준 Branch | `main` |
| 현재 작업 Branch | `work/documentation-baseline-alignment` |
| 기준 HEAD (`main`, `origin/main`) | `b6f937c3e4876f02b2a6099bdf13a70bda45319e` |
| 문서 복구 Commit | `b6f937c3e4876f02b2a6099bdf13a70bda45319e` · 생성·Push `CONFIRMED` |
| 최신 배포 Commit | `6e136bcf9ac4e347df71654f609fc729a79885f0` |
| 배포 | [GitHub Pages](https://ruqmsehdwn-debug.github.io/YesikNote-Project-/) |
| Actions | [Deploy Vite site to GitHub Pages #6](https://github.com/ruqmsehdwn-debug/YesikNote-Project-/actions/runs/29521311659) · success |
| 작업 폴더 | Documentation Baseline Alignment 로컬 문서 수정 중 · Commit·Push 전 |
| 현재 Draft | key `yesiknote:owner-builder:draft:v1` · schema `2` |

## 현재 단계

- 전체 운영 단계: 10개(Phase 0~9)
- 현재: Documentation Baseline Alignment 로컬 문서 수정·검수
- 현재 Batch: Documentation Baseline Alignment
- 이전 Batch: Documentation Recovery · Commit `b6f937c` 생성 및 `origin/main` Push 완료
- 다음 단계: Product Owner의 별도 Commit 승인 대기
- 다음 기능 Batch: 문서 기준선 정렬 완료와 Product Owner 우선순위 승인 후 결정

## 구현 범위

### 배포됨

- Owner 5단계 Builder
- Canonical 주례 없음 13개 / 주례 있음 15개
- 화촉점화 A8 / B7 Child Item
- 식순·Child Item 이동, 추가, 복제, 삭제, 이름 변경, 진행·미진행
- 덕담·축사 및 축가·축무·축주 설정
- 공연 카드와 안정 ID 기반 Validation Navigation
- 소개 문장, 직접 대본, Cue, Note
- Owner 미리보기·최종 확인·MC 공통 Script Engine
- Preview Sync, 대상 카드 강조, 오류 입력 focus
- IME 안전 Autosave, 수동 저장, Draft 복원
- MC 읽기 전용 화면
- GitHub Pages 자동 배포

### 파일럿 전 필요 후보 · 미구현

- Final Snapshot과 최종 대본 확정
- 예식장 확인 흐름과 실제 사회자 전달 방식
- A4 인쇄·PDF

실사용 자료에서 확인된 역할은 `.pages`가 예식 한 건의 Final Snapshot·예식장 확인·A4 인쇄 기준 양식, `.numbers`가 여러 예식의 일정·준비 상태·음원·특이사항 운영 기준자료라는 것입니다. 원본과 개인정보는 Public GitHub에 추가하지 않습니다.

### 장기 범위 · 미구현 또는 Backlog

- 계정·로그인·권한
- Supabase·RLS·실제 DB/API
- 외부 공유 링크와 역할별 접근 제어
- 파일·음원 업로드
- Snapshot/Patch/Audit Trail
- Guest QR·결제·정산·통계

## QA와 승인

| 항목 | 상태 | 근거 |
|---|---|---|
| 자동 테스트 | PASSED | 최신 Commit 본문에 135개 통과 기록, 테스트 파일 4개 |
| Build | PASSED | Commit 전 최종 검수와 Actions Build 성공 |
| Typecheck | PASSED | Commit 전 `pnpm exec tsc --noEmit` 검수 기록 |
| Product Owner 사용성 QA | PO ACCEPTED | 현재 작업 대화의 대표 시나리오 확인과 Commit 승인 |
| GitHub Pages | DEPLOYED | Actions #6 success, 공개 URL HTTP 200 |
| 문서 복구 감사 | PASSED | Phase 6 완료 |
| 문서 복구 Commit | CONFIRMED | `b6f937c` 생성 및 `origin/main` Push 확인 |
| 문서 복구 과거 PO 승인 과정 | MISSING EVIDENCE | Git만으로 과거 승인 대화·과정을 확인할 수 없음 |
| Documentation Baseline Alignment | IN PROGRESS | 로컬 문서 수정·검수 중, Commit·Push 전 |

과거 브라우저 QA의 모든 원본 로그와 정확한 실행 시각은 저장소에 남아 있지 않아 일부 항목은 `MISSING EVIDENCE`입니다. 배포·Commit·테스트 코드로 확인 가능한 사실과 구분해 기록합니다.

## 코드와 문서 동기화

- `CEREMONY_TEMPLATES.md`: 13/15, A8/B7 기준과 일치
- `MVP_V0_1_SCOPE.md`: 기본 범위는 유효하지만 최신 UX Patch가 누락된 과거 문서
- `ACCEPTANCE_CRITERIA.md`: 체크 상태가 현재 완료 상태와 맞지 않는 과거 문서
- `SCRIPT_RULES.md`: 승인 대본 원문 기준으로 보존. 일부 소개 문장 UX 정책은 현재 코드와 `CONFLICT`
- README·통합 문서: Documentation Recovery는 `b6f937c`로 Commit·Push 완료, 현재 기준선 정렬 중
- 현재 `PRD.md`: 배포된 Owner Builder·MC MVP 구현 기준. 파일럿 계획·상위 제품 PRD는 후속 분리 후보

## 위험과 차단

### 알려진 위험

- 브라우저 `localStorage` 기반이라 다른 기기·브라우저와 Draft가 자동 공유되지 않습니다.
- 브라우저 데이터 삭제 시 서버 복구 수단이 없습니다.
- 구형 Script Rules의 소개 문장 정책과 현재 UI 정책이 일부 다릅니다.
- QA Correction 3~5와 Preview Sync는 최신 Commit 하나에 누적되어 독립 Commit으로 분리할 수 없습니다.
- 현재 Navy·Coral 구현과 Dark Green 방향 중 공식 디자인 기준은 Product Owner 결정 대기입니다.

### 차단

- 기능 사용을 막는 차단 이슈: 없음
- 다음 기능 Batch 시작 차단: Documentation Baseline Alignment 최종 검수와 별도 Commit 승인 미완료

## 최근 결정

- 기능 정상 여부를 Codex가 먼저 자동 검증하고, Product Owner는 대표 사용성 시나리오를 확인합니다.
- Commit과 Push·배포는 별도 승인을 받습니다.
- 최신 기능 코드가 배포된 뒤 문서 체계를 먼저 복구합니다.
- 문서와 기능 코드를 하나의 Commit으로 섞지 않습니다.
- 현재 구현, 파일럿 전 필요, 장기 범위를 문서에서 구분합니다.
- 새 문서가 기준 역할을 확보하기 전 기존 문서를 삭제하거나 이동하지 않습니다.

## 다음 행동

1. Documentation Baseline Alignment의 7개 문서 링크·상태·Diff 검수
2. 코드·데이터·지정 외 파일 변경이 포함되지 않았는지 확인
3. Product Owner에게 로컬 문서 변경 결과 보고
4. 별도 Commit 승인 후 승인 파일만 stage·Commit
5. 별도 Push 승인 후 원격 반영
6. Backlog 우선순위를 결정한 뒤 다음 기능 Batch 계획

## 역할

- Product Owner: 정책·문구·우선순위·Commit·배포 승인
- Codex: 근거 감사, 승인 범위 구현, 자동 QA, 문서 동기화
- 독립 검수: Diff·테스트·보안·범위·단계 일관성 확인

## 완료 조건

- README에서 모든 프로젝트 문서로 이동 가능
- 코드·Commit·배포·QA 상태가 문서 간 일치
- `UNKNOWN`, `CONFLICT`, `MISSING EVIDENCE`가 숨겨지지 않음
- 문서 전용 Commit이 `main`과 Pages 기능 코드를 변경하지 않음

## 관련 문서

- [제품 요구사항](./PRD.md)
- [개발 체크리스트](./Todos.md)
- [주요 의사결정](./DECISIONS.md)
- [변경 이력](./CHANGELOG.md)
- [QA 기록](./QA_LOG.md)
- [향후 기능](./BACKLOG.md)
- [작업 운영 규칙](./WORKFLOW.md)
