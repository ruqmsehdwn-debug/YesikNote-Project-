# YesikNote 제품 요구사항

상태: WORKING · 현재 배포 코드 기준

## 1. 서비스 개요

YesikNote는 신랑·신부가 식순과 필요한 정보를 작성하면 사회자가 실제로 사용할 대본, 진행 큐, 주의사항을 같은 데이터에서 생성하는 예식 준비 도구입니다.

## 2. 문제 정의

- 예식 정보와 대본이 여러 문서에 흩어져 변경사항이 누락됩니다.
- 신랑·신부는 현장 용어와 데이터 구조를 알지 못해도 자연스러운 대본을 만들 수 있어야 합니다.
- 사회자는 최신 순서와 요청사항을 편집 없이 읽을 수 있어야 합니다.
- 미진행 항목, 직접 수정 대본, 공연 정보가 화면마다 다르게 보이면 현장 사고로 이어질 수 있습니다.

## 3. 목표와 핵심 가치

1. 짧은 입력만으로 실제 낭독 가능한 대본을 만듭니다.
2. Owner·최종 확인·MC가 하나의 실제 순서를 사용합니다.
3. 사용자의 입력과 선택을 비파괴적으로 보존합니다.
4. 오류가 있으면 정확한 식순·공연 카드·입력칸으로 안내합니다.

포지셔닝은 자유 생성형 AI 대본 작성기가 아니라, 승인된 문장과 입력 조건을 조합하는 규칙 기반 예식 대본 Builder입니다.

## 4. 사용자 역할

### Owner

신랑·신부 또는 예식 준비 담당자입니다. 예식 정보, 식순, 진행자, 공연, 소개 문장, 대본을 편집합니다.

### MC

Owner Draft에서 생성된 대본을 읽고 이전·완료·다음 상태를 관리합니다. 편집 권한은 없습니다.

### 미구현 역할

Client Review, VenueAdmin, Guest는 제품 개념 후보이며 현재 권한 시스템과 화면은 구현하지 않았습니다.

## 5. MVP 사용자 흐름

1. 예식 기본정보 입력
2. 예식 유형 선택
3. 전체 식순 정렬·진행 여부 결정
4. 식순별 상세 설정과 실시간 미리보기
5. 최종 Validation과 전체 대본 확인
6. 같은 브라우저에서 MC 읽기 전용 화면 사용

## 6. 화면 구조

- Owner `/`: 5단계 Builder
- MC `/mc`: 읽기 전용 프롬프터
- GitHub Pages base: `/YesikNote-Project-/`

## 7. 핵심 요구사항

| ID | 요구사항 | 상태 | 코드·테스트 근거 |
|---|---|---|---|
| REQ-OWNER-001 | Owner는 5단계로 예식 정보를 작성한다. | DEPLOYED | `OwnerBuilderPage.tsx`, `validationStorage.test.ts` |
| REQ-TEMPLATE-001 | 주례 없음 13개, 주례 있음 15개를 생성한다. | DEPLOYED | `ceremonyTemplates.ts`, `ceremonyTemplates.test.ts` |
| REQ-CANDLE-001 | 화촉 A8/B7 Child를 정확한 순서로 만든다. | DEPLOYED | `ceremonyTemplates.ts`, 관련 테스트 |
| REQ-ORDER-001 | 식순과 Child를 이동하고 order만 다시 계산한다. | DEPLOYED | `SortableItemList.tsx` |
| REQ-ACTIVE-001 | 미진행은 데이터를 삭제하지 않고 출력에서 제외한다. | DEPLOYED | Script Engine·Validation 테스트 |
| REQ-SCRIPT-001 | Owner·최종·MC는 같은 Script Engine 결과를 사용한다. | DEPLOYED | `scriptEngine.ts`, `ScriptPreview.tsx`, MC 페이지 |
| REQ-SCRIPT-002 | 직접 수정 대본이 기본 본문보다 우선한다. | DEPLOYED | `scriptEngine.ts`, `scriptEngine.test.ts` |
| REQ-INTRO-001 | 소개 문장은 본문과 분리해 앞에 표시한다. | DEPLOYED | Script Engine·Preview 테스트 |
| REQ-PERF-001 | 공연은 안정 ID가 있는 카드로 관리한다. | DEPLOYED | `PerformanceItem`, `ItemDetailEditor.tsx` |
| REQ-NAV-001 | 오류는 ceremonyItemId·performanceId·field로 이동한다. | DEPLOYED | `draftValidator.ts`, `validationStorage.test.ts` |
| REQ-PREVIEW-001 | 선택한 식순의 미리보기 위치를 한 번 동기화한다. | DEPLOYED | `ScriptPreview.tsx` |
| REQ-DRAFT-001 | Draft는 기존 key/schema로 저장·복원한다. | DEPLOYED | `draftStorage.ts` |
| REQ-AUTOSAVE-001 | 입력 후 자동 저장하고 상태를 표시한다. | DEPLOYED | `useDraft.ts`, `useDraft.test.tsx` |
| REQ-SAVE-001 | 사용자는 필요할 때 저장 버튼으로 즉시 저장한다. | DEPLOYED | `useDraft.ts`, Owner Header |
| REQ-IME-001 | 한국어 조합 중간값으로 Draft를 손상하지 않는다. | DEPLOYED | composition handler·hook 테스트 |
| REQ-MC-001 | MC는 편집 없이 실제 식순을 읽고 진행 상태를 관리한다. | DEPLOYED | `McPrompterPage.tsx` |
| REQ-MOBILE-001 | 모바일에서 주요 작성·이동·읽기 기능을 사용할 수 있다. | PO ACCEPTED | Product Owner 대표 브라우저 QA |

## 8. 입력과 출력

### 공통 입력

- 예식일, 신랑·신부 이름, 예식장·홀, 피로연 장소
- 예식 유형과 식순 순서
- 진행·미진행
- 진행자 또는 참여자
- 소개 문장 설정
- 기본 대본 사용 또는 전체 대본 직접 변경
- 식순별 사회자 요청사항
- 진행 큐와 예상 시간

### 출력

`ScriptSection`은 다음 정보를 제공합니다.

- `id`, `parentId`
- 표시 제목
- 실제 낭독 대본
- 진행 큐
- 주의사항·실행 메모
- 실제 순서인 `orderPath`
- 예상 시간

## 9. Canonical과 화촉 정책

- Canonical 원문은 [기본 식순 템플릿](./CEREMONY_TEMPLATES.md)을 따릅니다.
- 주례 소개 기본 위치는 화촉점화 다음입니다.
- Canonical은 기본값이며 이동·비활성·추가·복제·삭제·이름 변경이 가능합니다.
- 안정 ID는 정렬 후에도 유지합니다.
- 화촉 유형 A는 8개, 유형 B는 7개 Child Item입니다.
- `religious`, `custom`은 MVP에서 기본 대본을 생성하지 않습니다.

## 10. 대본 엔진과 우선순위

1. 식순별 소개 문장
2. `narrationOverride`가 있으면 직접 수정 본문
3. override가 없으면 승인된 기본 본문
4. 진행 큐
5. 주의사항

소개 문장은 본문을 삭제하지 않습니다. `소개 생략`은 `없음`, `해당 없음`, `-` 같은 값을 출력하지 않습니다. 승인 대본 원문은 [SCRIPT_RULES](./SCRIPT_RULES.md)를 참고하되, 현재 코드와 충돌하는 구형 UI 정책은 `CONFLICT`로 관리합니다.

## 11. 덕담·축사

- 하나의 Canonical 말하기 식순에서 `speechType`으로 덕담 또는 축사를 선택합니다.
- 사용자 표시 제목은 선택값에 맞춰 바뀌지만 내부 title과 ID는 유지합니다.
- 이름 또는 호칭과 관계 중 하나 이상이 있으면 소개 정보를 만들 수 있습니다.
- 소개를 생략하면 사람을 추정하지 않는 승인된 중립 문장을 사용합니다.

## 12. 공연

- Canonical 공연 식순은 축가·축무·축주를 지원합니다.
- 공연 카드는 안정 ID, 공연 유형, 진행자, 관계, 곡명·공연명, 순서를 가집니다.
- 사용자 표시와 Validation은 화면 번호가 아니라 의미 필드와 안정 ID를 사용합니다.
- 오류가 발생하면 정확한 공연 카드가 스크롤·강조되고 첫 오류 입력칸에 focus됩니다.
- 공연별 수량·곡 수의 정식 데이터 정책은 `BACKLOG`입니다. 현재 schema를 임의로 확장하지 않습니다.

## 13. 소개 문장

- 자동 생성: 입력된 이름·호칭·관계·식순 유형으로 문장을 조합합니다.
- 직접 입력: 사용자가 작성한 완성 문장을 그대로 사용합니다.
- 소개 생략: 소개 블록과 빈 줄을 출력하지 않습니다.
- 직접 입력과 자동 생성 문장을 동시에 출력하지 않습니다.
- 공연 소개와 기본 대본에서 같은 사람·관계·공연 정보를 불필요하게 반복하지 않습니다.

## 14. Validation과 오류 Navigation

- 필수 기본정보가 비어 있으면 완료를 막습니다.
- 미진행 식순은 해당 식순의 필수 입력 오류를 만들지 않습니다.
- Custom Item은 활성 상태일 때 제목·설명·MC 대본을 확인합니다.
- 예물교환 미진행은 오류가 아닙니다.
- 오류 객체는 가능한 경우 `ceremonyItemId`, `performanceId`, `section`, `field`를 가집니다.
- `수정하기`는 배열 index, 화면 번호, title 문자열만으로 대상을 찾지 않습니다.

## 15. Preview Sync

- 4단계에서 선택한 식순과 우측 미리보기를 연결합니다.
- 사용자 선택 또는 오류 이동 시 대상 카드로 한 번 이동합니다.
- 타이핑 중 반복 자동 스크롤하지 않습니다.
- 대상 강조는 잠시 후 자동 해제합니다.
- `prefers-reduced-motion` 환경에서는 불필요한 motion을 줄입니다.

## 16. 저장·복원과 데이터 보존

- localStorage key: `yesiknote:owner-builder:draft:v1`
- schema: `2`
- schema 1 migration 전 원본을 backup key에 보존합니다.
- 최신 schema는 migration 없이 읽습니다.
- 저장 실패 시 화면에서 실패 상태를 표시합니다.
- 기존 사용자 입력, Custom Item, active, 정렬, override, Cue, Note, detailConfig를 보존합니다.
- 브라우저 데이터 삭제나 다른 기기 이동에 대한 서버 복원은 지원하지 않습니다.

## 17. DnD·안정 ID·IME

- DnD와 모바일 위·아래 이동은 order만 변경합니다.
- 표시용 제목이 내부 저장 title을 덮어쓰지 않습니다.
- IME composition 종료 후 최종 값을 다시 저장합니다.
- Preview·Validation 연결은 안정 ID를 사용합니다.

## 18. 권한과 승인 상태

- 현재 인증과 Owner 권한 판별은 없습니다.
- MC에서 Owner 편집 화면으로 이동하는 권한 버튼은 구현하지 않습니다.
- 코드 변경, Commit, Push·배포는 각각 Product Owner 승인을 받습니다.

## 19. 접근성·모바일·디자인 원칙

- 입력 label과 사용자 언어를 명확히 사용합니다.
- 클릭할 수 없는 역할 배지는 버튼처럼 동작하지 않습니다.
- focus 대상과 저장 상태를 시각적으로 확인할 수 있어야 합니다.
- 모바일에서도 핵심 기능을 가리지 않습니다.
- 대본은 Cue·Note보다 높은 시각적 우선순위를 가집니다.
- 전체 디자인 시스템 교체 없이 기존 토큰과 지역 스타일을 사용합니다.

## 20. 비기능 요구사항

- TypeScript build와 typecheck가 성공해야 합니다.
- 기존 테스트를 삭제·skip·완화하지 않습니다.
- GitHub Pages 저장소 base에서 asset을 정상 로드해야 합니다.
- API key, token, 개인정보, `.env`를 저장소에 포함하지 않습니다.
- Draft schema 변경은 migration·rollback 계획과 별도 승인이 필요합니다.

## 21. 성과 확인 기준

현재 정량 KPI는 `UNKNOWN`입니다. MVP에서는 다음 신호를 우선 확인합니다.

- 사용자가 도움 없이 5단계를 완료할 수 있는지
- 오류의 `수정하기`로 정확한 입력 위치에 도달하는지
- 새로고침 후 입력이 복원되는지
- Owner와 MC 대본 차이가 없는지
- 대표 모바일 화면에서 작성과 읽기가 가능한지

## 22. 제외 범위와 Backlog

다음 기능은 현재 MVP에서 제외합니다.

- Auth·Supabase·RLS·멀티테넌시
- 공유 링크·Guest QR·VenueAdmin
- 인쇄·PDF·파일·음원 업로드
- Final Snapshot·Patch·Audit Trail
- 결제·정산·통계
- 자유 생성형 AI 대본

세부 후보와 선행 조건은 [BACKLOG](./BACKLOG.md)에서 관리합니다.

## 23. 미확정과 충돌

### UNKNOWN

- 다음 기능 Batch 우선순위
- 공식 제품 버전 명칭
- 정량 KPI 목표값
- Vercel 운영 상태

### CONFLICT

- `SCRIPT_RULES.md`의 과거 소개 입력 정책과 현재 3가지 소개 모드
- `ACCEPTANCE_CRITERIA.md`의 미완료 체크 상태와 현재 배포·테스트 상태
- 과거 전체 단계 수 16·18 표기

## 24. 변경 이력

Commit별 이력은 [CHANGELOG](./CHANGELOG.md), 결정 근거는 [DECISIONS](./DECISIONS.md), 검증은 [QA_LOG](./QA_LOG.md)를 따릅니다.

