# YesikNote Owner 최종 확인 UX와 MC 동기화 v0.1

상태: W4 구현·자동 테스트 `VERIFIED` · Product Owner 사용성 확인 전

## 1. 목적

신랑·신부가 최종 확인 화면에서 핵심 식순을 빠르게 읽고 누락 위치로 이동할 수 있게 하면서, 같은 Ceremony Draft와 Script Engine 결과가 예식장 전체 표와 MC 대본·Cue·Note에서 다른 의미로 변하지 않도록 합니다.

## 2. 역할별 화면 책임

| 역할 | 우선 정보 | W4 구현 |
|---|---|---|
| 신랑·신부 | 작성 상태, 확인 필요, 간단한 식순, 수정 위치 | 기본 목록형과 통합 확인 요약 |
| 예식장·예도 | 전체 순서, 진행자, Cue, Note, 확인 필요 | `전체 표 보기`와 A4 인쇄 |
| 사회자 | 현재 대본, 다음 순서, Cue, Note, 확인 필요 | 기존 MC 프롬프터와 Projection 확인 배지 |

세 화면은 같은 Draft를 사용하지만 같은 화면 구성을 복사하지 않습니다. Owner 기본 화면에는 실제 낭독 대본과 운영 정보를 과도하게 펼치지 않습니다.

## 3. Owner 목록형 최종 확인

- 최종 식순은 안정 ID와 실제 `order`를 기준으로 정렬합니다.
- 기본 화면에는 순번, 식순명, 핵심 정보 한 줄, 상태 배지, 자세히 보기만 표시합니다.
- 자세히 보기를 열면 진행 여부, 진행자·낭독자, 관계, 입장 방식, 공연 정보를 항목별 줄로 표시합니다.
- Cue와 Note는 서로 다른 영역으로 유지합니다.
- 전체 6열 표는 기본 렌더링하지 않고 `전체 표 보기` 또는 인쇄 준비 시 표시합니다.
- `active = false` 항목은 기본 목록과 MC 출력에서 제외하지만 Draft 입력값은 변경하지 않습니다.

## 4. 확인 필요 처리

- Validation과 Projection의 확인 필요 개수를 화면 상단에서 통합 표시합니다.
- `한 번에 확인하기`는 첫 번째 수정 가능한 오류의 기존 안정 ID·field 정보를 재사용합니다.
- 각 식순에는 해당 Validation 또는 Projection 경고가 있을 때 작은 확인 필요 배지를 표시합니다.
- 확인 필요와 미입력은 자동으로 사라지는 토스트로 대체하지 않습니다.

## 5. 현장 비고

- 예식장 체크표의 현장 비고는 기본 접힘입니다.
- 접힌 상태에서 비고 개수와 확인 필요 개수를 표시합니다.
- 펼치면 식순별 비고를 줄 단위로 표시합니다.
- 접힘 상태는 React 세션 상태 또는 HTML 기본 상태만 사용하며 localStorage에 저장하지 않습니다.

## 6. 토스트 적용 범위

W4의 접근 가능한 내부 토스트는 외부 라이브러리 없이 구현했습니다.

- 수동 저장 성공
- 식순 순서 변경 완료
- 최종 식순표 업데이트 완료
- 인쇄 준비 완료

자동 저장이 실행될 때마다 토스트를 띄우지 않습니다. 저장 실패, 미입력, 정책 미확정은 기존 고정 상태나 확인 필요 영역에 남습니다. 토스트는 `aria-live="polite"`로 읽히며 2.5초 후 닫힙니다.

## 7. 문장 포맷 규칙

- 기본 목록은 핵심 정보 한 줄만 사용합니다.
- 상세 정보는 `label: value` 의미의 정의 목록으로 분리합니다.
- 공연은 공연 수, 종류, 곡명·공연명, 진행자, 관계를 각각 별도 줄로 표시합니다.
- 입력값은 변경하지 않고 화면 표시에서만 연속 공백과 명백한 붙여쓰기를 정돈합니다.
- 없는 관계·호칭·곡명은 추정하지 않고 확인 필요로 둡니다.

## 8. Projection과 MC 동기화

```text
Owner Draft
→ generateScript(draft)
→ buildCeremonyProjection(draft, sharedScript)
→ Owner 간단 목록 / 예식장 전체 표
→ MC 대본 / Cue / Note / 현재 식순 확인 필요
```

- Owner가 생성한 하나의 `ScriptPackage`를 Projection에 주입할 수 있게 했습니다.
- MC도 같은 Script Engine 결과를 Projection에 전달합니다.
- MC 낭독 대본은 기존 Script Engine 결과를 그대로 최우선 표시합니다.
- Projection 확인 필요는 대본과 합치지 않고 별도 고정 안내로 표시합니다.
- Cue와 Note는 Owner 상세, 전체 표, MC에서 각각 분리합니다.

## 9. 직접 수정 대본 보호

- `narrationOverride` 우선순위는 기존 Script Engine에 그대로 유지됩니다.
- W4 Projection과 표시 변환 함수는 Draft를 변경하지 않는 순수 함수입니다.
- 직접 수정 대본이 있으면 Projection 확인 필요에 표시하지만 자동 대본으로 덮어쓰지 않습니다.
- Draft key `yesiknote:owner-builder:draft:v1`과 schema `2`는 변경하지 않았습니다.

## 10. 테스트와 QA

자동 테스트는 다음을 확인합니다.

- 목록형 기본 렌더링과 6열 표 기본 미노출
- 식순 상세 펼치기와 Cue·Note 분리
- 확인 필요 통합 요약과 정확한 입력 focus
- 현장 비고 기본 접힘
- 수동 저장·순서 변경·인쇄 준비 토스트
- `aria-live`와 자동 닫힘
- 성혼선언 주체, 공연 순서, 관계 표시
- `active = false` 제외와 입력 보존
- 직접 수정 대본 우선순위와 Draft 불변성
- MC 대본·Cue·Note·Projection 경고 분리

W4 구현 시점 기준 전체 테스트, build, typecheck와 `git diff --check`를 통과해야 Release할 수 있습니다.

## 11. 미구현 범위

| 기능 | 상태 |
|---|---|
| Final Snapshot 생성·잠금·버전 | NOT IMPLEMENTED |
| 주말 여러 예식 통합 체크리스트 | NOT IMPLEMENTED |
| 서버 저장·인증·권한 | NOT IMPLEMENTED |
| Change History | NOT IMPLEMENTED |
| 공연 카드와 곡 수의 확정 정책 | PROPOSED |
| 확정 이후 수정 정책 | PROPOSED |

## 12. 개발자 전달 요약

신랑·신부가 입력한 Draft는 그대로 보존합니다. Script Engine이 대본·Cue·Note를 한 번 만들고, Projection은 그 결과와 진행 정보를 화면 목적에 맞게 정리합니다. Owner는 간단한 목록을 먼저 보고, 자세히 보기에서 Cue와 Note를 확인합니다. 예식장 전체 표와 인쇄물은 같은 데이터를 6열로 보여줍니다. MC는 기존 자동 대본과 직접 수정 대본 우선순위를 유지하며 현재 식순의 확인 필요만 별도 안내합니다. 이 과정에서 Draft key, schema, migration, 서버 저장은 바뀌지 않습니다.
