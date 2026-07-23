# YesikNote 개별 예식 최종 식순표 구현 v0.1

상태: `IMPLEMENTED` · 자동 검증 `VERIFIED` · 정책 `PROPOSED`

## 1. 목적

신랑·신부가 작성한 한 예식의 정보를 예식장 담당자, 예도, 사회자가 같은 기준으로 확인할 수 있는 읽기 전용 식순표로 보여 준다. 이 화면은 공동 미팅과 브라우저 인쇄를 위한 미리보기이며 Final Snapshot, 확정 잠금, 변경 이력은 아니다.

## 2. 실제 구현 위치

- 화면: [`FinalCeremonySheet.tsx`](../src/features/wedding-builder/components/FinalCeremonySheet.tsx)
- 연결: [`OwnerBuilderPage.tsx`](../src/features/wedding-builder/pages/OwnerBuilderPage.tsx)의 Step 5 최종 확인
- Projection: [`ceremonyProjection.ts`](../src/features/wedding-builder/services/ceremonyProjection.ts)
- 인쇄·반응형: [`styles.css`](../src/styles.css)
- 테스트: [`FinalCeremonySheet.test.tsx`](../src/features/wedding-builder/__tests__/FinalCeremonySheet.test.tsx)

새 라우트는 만들지 않았다. Owner 작성 → 최종 확인 → 예식장 체크표 Preview → 최종 예식 식순표 → 인쇄 순서로 같은 화면 안에서 확인한다.

## 3. 실제 사용 데이터

- `CeremonyDraft.basicInfo`: 신랑·신부, 예식일, 예식장, 홀
- `CeremonyDraft.ceremonyType`: 예식 형태와 주례 유무
- `CeremonyDraft.items`: 안정 ID, 실제 `order`, `active`, 진행 설정, 공연 카드
- `CeremonyProjection`: 역할별 진행 요약과 `sourceWarnings`
- `ScriptPackage`: 각 식순의 Cue와 Note

예식 시간은 현재 Draft에 전용 필드가 없어 `확인 필요`로 표시한다. 없는 값을 예시로 채우거나 일반적인 예식 관행으로 추정하지 않는다.

## 4. Projection Engine 연결

화면은 `buildCeremonyProjection(draft)` 결과를 읽어 진행 주체, 입장 방식, 혼인서약, 성혼선언, 공연 등의 요약을 표시한다. Cue와 Note는 기존 `generateScript(draft)` 결과를 읽지만 서로 다른 열에 유지한다. Projection이나 화면은 Draft를 변경하지 않는다.

## 5. 화면 표시 항목

- 상단: 신랑, 신부, 예식 날짜, 예식 시간, 예식장·홀, 예식 형태, 주례 유무, 현재 상태
- 본문: 순번, 식순, 진행 정보, Cue, Note, 확인 필요
- 하단: 미진행 식순, 공동 확인 필요사항, Draft 마지막 수정 시점, Final Snapshot이 아니라는 안내

식순은 배열 index가 아니라 안정 ID를 가진 항목을 `order`로 정렬한다. `active=false` 항목은 기본 표에서 제외하고 미진행 목록에 제목만 표시하며 원본 입력값은 보존한다.

## 6. 공연 표시

공연 카드는 현재 카드 순서를 그대로 사용한다. 한 카드가 한 곡인지 한 무대인지 정책이 확정되지 않았으므로 최종 식순표에서는 `공연 카드 N건`으로 표시하고 각 카드의 유형, 제목, 공연자, 관계를 순서대로 보여 준다. `N곡`으로 정책을 확정하지 않는다.

## 7. 인쇄 지원

- 브라우저 `window.print()` 기반 인쇄 버튼
- `@media print`와 A4 세로 `@page`
- 입력·내비게이션·기존 Preview·대본 영역을 인쇄에서 제외
- 표 header 반복, 행 중간 분할 억제, 흑백 구분 가능한 선과 배경
- 새 PDF 라이브러리와 외부 서비스 없음

브라우저의 “PDF로 저장” 기능을 사용할 수 있으나 별도 PDF 파일 생성·저장 기능은 구현하지 않았다.

## 8. 현재 미구현 기능

- Final Snapshot 생성, 잠금, 버전
- 확정 이후 변경 이력
- 주말 여러 예식 통합 운영 체크리스트
- 여러 예식 저장·목록·검색
- 역할별 권한과 서버 동기화
- 자료 준비 상태와 음원 타이밍의 구조화 필드
- 예식 시간 전용 필드

## 9. Final Snapshot과의 차이

현재 화면은 항상 현재 Draft와 Projection을 다시 읽는 미리보기다. 확정 시점의 값을 복제하거나 잠그지 않으며, 이후 Owner가 Draft를 수정하면 화면도 바뀐다. 따라서 `FINAL`, `LOCKED`, `SNAPSHOT` 상태로 해석하면 안 된다.

## 10. 파일럿 검증 항목

1. A4 인쇄에서 긴 Cue·Note가 읽기 쉬운지
2. 현장 담당자가 `확인 필요` 경고를 이해하는지
3. `active=false`를 별도 목록으로 보여 주는 방식이 적절한지
4. 공연 카드 `N건` 표현이 현장 용어에 맞는지
5. 종교식·custom 식순의 입력 제목·내용 표시가 충분한지
6. 개인정보를 어느 역할까지 보여 줄지

## 11. 검증 근거

- 전체 자동 테스트 7개 파일, 152개 통과
- TypeScript·Vite production build 통과
- `pnpm exec tsc --noEmit` 통과
- `git diff --check` 통과
- 로컬 Owner Step 5에서 최종 식순표, 기존 Venue Preview, 인쇄 버튼, Cue·Note 분리, 확인 필요 표시 확인
- Console 제품 오류 없음
- Draft key/schema, 저장 모듈, Script Engine, MC 화면 `NOT CHANGED`

## 12. 개발자 전달용 한 페이지 요약

```text
신랑·신부 입력
    ↓
CeremonyDraft
    ↓
Projection Engine
    ├→ 예식장 체크표 Preview
    ├→ 개별 최종 예식 식순표
    └→ 기존 MC 대본 / Cue / Note
```

이번 구현은 새 데이터를 저장하지 않는다. 이미 있는 Draft, Projection, ScriptPackage를 읽어 공동 확인용 표로 다시 보여 준다. 식순 순서와 안정 ID를 유지하고, 미진행 값을 삭제하지 않는다. Cue와 Note는 대본에 섞지 않고 별도 열에 둔다. 인쇄는 브라우저 기능을 사용한다. 서버, 권한, Final Snapshot, 주말 통합표는 다음 별도 Batch 범위다.
