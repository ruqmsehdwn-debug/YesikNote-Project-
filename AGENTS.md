# YesikNote 작업 지침

- `YesikNote_Codex_First_Prompt_v1.4_FINAL.md`를 MVP Phase 1의 최종 기준으로 사용한다.
- 표준 사회자 대본은 임의로 축약하거나 새로 쓰지 않는다.
- UI와 `scriptEngine.ts`를 분리하고 Owner/MC 화면은 동일한 Script Engine 결과를 사용한다.
- `religious`, `custom`, 사용자 추가 자유 식순에는 기본 대본을 생성하지 않는다.
- 자유 식순은 제목, 설명, MC 대본을 Owner가 직접 입력하며 빈 대본은 최종 Validation에서 차단한다.
- 미진행은 `active = false`로 처리하고 기존 입력을 보존한다. 직접 삭제와 구분한다.
- 비활성 항목은 최종 대본, 진행 큐, 주의사항, MC 화면에서 제외한다.
- 한국어 IME 조합 중에는 localStorage에 저장하지 않는다.
- Supabase, 인증, 공유 토큰, 파일 업로드, 자유 생성형 AI를 추가하지 않는다.
- API 키, 토큰, 개인정보 또는 `.env` 값을 커밋하지 않는다.
