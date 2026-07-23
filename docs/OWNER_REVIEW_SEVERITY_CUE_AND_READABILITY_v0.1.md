# YesikNote Owner 확인 심각도·Cue·가독성 기준 v0.1

상태: **PROPOSED · IMPLEMENTED LOCALLY · VERIFIED BY TEST**

## 1. 문서 목적

Owner 최종 확인에서 사용자가 직접 고칠 항목, 예식장에서 확인할 항목, 내부 정책을 섞지 않는다. 같은 Ceremony Data와 Script 결과를 사용하되 Owner·예식장·사회자에게 필요한 정보만 우선 표시한다.

## 2. 확인 항목 분류

| 분류 | 의미 | Owner 표시 | 연속 확인 |
|---|---|---|---|
| USER_ACTION | 신랑·신부가 현재 입력 화면에서 수정할 수 있음 | 빨간 `수정 필요` | 포함 |
| FIELD_CONFIRMATION | 예식장·현장에서 함께 확인 | 파란 `현장 확인` | 제외 |
| POLICY_INTERNAL | Product Owner·개발팀의 내부 정책 | 표시하지 않음 | 제외 |

blocking Validation만 USER_ACTION으로 본다. Projection의 현장 자료·음원 타이밍은 FIELD_CONFIRMATION으로 본다. 미진행 표시 방식, Final Snapshot, 데이터 구조 설명은 POLICY_INTERNAL로 Owner 개수에 포함하지 않는다.

## 3. 빨간 경고 사용 기준

- USER_ACTION이 있을 때만 빨간 요약과 `바로 수정`을 표시한다.
- USER_ACTION이 0이면 큰 빨간 경고 영역을 렌더링하지 않는다.
- FIELD_CONFIRMATION은 파란색 또는 중립색으로 표시한다.
- 정상 축가, 미진행 예물교환, 내부 정책은 빨간 경고가 아니다.

## 4. 축가 1곡 정책

Product Owner 확정 정책에 따라 완료된 `song` 공연 카드 1개는 축가 1곡이다.

- 카드 1개: `축가 1곡`
- 카드 2개: `축가 2곡`
- 축무·축주: `공연 N건` 표현 가능
- 공연자 또는 곡명이 비어 있을 때만 USER_ACTION 생성

저장 schema에 곡 수 필드를 추가하지 않는다. 표시 단계에서 기존 공연 카드 수를 사용한다.

## 5. 예물교환 미진행

`ring_exchange.active=false`이면 다음과 같이 처리한다.

- Owner 목록: 회색 `미진행`
- MC 대본: 제외
- Cue·Note: 기본 숨김
- 전체 표: `미진행` 한 줄
- 기존 입력값: Draft에 그대로 보존
- 다시 활성화: 기존 입력값 복원

## 6. Cue 표시 원칙

Cue는 “지금 해야 할 행동 또는 기술 신호”, Note는 “참고할 주의사항”이다.

- Owner 기본 목록: Cue·Note 원문 대신 `현장 메모 N개`
- Owner 상세: Cue와 Note 분리
- 예식장 전체 표: 기본 Cue 핵심 1~2개
- MC: Script Engine의 현재 Cue·Note 원문 유지
- 사용자가 입력한 `cueOverride`: 축약하지 않음

기본 표시 예:

- 신랑 입장: `입장곡 준비`, `입장곡 시작 → 신랑 입장`
- 신부 입장: `신부·동반자 대기`, `입장곡 시작 → 신부 입장`
- 행진: `행진곡 준비`, `행진곡 시작 → 신랑·신부 출발`
- 화촉점화: `양가 어머님 입장`, `점화 → 맞절 → 내빈 인사 → 착석`

## 7. 역할별 Cue 노출 수준

| 역할 | 우선 정보 |
|---|---|
| Owner | 식순명, 수정 필요, 현장 확인, 짧은 진행 요약 |
| 예식장 | 전체 순서, 핵심 Cue, Note, 준비·확인 상태 |
| 사회자 | 현재 대본, 현재 Cue, 다음 식순, 긴급·특이사항 |

## 8. 식순명 타이포그래피

- Owner 목록: 데스크톱 20px/700, 모바일 18px
- 전체 표 화면: 18px/750
- 진행 정보: 13~16px
- Cue·Note: 화면 13px
- 상태 배지: 10px, 식순명보다 낮은 시각 강도
- 주요 행동: 최소 높이 44px

## 9. 전체 표·인쇄

- 화면의 식순 열은 일반 본문보다 크고 굵다.
- 진행 정보는 `white-space: pre-line`으로 줄바꿈을 보존한다.
- 기본 Cue는 표시 전용 함수에서 1~2개로 요약한다.
- A4 식순명은 11pt/700, Cue·Note는 9pt다.
- 표 행에 `break-inside: avoid`와 `page-break-inside: avoid`를 적용한다.

## 10. 연속 확인 흐름

`한 번에 확인하기`는 USER_ACTION의 ID 순서를 React 세션 상태로만 관리한다.

1. 첫 오류의 step·ceremony stableId·performance stableId·fieldKey로 이동
2. 카드 펼침, 강조, 입력칸 focus
3. 해결 후 `다음 확인 항목`
4. 마지막 항목 뒤 `확인 완료 후 돌아가기`
5. 언제든 `최종 확인으로 나가기`

새 localStorage key를 만들지 않는다.

## 11. 테스트·화면 QA

### VERIFIED

- 12개 테스트 파일, 176개 테스트 통과
- TypeScript `--noEmit` 통과
- 축가 1곡, 예물교환 미진행, 분류, 연속 이동, stable ID, Cue 원본 보존 테스트
- 데스크톱 1280×720 실제 화면
- 모바일 390×844 실제 반응형 화면
- 가로 넘침 없음
- Owner 식순명 20px, 전체 표 식순명 18px, 행동 높이 44px
- Console error 없음

### VERIFIED BY CODE/TEST

- A4 식순명 11pt/700
- Cue·Note 9pt
- 행 페이지 잘림 방지
- `window.print()` 호출과 `인쇄 준비 완료` 알림

## 12. 안전성

- Draft key `yesiknote:owner-builder:draft:v1`: NOT CHANGED
- Draft schema `2`: NOT CHANGED
- localStorage 저장 구조: NOT CHANGED
- Script Engine 핵심 로직: NOT CHANGED
- 직접 수정 대본: 보존
- 사용자 입력 Cue: 보존
- Projection: 원본 Draft를 mutate하지 않음

## 13. 미구현 범위

- Final Snapshot·확정 잠금
- 확정 후 Change History
- 여러 예식 주말 통합 체크리스트
- 서버 저장·인증·권한
- 축무·기타 공연의 별도 곡 수 필드
- 종교식·custom 세부 정책
