# YesikNote Ceremony Projection Contract v0.1 DRAFT

> 상태: `DRAFT` · `PROPOSED`
>
> 목적: 구현 전 변환 규칙 검토
>
> 금지: 이 문서를 데이터 타입·화면·Script Engine·저장소 구현 완료 근거로 사용하지 않음
>
> W2.5 로컬 QA 상태: `buildCeremonyProjection` 순수 함수와 Owner 최종 확인 단계의 읽기 전용 `VenueChecklistPreview`가 `IMPLEMENTED`되었고 자동 테스트·build·로컬 Owner 화면 QA로 `VERIFIED`했다. 아직 Commit·배포·Product Owner 확정 전이다.

## 1. 문서 목적

하나의 예식 기준 데이터가 역할별 결과물에서 어떻게 다르게 보일지 정하는 변환 약속 초안이다.

```text
Owner 입력
→ Ceremony Data
→ 개별 예식 최종 식순표
→ MC 대본 / Cue / Note

각 예식의 Ceremony Data 요약
→ 날짜·시간별 주말 통합 운영 체크리스트
```

개별 식순표, MC 대본, Cue·Note, 통합 운영표를 수동 복사본으로 따로 관리하지 않는다. 문구와 정보량은 달라도 같은 안정 ID와 같은 원천 값을 사용해야 한다.

## 2. 이 문서가 해결하려는 문제

- Owner가 진행자나 순서를 바꿨는데 예식장 표와 MC 대본이 서로 달라지는 문제
- 여러 예식의 준비 상태를 사람이 다시 복사하면서 최신 정보가 누락되는 문제
- 현재 코드에 있는 데이터와 앞으로 필요한 필드를 혼동하는 문제
- 직접 수정 대본이 기준 데이터 변경 뒤 오래된 이름·호칭을 유지하는 문제
- Draft와 “최종 확정본”의 차이가 정의되지 않은 문제

이 문서는 변환 규칙 초안만 제공한다. 새 데이터 타입, 변환 함수, 화면, Snapshot, 서버 저장을 구현하지 않는다.

## 3. 기준 데이터 원칙

### 3.1 근거 표기

| 표기 | 의미 |
|---|---|
| `[CODE]` | 현재 저장소 코드에서 필드 또는 동작을 확인 |
| `[PAGES]` | 개별 예식 `.pages` 샘플에서 직접 확인 |
| `[NUMBERS-PARTIAL]` | 주말 `.numbers` 미리보기에서 구조를 확인했지만 전체 셀은 판독하지 못함 |
| `[PO]` | 이번 Product Owner 지침에서 요구 |
| `[PROPOSED]` | 구현되지 않은 필드·문구·변환 제안 |
| `UNKNOWN` | 현재 근거로 값을 결정할 수 없음 |
| `MISSING EVIDENCE` | 확인에 필요한 원본 또는 구현 근거가 없음 |

실제 첨부된 주말 자료는 `.numbers`다. 별도 PDF는 제공되지 않아 PDF 전체 페이지와 인쇄 결과는 `MISSING EVIDENCE`다. 원본 이름·날짜·예식장명·연락처·예시 메모는 이 문서에 기록하지 않는다.

### 3.2 Source of Truth

현재 MVP에서 확인된 기준 객체는 `[CODE] CeremonyDraft`다. 다만 이것은 계속 편집되는 브라우저 Draft이며 Final Snapshot이 아니다.

추천 원칙:

1. 현재 필드는 `CeremonyDraft`의 실제 값을 우선한다.
2. 식순은 `CeremonyItem.id`, `order`, `active`를 기준으로 투영한다.
3. `active=false`는 삭제가 아니며 원본 입력을 보존하고 실행 출력에서 제외한다.
4. 공연은 `PerformanceItem.id`와 `order`를 유지한다.
5. 역할별 출력은 같은 데이터를 읽는 순수한 Projection이어야 한다.
6. 새 값이 필요하면 기존 임의 필드에 끼워 넣지 않고 `[PROPOSED]`로 기록한다.
7. Final Snapshot은 도입 시점·확정 해제·재확정 규칙 결정 전 구현하지 않는다.

### 3.3 현재 코드에서 확인된 핵심 필드

- `CeremonyDraft`: `id`, `basicInfo`, `ceremonyType`, `items`, `updatedAt`
- `CeremonyItem`: `id`, `type`, `title`, `order`, `active`, `participants`, `detailConfig`
- 대본·운영 메모: `customIntro`, `narrationOverride`, `cueOverride`, `requestNote`
- `PerformanceItem`: `id`, `type`, `performerName`, `performerRelation`, `title`, `order`, `requestNote`
- `ScriptSection`: `title`, `narration`, `cue`, `note`, `orderPath`

## 4. 역할별 출력물 정의

| 출력물 | 목적 | 포함할 정보 | 포함하지 않을 정보 | 현재 구현 |
|---|---|---|---|---|
| Owner 작성 화면 | 원천 정보 입력·수정 | 기본정보, 식순, 진행 여부, 사람, 공연, 대본, Note | 역할별 최종 권한 | 있음 |
| 개별 예식 최종 식순표 | 한 예식의 당일 공동 미팅·실행 | 최종 순서, 진행 주체, 공연, 핵심 Cue·Note | 여러 예식 전체 현황 | 로컬 읽기 전용 Preview 일부 `IMPLEMENTED`, Final Snapshot·인쇄 완성본 아님 |
| 예식장 체크표 표시 | 개별 식순에서 현장 담당자가 빠르게 확인 | 진행자, 동선, 준비물, 음원 Cue | MC가 읽을 전체 대본 | Owner 5단계 최종 확인의 `VenueChecklistPreview`로 `IMPLEMENTED`·`VERIFIED` |
| MC 대본 | 사회자가 실제 낭독 | 소개, 낭독 본문, 현재·다음 순서 | 전체 운영 현황 | `/mc`에 있음 |
| Cue | 실행 시점·행동 | 입장, 마이크, 음원, 이동 신호 | 긴 설명 | Script Engine 결과에 있음 |
| Note | 낭독하지 않는 주의·요청 | 위치, 준비, 예외, 요청 | 자동 낭독 문장 | Script Engine 결과에 있음 |
| 주말 통합 운영표 | 여러 예식의 준비 상태 확인 | 날짜·시간, 예식 형태, 자료 상태, 음원 구간, 비고 | 개별 대본 원문 전체 | 없음 |

`개별 예식 최종 식순표`와 `예식장 체크표 표시`는 별도 원본이 아니다. 전자는 공동 기준표 전체, 후자는 그 안에서 예식장 역할이 빠르게 읽을 요약 표현으로 정의한다.

## 5. Projection 기본 규칙

1. **정렬:** `order ASC`, 같은 순서 충돌 시 안정 ID로만 결정하는 방안은 `PROPOSED`.
2. **활성 상태:** `active=false` 항목과 Child는 실행 식순·대본·Cue·Note에서 제외하되 저장값은 보존한다.
3. **표시 제목:** 원본 `title`과 역할별 표시 제목을 구분한다. 화면용 제목이 저장 title을 덮어쓰면 안 된다.
4. **사람 표시:** `displayTitle → name → relation/role` 우선순위는 Product Owner 결정 전 `PROPOSED`.
5. **대본:** 현재 `generateScript(draft)`의 `ScriptPackage`를 Owner와 MC가 공유한다.
6. **직접 수정:** `narrationOverride`는 현재 자동 본문보다 우선한다. 인물·순서 변경 뒤 오래된 문구가 남는지 경고 계약이 필요하다.
7. **Cue:** `cueOverride`가 있으면 현재 자동 Cue를 대체한다.
8. **Note:** `requestNote`는 자동 Note에 추가된다. 역할별 공개 범위는 아직 없다.
9. **빈 값:** 근거가 없는 사람·호칭·곡명은 추정 문구로 채우지 않는다.
10. **통합표:** 개별 대본 전체를 복사하지 않고 운영 상태만 요약한다.

단계 열에서 `현재 MVP`는 원천 필드나 현재 Script Engine 동작이 존재한다는 뜻이다. 새 체크표·통합표 화면이 구현됐다는 뜻이 아니다.

## 6. Owner 입력 → 예식장 체크표 변환 규칙

아래 출력 문구는 `[PROPOSED]`다. `.pages` 샘플에서 직접 확인한 것은 식순명, 3개 열, 축가 `1곡`뿐이다.

| Owner 입력 | 기준 데이터 필드 후보 | 개별 최종 식순표 표시 | 예식장 체크표 표시 | MC 대본 영향 | Cue | Note | 단계 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 예식 형태 | `[CODE] ceremonyType` | 예식 형태 표시 | 유형별 확인 항목 분기 | Canonical·기본 대본 분기 | 주례 등단 등 분기 | 특이 유형 표시 | 현재 MVP | 종교식·custom 기본 대본 없음 |
| 주례 유무 | `[CODE] ceremonyType`에서 파생 | 주례 있음/없음 | 주례 소개·주례사 확인 | 13/15 Canonical 분기 | 주례 등단 Cue | 주례 정보 Note | 현재 MVP | 별도 boolean 없음 |
| 화촉점화 방식 | `[CODE] candle_lighting.detailConfig.mode`, `children` | 화촉점화 방식·Child 순서 | 입장·점화·착석 순서 | Child 대본 | Child별 Cue | 사용자 요청 | 현재 MVP | A8/B7 계약 유지 |
| 혼주 참석 여부 | `[CODE] family_guest_greeting.detailConfig.groomFamilyAttendance/brideFamilyAttendance`; 화촉은 mode로 일부 표현 | 참석 상태 요약 | 참석·대체 진행 확인 | 인사 문장 변화 | 이동·인사 Cue | 불참·대체 Note | 현재 MVP 일부 | 화촉 참석과 인사 참석이 같은 뜻인지 `UNKNOWN` |
| 혼주 호칭 | `[CODE] customHostTitle`, `PersonRef.displayTitle`, 가족 호칭 필드 일부 | 역할·표시 호칭 | 현장 호칭 | 소개·안내 문장 | 호명 Cue 가능 | 위치·호칭 확인 | 현재 MVP 일부 | UI에서 모든 호칭 필드를 입력할 수 있는지 부분 확인 |
| 신랑 입장 방식 | `[CODE] groom_entrance.detailConfig.mode/escortEndPoint` | 단독/동행·종료 지점 | 입장 동선 | 입장 문장 | 입장 Cue | 종료 지점 | 현재 MVP | 입장곡 없음 |
| 신부 입장 방식 | `[CODE] bride_entrance.detailConfig.appearance/escort/handoffPoint` | 등장·단독/동반·인계 지점 | 입장 동선 | 입장 문장 | 등장·인계 Cue | 동선 확인 | 현재 MVP | custom 동반자 구조 부족 |
| 신부 동반자 | `[CODE] escort` 일부, `[PROPOSED] brideEscort: PersonRef` | 동반자 관계·호칭 | 동반자 대기·인계 | 동반자 포함 문장 | 동반자 입장 Cue | 위치 확인 | 파일럿 전 최소 기능 | 현재 `father/solo/custom` 값만으로 임의 인물 표현 불가 |
| 혼인서약 진행 여부 | `[CODE] vows.active` | 진행/미진행 | 서약서 준비 여부와 분리 표시 | false면 제외 | 서약 시작 Cue | 원고 준비 Note | 현재 MVP | `active=false`와 자료 생략 상태 혼동 금지 |
| 혼인서약 낭독 주체 | `[CODE] vows.detailConfig.mode` (`together/mc`), `[PROPOSED] vowsSpeaker` | 함께 낭독/사회자 진행 | 낭독자·원고 전달 | 서약 본문·결합 규칙 | 마이크·원고 Cue | 낭독자 위치 | 현재 MVP 일부 | 기타 낭독자 구조 없음 |
| 성혼선언 진행 여부 | `[CODE] pronouncement.active` | 진행/미진행 | 선언문 준비 상태와 분리 | false면 제외 | 선언 시작 Cue | 원고 Note | 현재 MVP | 자료 상태 별도 필요 |
| 성혼선언 주체 | `[CODE] speakerMode`, `participants` | 진행자·관계·호칭 | 선언자·마이크 준비 | 소개·선언 문장 | 선언자 마이크 | 위치 확인 | 현재 MVP | 표시 호칭 우선순위 결정 필요 |
| 덕담 진행 여부 | `[CODE] speech.active + speechType=words` | 덕담 행 | 덕담자·원고 상태 | 덕담 소개·본문 | 마이크 Cue | 원고·위치 | 현재 MVP 일부 | 축사와 동시 진행 구조 없음 |
| 덕담 주체 | `[CODE] speech.participants` | 이름/호칭·관계 | 덕담자 확인 | 소개 문장 | 마이크 | 위치·요청 | 현재 MVP | 개인정보 표시 범위 필요 |
| 축사 진행 여부 | `[CODE] speech.active + speechType=congratulatory` | 축사 행 | 축사자·원고 상태 | 축사 소개·본문 | 마이크 Cue | 원고·위치 | 현재 MVP 일부 | 덕담과 동시 진행 구조 없음 |
| 축사 주체 | `[CODE] speech.participants` | 이름/호칭·관계 | 축사자 확인 | 소개 문장 | 마이크 | 위치·요청 | 현재 MVP | 여러 축사자 계약 없음 |
| 축가/축무 진행 여부 | `[CODE] performance.active`, `performances[].type` | 유형·무대 순서 | 공연 준비 | 공연 소개 | 무대·음원 Cue | 공연 요청 | 현재 MVP | 자료 준비 상태 없음 |
| 축가 곡 수 | `[CODE] performances.length`은 카드 수, `[PROPOSED] songCount` | `축가 N곡` | 곡 수 확인 | 소개 횟수·문구 | 곡별 재생 Cue | 연속 공연 Note | 파일럿 전 최소 기능 | 카드 1개=1곡인지 `UNKNOWN` |
| 축가 곡명 | `[CODE] performances[].title` | 곡명 | 음원 목록 | 공연 소개 | 곡 시작 Cue 후보 | MR 구분 | 현재 MVP | 음원 파일 연결 없음 |
| 축가자 | `[CODE] performerName/performerRelation` | 공연자·관계 | 공연자 대기 확인 | 소개 문장 | 무대 이동 Cue | 위치·요청 | 현재 MVP | 실명 최소 노출 정책 필요 |
| 예물교환 진행 여부 | `[CODE] ring_exchange.active` | 진행/미진행 | 반지·화동 준비 | 교환 문장 | 반지 전달 Cue | 전달 대상·동선 | 현재 MVP | `.pages` 샘플 행 없음 |
| 양가 부모님과 내빈께 인사 | `[CODE] family_guest_greeting.active`, attendance, omit hug | 대상·참석·포옹 생략 | 이동·인사 순서 | 인사 문장 | 이동·인사 Cue | 예외 Note | 현재 MVP | custom 호칭 입력 범위 부분 확인 |
| 행진 방식 | `[CODE] recessional.active`, `[PROPOSED] recessionalMode` | 행진·방식 | 동선·음원 | 행진 문장 | 행진·음원 Cue | 출발 위치 | 파일럿 전 최소 기능 | 현재 전용 방식 필드 없음 |
| 폐회식 | `[CODE] closing.active` | 진행/미진행 | 종료 확인 | 폐회 문장 | 종료 Cue | 후속 안내 | 현재 MVP | `.pages` 샘플 행 없음 |
| 음원 재생 타이밍 | `[CODE] cueOverride/ScriptSection.cue` 일부, `[PROPOSED] audioCues[]` | 식순별 음원 구간 | 음원 시작·종료 시점 | 필요 시 대본과 정렬 | 구조화된 재생 Cue | 파일·MR 주의 | 파일럿 전 최소 기능 | 현재 Cue 문자열만으로 운영 상태 보장 어려움 |
| 비고 | `[CODE] requestNote/globalRequestNote`, `[PROPOSED] operationsNote` | 공동 확인 Note | 현장 비고 | 낭독하지 않음 | 필요 시 영향 | 역할별 Note | 파일럿 전 최소 기능 | 현재 Note 공개 범위 없음 |
| 식순체크표 준비 상태 | `[PROPOSED] checklistStatus` | 확정 상태 | 확인 상태 | 직접 영향 없음 | 직접 영향 없음 | 미확정 경고 | 파일럿 전 최소 기능 | 현재 필드 없음 |
| 혼인서약서 준비 상태 | `[PROPOSED] vowsMaterialStatus` | 자료 상태 | 확인 전/필요/완료 등 | 원고 사용 가능성 | 원고 전달 Cue | 미제출·당일 지참 | 파일럿 전 최소 기능 | 현재 전용 필드 없음 |
| 성혼선언문 준비 상태 | `[CODE] manuscriptStatus` 타입 일부, `[PROPOSED] pronouncementMaterialStatus` | 자료 상태 | 선언문 상태 | 원고 사용 가능성 | 원고 전달 Cue | 미제출·당일 지참 | 파일럿 전 최소 기능 | 현재 UI·항목별 계약 부족 |
| 축사 준비 상태 | `[CODE] manuscriptStatus` 타입 일부, `[PROPOSED] speechMaterialStatus` | 자료 상태 | 축사 원고 상태 | 원고 사용 가능성 | 원고 전달 Cue | 미제출·당일 지참 | 파일럿 전 최소 기능 | 단일 speech 구조와 충돌 |
| 덕담 준비 상태 | `[CODE] manuscriptStatus` 타입 일부, `[PROPOSED] wordsMaterialStatus` | 자료 상태 | 덕담 원고 상태 | 원고 사용 가능성 | 원고 전달 Cue | 미제출·당일 지참 | 파일럿 전 최소 기능 | 단일 speech 구조와 충돌 |

## 7. Owner 입력 → 사회자 대본 변환 규칙

현재 코드의 `[CODE] generateScript(draft)`를 새 체크표 Projection이 대체하면 안 된다.

1. `active=true`인 항목만 대본 섹션을 만든다.
2. 식순 순서는 `order`를 따른다.
3. 소개 문장 설정과 본문은 분리한다.
4. `narrationOverride`가 있으면 현재 기본 본문보다 우선한다.
5. 혼인서약 `mode=mc`와 성혼선언 `speakerMode=mc`가 모두 활성화되면 현재 엔진은 두 섹션을 결합한다.
6. 공연은 `PerformanceItem` 순서와 유형·공연자·관계·제목을 사용한다.
7. Projection Contract는 승인된 대본 원문을 새로 만들거나 의역하지 않는다.
8. 사람 정보 변경 뒤 `narrationOverride`가 오래된 값을 포함하면 자동 덮어쓰기보다 충돌 경고가 우선이다.

예시 문장은 형식 설명일 뿐 승인 대본이 아니다.

```text
Owner 값: 성혼선언 진행자 = [표시 호칭]
체크표: 성혼선언 — 진행자 [표시 호칭]
MC 대본: 기존 Script Engine의 승인 규칙으로 생성
```

## 8. Owner 입력 → Cue 변환 규칙

- 자동 Cue의 현재 근거는 Script Engine의 `baseCue`, 입장 전용 Cue, 화촉 Child Cue다.
- `cueOverride`가 있으면 현재 자동 Cue를 대체한다.
- 체크표에서는 긴 Cue 배열을 현장 행동 단위로 짧게 표시한다.
- 음원 Cue는 향후 `audioCues[]` 같은 구조화 필드가 승인되기 전까지 일반 Cue와 구별이 어렵다.
- 통합표에는 모든 Cue가 아니라 “음원 재생이 필요한 구간”만 요약한다.
- Cue 문구를 보고 사람·음원 파일·시점을 역추론하지 않는다.

## 9. Owner 입력 → Note 변환 규칙

- 현재 자동 Note와 `requestNote`는 `ScriptSection.note`에 합쳐진다.
- `globalRequestNote`는 예식 전체 요청이다.
- 개별 최종 식순표에는 공동 확인이 필요한 Note만 표시하는 것이 `PROPOSED`다.
- 예식장 내부 Note, MC 전용 Note, Owner 개인정보 Note는 현재 구분되지 않는다.
- 통합표 비고에는 해결되지 않은 운영 Note만 요약하고 대본 원문이나 불필요한 개인정보를 복사하지 않는다.
- 역할별 Note 공개·수정 권한은 Product Owner 결정과 서버 권한 계약이 필요하다.

## 10. 개별 예식 최종 식순표 → 주말 통합 체크리스트 요약 규칙

통합표는 개별 식순표 파일을 읽어 복사하는 구조가 아니다. 같은 Ceremony Data에서 개별 표와 운영 요약을 각각 계산한다.

### 10.1 최소 요약 필드 후보

| 통합표 열 | 원천 | 요약 규칙 | 현재 상태 |
|---|---|---|---|
| 날짜 | `[CODE] basicInfo.weddingDate` | 날짜 오름차순 | 원천 있음 |
| 시간 | `[PROPOSED] startTime` | 시간 오름차순 | 없음 |
| 운영용 예식 식별 | `[CODE] draft.id` 후보 + `[PROPOSED] operationalLabel` | 실명 최소화, 안정 ID 사용 | 계약 없음 |
| 홀 | `[CODE] venueName/hallName` | 필요한 범위만 표시 | 원천 있음 |
| 예식 형태 | `[CODE] ceremonyType` | 사용자 표시명으로 변환 | 원천 있음 |
| 식순체크표 | `[PROPOSED] checklistStatus` | 상태값 표시 | 없음 |
| 혼인서약서 | `[PROPOSED] vowsMaterialStatus` | 상태값 표시 | 없음 |
| 성혼선언문 | `[PROPOSED] pronouncementMaterialStatus` | 상태값 표시 | 없음 |
| 축사 | `[PROPOSED] speechMaterialStatus` | 상태값 표시 | 없음 |
| 덕담 | `[PROPOSED] wordsMaterialStatus` | 상태값 표시 | 없음 |
| 음원 구간 | `[PROPOSED] audioCues[]` | 재생 식순·시점만 요약 | 없음 |
| 비고 | `[PROPOSED] operationsNote` | 해결 필요 운영 Note만 표시 | 없음 |
| 마지막 수정 | `[CODE] updatedAt` | 표시용 시각 변환 | 원천 있음 |
| 개별 표 이동 | `[PROPOSED] checklistRef/route` | 안정 예식 ID로 연결 | 없음 |

### 10.2 상태 후보

`확인 전`, `확인 필요`, `확인 완료`, `당일 지참`, `생략`, `미제출`은 `[PO]` 후보다. 코드 enum과 상태 전이는 아직 없다.

- `active=false`: 식순 미진행
- `생략`: 해당 자료 또는 준비물이 필요 없음

두 상태를 같은 값으로 합치지 않는다.

### 10.3 정렬과 갱신

- 기본 정렬 후보: `weddingDate ASC → startTime ASC → weddingId ASC`
- Owner 값이 바뀌면 같은 저장소의 운영 요약을 다시 계산한다.
- localStorage 단일 key 구조에서는 여러 예식 목록을 만들 수 없다.
- 서버가 없으면 다른 기기·브라우저의 자동 갱신과 최신본을 보장할 수 없다.

## 11. Rule Engine 우선순위

낮은 번호가 높은 우선순위다.

1. Product Owner가 승인한 고정 데이터 계약
2. 안정 ID, `order`, `active`와 Owner의 명시적 입력값
3. 보존해야 하는 사용자 직접 입력값
4. 현재 Script Engine의 승인된 생성 규칙
5. 역할별 Projection 표시 규칙
6. 누락값 처리와 경고

예외:

- `narrationOverride`는 대본 본문에서 자동 대본보다 우선하지만 기준 인물·순서 데이터를 바꾸지는 않는다.
- `cueOverride`는 해당 섹션의 자동 Cue를 대체한다.
- `active=false`는 값을 삭제하지 않고 실행 출력에서만 제외한다.
- Projection은 원천 데이터를 수정하지 않는다.
- 일반적인 한국 예식 관행을 근거 없이 기본값으로 추가하지 않는다.

## 12. MVP / 파일럿 전 / 파일럿 이후 구분

| 단계 | 포함 | 제외·주의 |
|---|---|---|
| 현재 MVP | 단일 `CeremonyDraft`, Canonical 13/15, A8/B7, 공연 카드, Script Engine, Cue·Note, 단일 localStorage Draft, `/mc` | 개별 최종 표·통합표·Snapshot·역할 권한 없음 |
| W2.4 로컬 `IMPLEMENTED` | `buildCeremonyProjection`, `VenueChecklistPreview`, Owner 최종 확인 연결, 관련 자동 테스트 | 저장·Final Snapshot·통합 운영표·MC 화면에는 연결하지 않음 |
| 파일럿 전 최소 기능 후보 | 개별 체크표 Projection, 필요한 자료 상태·음원 필드, 여러 예식 저장·정렬, 통합표 구현 시 운영 요약 | schema·migration·rollback과 Product Owner 승인 필요 |
| 파일럿 검증 | 최신본 갱신, 역할별 보기, 개인정보, 인쇄, 변경 후 재확인, 현장 사용성 | 구현되지 않은 기능을 완료로 표시하지 않음 |
| 파일럿 후 CRM | 예식장 CRM, 계약·결제 | Projection Contract 범위 밖 |
| 장기 Wedding Data OS | 파트너·상품 판매, 분석·확장 플랫폼 | Projection Contract 범위 밖 |

Final Snapshot은 중요한 후보지만 이 문서에서 즉시 구현을 확정하지 않는다. Change History도 이번 Batch 구현 대상이 아니며 이후 별도 후보로 둔다.

### 12.1 W2.5 검증 근거

- Projection: `src/features/wedding-builder/services/ceremonyProjection.ts`
- 읽기 전용 Preview: `src/features/wedding-builder/components/VenueChecklistPreview.tsx`
- 연결 위치: `src/features/wedding-builder/pages/OwnerBuilderPage.tsx`의 5단계 최종 확인
- `VERIFIED`: 기본 표시, 성혼선언 주체, 축가 2곡과 카드 순서, `active=false` 보존·경고, 누락값 `확인 필요`, 입력 불변성, localStorage 미호출
- 실제 화면: 로컬 Owner 화면과 Preview 표시, 읽기 전용 배지, 확인 필요 영역, 기존 최종 대본 공존, 브라우저 콘솔 오류 없음
- 반응형: Preview 전용 CSS가 `700px` 이하 한 열 layout을 정의한다. 브라우저 도구의 viewport 변경 미지원으로 실제 모바일 캡처는 `MISSING EVIDENCE`
- 자동 검증: 테스트 6개 파일·145개 통과, TypeScript·Vite build 통과
- `NOT CHANGED`: Draft key/schema, localStorage 모듈, Script Engine 핵심 로직, MC 화면

## 13. 구현 전 Product Owner 결정 필요사항

1. 개별 샘플 12개 행과 Canonical 13/15를 체크표에서 어떻게 보여 줄지
2. `active=false` 항목을 최종 표에서 숨길지 “미진행”으로 남길지
3. 덕담과 축사를 동시에 여러 건 허용할지
4. 공연 카드 하나의 의미가 한 곡인지 한 무대인지
5. 신부 custom 동반자와 혼주 사용자 호칭의 정식 데이터 구조
6. 자료 준비 상태 enum과 상태 전이
7. 음원 Cue의 시작·종료·담당자·파일 참조 범위
8. 직접 수정 대본과 변경된 인물 정보가 충돌할 때의 경고·확정 방식
9. 개별 최종 식순표의 확정·해제·재확정 권한
10. 예식장·예도·MC의 보기·Note 작성 권한
11. 주말 통합 운영표 구현 시점과 local-only 임시안 허용 여부
12. Final Snapshot 도입 시점
13. 개인정보 마스킹·보관·삭제 기준

## 14. 다음 구현 Batch 제안

다음 단계는 W2/W2.1/W2.2/W2.4 문서와 코드를 함께 검토하고 Commit·Push 준비 여부를 별도로 결정하는 것을 추천한다.

검토 범위:

1. 현재 로컬 구현 8개 파일의 승인 범위·테스트·보안 최종 Diff 검수
2. 공연 카드 계산, `active=false` 표시, 종교식/custom 범위에 Product Owner 결정 기록
3. 자료 준비 상태와 음원 타이밍에 필요한 정식 필드는 schema 변경 Batch로 분리
4. Final Snapshot·여러 예식·통합 운영표는 저장·권한 계약 승인 전 구현하지 않음

검토가 끝나기 전 개별 화면이나 통합 화면부터 구현하지 않는다.

## 15. 개발자 전달용 한 페이지 요약

YesikNote는 같은 내용을 여러 문서에 복사하는 프로그램이 아니다.

```text
신랑·신부가 한 번 입력
        ↓
CeremonyDraft — 현재 한 예식의 기준 데이터
        ├→ 개별 최종 식순표 — 모두가 당일 확인
        ├→ MC 대본 — 사회자가 읽음
        ├→ Cue / Note — 현장 행동과 주의사항
        └→ 운영 요약 — 여러 예식 통합표의 한 행
```

현재 기준 브랜치 코드는 한 예식의 Draft와 MC 대본·Cue·Note까지 제공한다. W2.4 로컬 변경은 같은 Draft에서 체크표 Projection을 만들고 Owner 최종 확인에 읽기 전용 Preview로 표시한다. 자료 상태와 음원 타이밍은 전용 데이터가 없어 `확인 필요`로 표시한다. 여러 예식 저장, 주말 통합표, 확정본, 역할 권한은 아직 없다.

Projection 함수와 Preview는 원본 Draft를 바꾸지 않고 같은 안정 ID·순서·활성 상태를 읽는다. Draft/localStorage와 기존 Script Engine 파일은 변경하지 않았다. 다음에는 자료 상태·음원 타이밍·Final Snapshot처럼 새 데이터가 필요한 범위를 Product Owner가 먼저 결정해야 하며, 직접 수정 대본과 충돌 가능한 값은 자동으로 덮어쓰지 않는다.

이 문서는 구현 완료 문서가 아니라 Product Owner와 개발자가 함께 검토할 변환 계약 초안이다.

## 16. W3 소비 화면 구현 상태

`CeremonyDraft → CeremonyProjection → FinalCeremonySheet` 소비 경로가 `IMPLEMENTED`되었다.

- Projection은 기존 순수 함수이며 Draft를 수정하지 않는다.
- 최종 식순표는 활성 항목을 실제 `order`로 정렬하고 안정 ID를 DOM source 기준으로 유지한다.
- Cue와 Note는 `ScriptPackage`에서 읽되 서로 다른 열에 표시한다.
- `sourceWarnings`는 공동 확인 필요사항으로 표시하며 내부 source ID는 사용자 화면에서 제거한다.
- 공연은 Projection의 카드 순서를 사용하되, 정책 미확정 때문에 최종 표에서 카드 수를 곡 수로 확정하지 않는다.
- `active=false`는 기본 실행 표에서 제외하고 별도 미진행 목록에 표시한다.
- A4 인쇄는 현재 화면의 Projection 결과를 인쇄할 뿐 Snapshot을 생성하지 않는다.

자동 검증은 7개 테스트 파일·152개 테스트, build, typecheck, `git diff --check`를 통과했다. Draft/localStorage key·schema, Script Engine 핵심 파일, MC 화면은 `NOT CHANGED`다. 이 구현으로 Final Snapshot이나 주말 통합 운영표가 완성된 것은 아니다.
