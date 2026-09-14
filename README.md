# ZA2030 스포트라이트 세션 — 3단계 보드 패키지

같은 GitHub 저장소 / 같은 Netlify 사이트(spotlightsession.netlify.app)에서 세션 흐름대로 쓰는
3개 페이지 세트입니다.

1. **`index.html`** — 핵심 요소 보드 (기존)
2. **`evidence-hunt.html`** — Evidence Hunt 보드 (기존)
3. **`action-items.html`** — 액션 아이템 보드 (신규)

이번에 세 파일 전부 **디자인 톤을 Evidence Hunt 스타일(블루/오렌지/그린/퍼플, 큰 글씨)로 통일**했고,
세 페이지 모두 상단에 "① 핵심 요소 → ② Evidence Hunt → ③ 액션 아이템" **플로우 탭**을 넣어서
지금 세션이 어느 단계인지, 다음 단계로 어떻게 넘어가는지 한눈에 보이게 했습니다. 현재 페이지에 해당하는
탭이 진하게 표시되고, 나머지 탭을 클릭하면 바로 이동합니다.

## 1. 파일 배치

```
(저장소 루트)/
├─ index.html                     ← 이 패키지 파일로 교체 (톤 변경 + 플로우 탭 추가, 기능/데이터는 동일)
├─ evidence-hunt.html             ← 이 패키지 파일로 교체 (플로우 탭 추가)
├─ action-items.html              ← 신규 추가
└─ netlify/
   └─ functions/
      ├─ entries.js               ← 이 패키지 파일로 교체 (지난번 전달한 공감 기능 포함 버전, 원래 있던
      │                              하위 폴더 위치 그대로 덮어쓰시면 됩니다)
      ├─ evidence-hunt.js         ← 이 패키지 파일로 교체 (Blobs 초기화 에러 처리 보강)
      └─ action-items.js          ← 신규 추가
```

## 2. 배포

기존과 동일하게 GitHub → Netlify 자동 배포이므로, 파일을 커밋 & 푸시하면 자동으로 함께 배포됩니다.
(Netlify Functions v2 + Netlify Blobs 사용 — 드래그앤드롭 배포 불가, 기존과 동일한 제약)

## 3. 환경변수 (관리자 비밀번호)

기존 사이트에 이미 설정된 `ADMIN_TOKEN` 환경변수를 세 함수(`entries.js`, `evidence-hunt.js`, `action-items.js`)가
모두 그대로 재사용합니다. 별도 설정 불필요. 설정하지 않았다면 코드 내 기본값(`za2030admin`)이 사용되니
실제 워크숍 전에는 반드시 교체하시길 권장합니다.

## 4. 데이터 저장소

세 보드는 완전히 분리된 Blobs 스토어를 각각 사용합니다 (`za2030-priority-board` / `za2030-evidence-hunt` /
`za2030-action-items`). 서로 데이터에 영향을 주지 않습니다.

## 5. 액션 아이템 보드 사양

- 참여: 이름 + 소속(팀) + 액션 내용(최대 300자) + Impact/Control/Feasibility 3가지 자가진단 체크박스
- 1인당 최대 2건 제안 (기기 저장 토큰 기준), 본인 항목은 직접 삭제 가능
- 담당자 배정은 이번 단계에서는 받지 않음 (추후 오프라인에서 결정)
- "함께 보기" 탭: 카드 리스트, 최신순/공감순 정렬 토글, 카드별 자유 공감(❤️) — 한 사람이 여러 카드에 공감
  가능하되 같은 카드에는 1회만 (다시 누르면 취소)
- 3가지 기준을 모두 충족한 카드에는 "🏆 3개 기준 모두 충족" 배지 표시
- CSV 다운로드: 공개, 누구나 가능 (소속/이름/액션/Impact/Control/Feasibility/공감수/제출일시)
- 관리자: 비밀번호 입력 후 전체 삭제만 가능
- 실시간 워크숍용, 2초 간격 자동 새로고침
- 저작권 푸터 포함: "© 2026 Joanna Lee. All rights reserved."

## 6. 이번에 함께 바뀐 것

- `index.html`: cream/beige 톤 → Evidence Hunt와 동일한 블루 계열 톤(그라데이션 헤더, 요소별 색상 카드)으로 재조정.
  4요소 컬럼에 각각 blue/orange/green/purple 포인트 컬러 적용. 기존 기능(등록/수정/삭제/공감/CSV/관리자)은
  전혀 변경되지 않음 — CSS와 플로우 탭만 추가/교체됨
- `evidence-hunt.html`: 기존 "← 핵심 요소 보드로" 링크를 3단계 플로우 탭으로 교체
- `evidence-hunt.js`: Blobs 스토어 초기화 실패 시 더 친절한 에러 메시지를 돌려주도록 보강 (entries.js와 동일한 방식)
