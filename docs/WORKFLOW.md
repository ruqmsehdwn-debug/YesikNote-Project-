# YesikNote 작업 운영 규칙

## 1. 목적

현재 정상 기능과 사용자 Draft를 보존하면서 한 번에 한 가지 목적만 안전하게 개발하고, QA·승인·배포·문서를 같은 근거로 연결합니다.

## 2. 역할과 승인 권한

### Product Owner

- 제품 범위, 사용자 문구, 대본 원문, 우선순위를 결정합니다.
- 구현, Commit, Push·배포를 각각 승인합니다.
- 자동 테스트를 반복하는 대신 대표 사용성 시나리오를 확인합니다.

### Codex

- 실제 저장소를 기준으로 읽기 전용 감사를 수행합니다.
- 승인된 파일과 범위만 최소 수정합니다.
- 자동 테스트·build·typecheck와 기능 QA를 수행합니다.
- 실패와 충돌을 숨기지 않고 문서를 동기화합니다.

### 독립 검수

- 변경 파일, 승인 범위, 데이터 보존, 테스트, 비밀정보를 다시 확인합니다.
- 구현 담당자의 완료 보고만으로 `PASS`를 결정하지 않습니다.

## 3. 근거 우선순위

1. 현재 Product Owner의 명시적 FINAL 결정
2. 현재 코드와 자동 테스트
3. 승인된 Script Rules 원문
4. PRD·정책·기능 문서
5. Git Commit·Actions·Pages
6. 과거 보고·대화·스크린샷

접근할 수 없는 과거 자료를 읽었다고 주장하지 않습니다.

## 4. 상태값

| 상태 | 의미 |
|---|---|
| CONFIRMED | 현재 코드·Git·공식 근거로 확인 |
| IMPLEMENTED | 코드에 구현됨 |
| PASSED | 정해진 검증 통과 |
| PO ACCEPTED | Product Owner가 사용성 또는 결과 승인 |
| DEPLOYED | 공개 환경 반영 확인 |
| IN PROGRESS | 현재 수행 중 |
| PLANNED | 후보 또는 계획, 구현 승인 아님 |
| BLOCKED | 선행 결정이나 권한 없이는 진행 불가 |
| UNKNOWN | 현재 근거로 알 수 없음 |
| CONFLICT | 코드·문서·결정이 서로 다름 |
| NOT FOUND | 파일이나 기록이 존재하지 않음 |
| MISSING EVIDENCE | 결론 일부를 뒷받침할 원본 근거 부족 |

완료되지 않은 작업을 `[x]`, `VERIFIED`, `PO ACCEPTED`, `DEPLOYED`로 표시하지 않습니다.

## 5. FINAL MERGED 원칙

- 같은 작업의 여러 지침이 있으면 Product Owner가 지정한 최신 FINAL MERGED 문서를 기준으로 합니다.
- 최신 문서가 기존 승인 범위를 자동으로 폐기하지 않습니다.
- 서로 다른 문구·Canonical·데이터 정책은 `CONFLICT`로 보고하고 결정 전 구현하지 않습니다.

## 6. Batch 시작

1. 현재 branch, HEAD, origin 관계, working tree를 확인합니다.
2. 기존 테스트와 build 기준을 확인합니다.
3. 현재 코드·문서 차이를 보고합니다.
4. 목표, 수정 파일, 변경 금지 영역, 데이터 영향, 테스트, Rollback을 계획합니다.
5. Product Owner가 해당 Batch 구현을 승인할 때까지 파일을 수정하지 않습니다.

기준선이 다르거나 예상하지 못한 변경·테스트 실패·데이터 손실 위험이 있으면 중단합니다.

## 7. Batch 구현

- 새 프로젝트 생성, `src` 전체 교체, 대규모 리팩터링을 피합니다.
- 현재 승인된 파일만 수정합니다.
- 기존 exported type과 안정 ID를 가능한 유지합니다.
- Script Rules 대본을 추측해 새로 쓰지 않습니다.
- 테스트를 삭제·skip·완화하지 않습니다.
- schema 변경이 필요하면 구현을 멈추고 migration·rollback 계획을 승인받습니다.

## 8. 자동 검증

기본 명령:

```bash
pnpm test
pnpm build
pnpm exec tsc --noEmit
```

lint가 구성되지 않았다면 새 package나 설정을 추가하지 않고 `lint 명령 미구성`으로 보고합니다.

검증 결과에는 기존·신규·전체 테스트 수, 통과·실패·skip, build, typecheck, 알려진 경고를 기록합니다.

## 9. Product Owner QA

운영 순서:

```text
Codex 자율 기능 QA
→ 승인 범위 오류 직접 최소 수정
→ 자동 테스트·build·typecheck
→ 결과표와 증거 보고
→ Product Owner 대표 사용성 QA
→ 최종 Diff 검수
→ Commit 승인
→ Push·배포 승인
```

Product Owner에게 테스트 값 입력·클릭·새로고침을 한 단계씩 반복 요청하지 않습니다. 대표 시나리오 3~5개로 다음을 확인합니다.

- 처음 보는 사용자가 이해할 수 있는지
- 버튼과 입력 항목의 의미가 명확한지
- 화면 흐름이 자연스러운지
- 문구가 헷갈리지 않는지
- 실제 결혼 준비에서 불편하지 않은지

## 10. 최종 Diff 검수

- 변경 파일 전체와 additions/deletions
- 승인 범위 밖 변경
- 신규·삭제·미추적·staged 파일
- Canonical, 안정 ID, Draft key/schema
- DnD, IME, Autosave, 사용자 입력 보존
- API key, token, credential, `.env`, 개인정보
- 관련 없는 formatting·dependency·배포 변경
- 선택적 Rollback 방법

하나라도 중요한 실패가 있으면 `PASS`를 사용하지 않습니다.

## 11. Git과 배포 승인

다음은 별도 승인입니다.

1. Stage·Commit
2. Push
3. PR·merge가 필요한 경우
4. 배포 또는 배포 설정 변경

승인 파일만 명시적으로 stage하며 `git add .`, force push, history rewrite를 사용하지 않습니다. Push 후 local HEAD와 `origin/main`, Actions, Pages를 확인합니다.

## 12. 문서 동기화

기능 Batch가 배포되면 다음 문서를 검토합니다.

- `PROJECT_LEDGER.md`
- `PRD.md`
- `Todos.md`
- `DECISIONS.md`
- `CHANGELOG.md`
- `QA_LOG.md`
- `BACKLOG.md`

문서 변경은 기능 코드와 분리된 문서 전용 Commit으로 저장합니다. 확인되지 않은 날짜·QA·승인을 추측하지 않습니다.

## 13. 데이터와 Draft 보존

- 현재 Draft key: `yesiknote:owner-builder:draft:v1`
- 현재 schema: `2`
- 미진행은 삭제가 아닙니다.
- migration 성공 전 원본을 덮어쓰지 않습니다.
- 기존 사용자 입력, Custom Item, active, order, Child ID, 공연 ID, override, Cue, Note를 보존합니다.
- localStorage 전체 초기화는 Product Owner의 명시적 승인 없이 수행하지 않습니다.

## 14. schema·migration

schema 또는 데이터 모델 변경 전 다음을 제출합니다.

- 현재 payload와 새 payload
- 기존 Draft 판별 방법
- 중복 방지
- 실패 시 원본 보존
- backup key 또는 복구 경로
- no-op 조건
- unit·integration·새로고침 테스트
- Rollback 절차

승인 전에는 구현하지 않습니다.

## 15. Rollback

- Commit 전: 승인된 파일별 변경만 되돌릴 수 있는 범위를 보고합니다.
- 기능 Commit 후: history rewrite 대신 해당 Commit revert를 우선합니다.
- 문서 오류: 문서 전용 Commit만 revert합니다.
- 데이터 migration: 원본 backup과 구버전 reader가 준비되지 않으면 배포하지 않습니다.
- 사용자 작업 폴더의 기존 변경을 reset·restore·clean하지 않습니다.

## 16. 충돌 처리

다음 상황에서는 구현을 멈춥니다.

- Canonical 또는 대본 원문 충돌
- 안정 ID를 안전하게 결정할 수 없음
- 사용자 입력 손실 가능성
- 기존 테스트 실패
- 승인 범위 밖 파일 필요
- 배포·Auth·DB 변경 필요
- 문서와 실제 코드 구조가 다름

파일, 현재 값, 기대 값, 영향, 선택지를 Product Owner에게 보고합니다.

## 17. 공식 단계표

| Phase | 내용 | 시작 조건 | 완료 조건 |
|---:|---|---|---|
| 0 | 안전 기준선 감사 | 작업 요청 | branch·HEAD·status·범위 확인 |
| 1 | Product Owner QA 서버 | 기준선 PASS | 현재 로컬 코드 접속 가능 |
| 2 | 대표 사용성 QA | 자동 QA PASS | PO 결과 기록 |
| 3 | 최종 Diff Audit | PO QA 완료 | 범위·테스트·보안 판정 |
| 4 | 코드 Commit | Commit 승인 | 승인 파일만 Commit |
| 5 | Push·Actions·Pages | Push·배포 승인 | origin·Actions·공개 화면 확인 |
| 6 | 문서 읽기 전용 감사 | 배포 성공 | 복구 근거·충돌·계획 보고 |
| 7 | 문서 작성 | `문서 작성 승인` | 로컬 문서 초안 완료 |
| 8 | 문서 최종 검수 | 문서 작성 완료 | 링크·상태·Diff PASS |
| 9 | 문서 Commit·Push | `문서 Commit·Push 승인` | 원격 문서와 링크 확인 |

과거 16·18 단계 표기는 정의 근거가 부족해 공식 단계로 사용하지 않습니다. 작업명과 Commit을 기준으로 대응합니다.

## 18. 완료 판정과 인수인계

각 단계 보고에는 다음을 포함합니다.

- 현재 단계
- Product Owner가 할 일
- 아직 하면 안 되는 일
- 현재 단계 완료 조건
- 다음 단계와 시작 조건
- 변경 파일·테스트·Rollback·남은 위험

다음 기능 Batch는 현재 Batch의 문서와 배포가 완료되고 Product Owner가 우선순위를 승인한 뒤 시작합니다.

