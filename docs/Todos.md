# YesikNote 개발 체크리스트

최종 갱신일: 2026-07-20

## 완료

- [x] Owner Builder MVP 구현
- [x] 주례 없음 13개 / 주례 있음 15개 Canonical 반영
- [x] 화촉점화 A8 / B7 반영
- [x] 안정 ID와 구형 Draft 비파괴 migration
- [x] 덕담·축사 표시와 Reactive Cue 보완
- [x] 신랑·신부 입장 방식별 Cue·Note 반영
- [x] 혼인서약·성혼선언 조합과 중복 출력 방지
- [x] 소개 문장 공통 출력과 소개 생략 처리
- [x] 공연 카드 Validation Navigation
- [x] 선택 식순과 실시간 미리보기 동기화
- [x] IME 안전 Autosave와 수동 저장
- [x] 누적 자동 테스트 135개 통과 기록
- [x] `pnpm build`와 typecheck 검수
- [x] Product Owner 대표 사용성 QA
- [x] Commit `6e136bc` 생성과 `origin/main` Push
- [x] GitHub Actions #6 성공
- [x] GitHub Pages 공개 화면 확인
- [x] Documentation Recovery 읽기 전용 감사
- [x] README 현재 상태 병합
- [x] 프로젝트 현황·PRD·Todos 초안 작성
- [x] Decisions·Changelog·QA Log·Backlog·Workflow 초안 작성
- [x] 문서 링크·상태·충돌 최종 검수
- [x] Documentation Recovery 문서 Commit `b6f937c` 생성
- [x] Commit `b6f937c`의 `origin/main` Push 확인

## 진행 중

- [x] Documentation Baseline Alignment 7개 문서 로컬 정렬
- [x] 지정 파일·링크·Commit 상태·Diff 최종 검수
- [ ] Product Owner의 변경 내용 확인

## Product Owner 확인

- [ ] 공식 Phase 0~9 단계표 확정
- [ ] 다음 기능 Batch 우선순위 결정
- [ ] `SCRIPT_RULES.md`의 구형 소개 정책 처리 방향 결정
- [ ] 문서 최종 검수 결과 확인

## QA

- [x] Markdown 링크와 상대 경로 확인
- [x] 파일명 대소문자와 UTF-8 확인
- [x] 문서의 Commit SHA·배포 URL 확인
- [x] `UNKNOWN`, `CONFLICT`, `MISSING EVIDENCE` 누락 확인
- [x] 코드·테스트 파일이 문서 Diff에 포함되지 않았는지 확인

## Documentation Baseline Alignment Commit 대기

- [ ] Product Owner의 별도 Commit 승인
- [ ] 승인된 7개 문서만 명시적으로 stage
- [ ] 문서 전용 Commit 생성

## Push·배포 대기

- [ ] Product Owner의 별도 Push 승인
- [ ] 문서 Commit을 원격에 일반 Push
- [ ] GitHub README와 문서 링크 확인
- [ ] 기능 Pages 회귀 여부 확인

## 다음 Batch

- [ ] 후속 문서 후보를 별도 Batch로 승인: MVP Owner Builder Specification → Pilot Plan & Finalization Requirements → Upper Product PRD → Product Vision → Design System → Wireframes
- [ ] Backlog에서 한 가지 목적만 선택
- [ ] 읽기 전용 기준선 감사
- [ ] 수정 파일·데이터·테스트·Rollback 계획 승인

## Backlog

- [ ] 공연별 곡 수·공연 수 정식 정책
- [ ] 입장곡 제목 표시
- [ ] Final Snapshot과 최종 대본 확정
- [ ] 대본 1안·2안·3안 비교
- [ ] 공유 링크와 역할 권한
- [ ] VenueAdmin·Guest QR
- [ ] 인쇄·PDF
- [ ] Supabase·Auth·RLS

상세 내용과 선행 조건은 [BACKLOG](./BACKLOG.md)를 따릅니다.

## Blocked

- 다음 기능 Batch: 문서 복구와 우선순위 승인 전까지 시작하지 않음
- 서버 기반 저장·공유: Auth·DB·권한·migration 계획 승인 필요
