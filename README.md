# YesikNote Owner Script Builder v0.1D

예비 신랑·신부가 예식 정보를 입력하고 식순을 편집하면, 규칙 기반으로 사회자 대본과 진행 큐를 만드는 MVP Phase 1 프로토타입입니다.

## 실행 방법

```bash
npm install
npm run dev
```

테스트와 프로덕션 빌드는 다음 명령으로 확인합니다.

```bash
npm run test
npm run build
```

## 주요 화면

- `/`: Owner 5단계 식순 작성 화면
- `/mc`: 같은 브라우저에 저장된 Draft를 사용하는 MC 읽기 전용 프롬프터

데이터는 브라우저 `localStorage`에만 저장됩니다. 회원가입, Supabase, 실제 공유 링크와 배포 인프라는 이번 범위에 포함되지 않습니다.

상세 범위와 대본 정책은 `docs/` 문서를 참고해 주세요.
