# YesikNote 작업 지침

## 작업 전 읽기

새 작업을 시작하기 전에 아래 문서를 순서대로 읽습니다.

1. `AGENTS.md`
2. `docs/WORKFLOW.md`
3. `docs/PROJECT_LEDGER.md`
4. `docs/PRD.md`
5. `docs/Todos.md`
6. `docs/DECISIONS.md`
7. `docs/BACKLOG.md`

현재 Batch 범위, 완료 조건, 변경 금지 영역, Product Owner 승인 상태를 확인한 뒤 작업합니다.

## 기준과 우선순위

1. 현재 Product Owner가 승인한 FINAL 문서와 명시적 결정
2. 현재 저장소의 코드와 자동 테스트
3. `docs/SCRIPT_RULES.md`의 승인 대본 원문
4. PRD·기능·정책 문서
5. 과거 보고와 대화

문서와 코드가 다르면 즉시 고치지 말고 `CONFLICT`로 보고합니다. 접근할 수 없는 과거 자료를 확인했다고 쓰지 않습니다.

## 고정 데이터 계약

- 주례 없음 13개 / 주례 있음 15개 Canonical 식순을 유지합니다.
- 화촉점화 유형 A는 8개, 유형 B는 7개 Child Item을 유지합니다.
- Draft key는 `yesiknote:owner-builder:draft:v1`, schema는 `2`입니다.
- 식순과 공연 카드는 안정 ID로 식별합니다. 배열 index와 화면 번호를 ID처럼 사용하지 않습니다.
- `active = false`는 삭제가 아닙니다. 입력값을 보존하고 재활성화할 때 복원합니다.
- 한국어 IME 조합 중에는 중간 값을 저장하지 않습니다.
- Owner 미리보기·최종 확인·MC 화면은 같은 Script Engine 결과를 사용합니다.

## 구현 안전 규칙

- 새 프로젝트를 만들거나 `src` 전체를 교체하지 않습니다.
- 기존 정상 기능을 다시 구현하지 않고 승인된 차이만 최소 수정합니다.
- 표준 사회자 대본을 추측·요약·의역·재창작하지 않습니다.
- 기존 테스트를 삭제·skip·완화하지 않습니다.
- 사용자 Draft, 직접 수정 대본, Custom Item, 정렬, 완료 상태를 보존합니다.
- Supabase, Auth, RLS, DB/API, Snapshot, Patch, Guest, 결제를 승인 없이 추가하지 않습니다.
- 배포 설정, dependency, package script는 승인 범위일 때만 변경합니다.
- API key, token, credential, 개인정보 또는 `.env` 값을 Commit하지 않습니다.

## Batch 운영

1. 읽기 전용 기준선 감사
2. 한 Batch의 계획과 수정 파일 승인
3. 승인 범위의 최소 구현
4. 기존 테스트·신규 테스트·build·typecheck
5. Codex 자율 기능 QA
6. Product Owner 대표 사용성 QA
7. 최종 Diff와 비밀정보 검수
8. Commit 승인
9. Push·배포 승인
10. 문서 동기화

Commit, Push, PR, merge, 배포는 서로 별도 승인으로 취급합니다. 자세한 절차는 `docs/WORKFLOW.md`를 따릅니다.

## 기본 검사 명령

```bash
pnpm test
pnpm build
pnpm exec tsc --noEmit
```

lint 명령은 현재 구성되어 있지 않습니다. 검사만을 위해 새 설정이나 package를 추가하지 않습니다.

## 문서 동기화

- 기능 Batch가 배포되면 `PROJECT_LEDGER`, `PRD`, `Todos`, `DECISIONS`, `CHANGELOG`, `QA_LOG`, `BACKLOG`을 검토합니다.
- 확인된 사실은 `CONFIRMED`, 자료가 없으면 `UNKNOWN` 또는 `MISSING EVIDENCE`, 충돌하면 `CONFLICT`로 기록합니다.
- 문서 변경은 기능 코드와 분리된 문서 전용 Commit을 사용합니다.
- 완료되지 않은 작업을 `[x]`, `VERIFIED`, `DEPLOYED`로 표시하지 않습니다.
