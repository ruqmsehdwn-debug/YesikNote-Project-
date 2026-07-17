# YesikNote Backlog

Backlog는 구현 승인이 아닙니다. 한 번에 한 목적만 Batch로 선택하고 데이터·schema·migration·Rollback 계획을 먼저 승인합니다.

우선순위는 제안이며 Product Owner 확정 전 `UNKNOWN`입니다.

## BACKLOG-001 — 공연별 곡 수·공연 수

- 상태: PLANNED
- 문제: 같은 공연자의 여러 곡과 여러 공연자의 개별 무대를 수량으로 구분하기 어렵습니다.
- 사용자 가치: 축가 몇 곡, 축무·축주 몇 공연인지 Owner와 MC가 한눈에 확인할 수 있습니다.
- 선행 조건: 한 공연 카드의 의미를 `한 무대 진행 단위`로 확정
- 데이터: 공연별 양의 정수 수량, 기본값 1
- schema·migration: 현재 `PerformanceItem`에 정식 필드가 없어 별도 승인 필요
- 추천 Batch: Performance Count
- 우선순위 제안: 높음

## BACKLOG-002 — 입장곡 제목 표시

- 상태: AUDITED ONLY
- 문제: 입장 방식은 보이지만 실제 입장곡 제목을 대본·Cue에서 즉시 확인하기 어렵습니다.
- 사용자 가치: 사회자·음향팀 확인 누락 감소
- 선행 조건: 신랑·신부·부모님 입장곡 데이터 소유 위치 결정
- 데이터: 곡명, 선택적 음원 참조
- schema·migration: 신규 필드 여부 감사 필요
- 추천 Batch: Entrance Music Metadata
- 우선순위 제안: 중간

## BACKLOG-003 — Final Snapshot과 최종 대본 확정

- 상태: DESIGN AUDIT ONLY
- 문제: Owner가 계속 편집하는 Draft와 사회자가 확정해서 읽는 버전이 분리되지 않습니다.
- 사용자 가치: 예식 직전 변경으로 인한 대본 불일치 방지
- 선행 조건: Snapshot 생성·해제 권한과 변경 비교 정책
- 데이터: snapshot version, 생성 시각, 기준 Draft
- schema·migration: 서버 저장·버전 정책과 함께 설계 필요
- 추천 Batch: Finalization Contract
- 우선순위 제안: 높음

## BACKLOG-004 — 대본 1안·2안·3안 비교

- 상태: DESIGN AUDIT ONLY
- 문제: 여러 대본 후보를 비교·확정하는 기능이 없습니다.
- 사용자 가치: 현장 톤과 길이에 맞는 대본 선택
- 선행 조건: Final Snapshot과 대본 버전 모델
- 데이터: variant ID, 상태, 선택된 안
- schema·migration: 별도 설계 필요
- 추천 Batch: Script Variants
- 우선순위 제안: 낮음

## BACKLOG-005 — MC Mode 확장

- 상태: PLANNED
- 문제: 현재 MC 화면은 같은 브라우저 Draft에 의존합니다.
- 사용자 가치: 실제 사회자에게 안전하게 확정 대본 전달
- 선행 조건: 공유 링크, Snapshot, 권한
- 데이터: 읽기 전용 token 또는 서버 식별자
- schema·migration: Auth·보안 검토 필요
- 추천 Batch: Shared MC Read-only
- 우선순위 제안: 높음

## BACKLOG-006 — VenueAdmin

- 상태: PLANNED
- 문제: 예식장 운영자가 Cue와 현장 준비사항을 별도 문서로 관리합니다.
- 사용자 가치: Owner·MC·예식장 순서 정합성
- 선행 조건: 역할·권한·Snapshot/Patch
- 데이터: venue role, venue note, 승인 상태
- schema·migration: 서버 DB와 RLS 필요
- 추천 Batch: Venue Role Discovery 후 구현
- 우선순위 제안: 중간

## BACKLOG-007 — Guest QR

- 상태: PLANNED
- 문제: 하객 대상 정보 전달 경로가 없습니다.
- 사용자 가치: 좌석·식사·사진·예식 안내 접근성
- 선행 조건: 공개 정보 범위와 개인정보 정책
- 데이터: 공개 snapshot, 만료 정책
- schema·migration: 공유 권한 설계 필요
- 추천 Batch: Guest Experience
- 우선순위 제안: 낮음

## BACKLOG-008 — 공유 링크와 역할별 화면

- 상태: PLANNED
- 문제: 현재 Owner와 MC는 같은 브라우저 저장소를 사용합니다.
- 사용자 가치: 신랑·신부, 사회자, 예식장이 각자 필요한 화면만 안전하게 확인
- 선행 조건: Auth, role, Snapshot, 만료·회수 정책
- 데이터: share link, role, permission, expiry
- schema·migration: 서버 DB·RLS 필수
- 추천 Batch: Sharing Contract
- 우선순위 제안: 높음

## BACKLOG-009 — 인쇄·PDF

- 상태: PLANNED
- 문제: 현장용 출력물과 보관용 파일을 만들 수 없습니다.
- 사용자 가치: 네트워크 없이 확인 가능한 최종 대본
- 선행 조건: Final Snapshot과 인쇄 레이아웃
- 데이터: 기존 ScriptPackage 재사용 가능
- schema·migration: 불필요할 가능성이 높으나 감사 필요
- 추천 Batch: Export
- 우선순위 제안: 중간

## BACKLOG-010 — Supabase·Auth·RLS

- 상태: BLOCKED
- 문제: 브라우저 localStorage만으로 기기 간 저장·공유·복구를 지원할 수 없습니다.
- 사용자 가치: 계정 기반 Draft 복원과 안전한 협업
- 선행 조건: repository adapter, Type/API/DB 계약, 개인정보·보존·삭제 정책
- 데이터: user, wedding, draft, snapshot, role, audit
- schema·migration: 별도 DB migration과 local Draft import 정책 필수
- 추천 Batch: Backend Read-only Audit → Contract → 별도 구현
- 우선순위 제안: 제품 방향 결정 필요

## BACKLOG-011 — Patch·Audit Trail

- 상태: BLOCKED
- 문제: 누가 어떤 내용을 변경했는지 추적할 수 없습니다.
- 사용자 가치: 협업 중 변경 원인과 복원 지점 확인
- 선행 조건: Auth, Snapshot, 서버 저장
- 데이터: patch, actor, version, timestamp
- schema·migration: 별도 설계 필수
- 추천 Batch: Collaboration Governance
- 우선순위 제안: 낮음

## BACKLOG-012 — 디자인 시스템·랜딩페이지

- 상태: PLANNED
- 문제: 제품 UI 토큰과 외부 소개 화면이 공식 체계로 분리되어 있지 않습니다.
- 사용자 가치: 화면 일관성과 신규 사용자 이해도
- 선행 조건: 핵심 Builder 흐름 안정화와 브랜드 원칙
- 데이터: 없음
- schema·migration: 없음
- 추천 Batch: Design Foundation
- 우선순위 제안: 중간

## Product Owner 결정 필요

1. 다음 Batch가 Final Snapshot, 공유 MC, 공연 수량 중 무엇인지
2. 서버 저장 도입 전에 localStorage MVP를 어느 수준까지 확장할지
3. 입장곡을 단순 제목으로 저장할지, 향후 음원 자산과 연결할지
4. 공식 제품 버전과 출시 기준

