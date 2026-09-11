# ZA2030 우리 팀의 핵심 요소 — 배포 안내

ZA2030의 4가지 전략 축(Customer at the Core / Speed / Truly Global / High Performance Team ZEISS) 중
우리 팀 성공에 가장 중요한 요소 하나를 고르고 이유를 남기는 Padlet 스타일 보드입니다.
여러 팀이 하나의 사이트를 함께 사용할 수 있도록 소속(팀) 항목이 포함되어 있습니다.

## 구성 파일
- `index.html` — 화면 (프론트엔드), 그대로 열어봐도 되지만 로컬에서는 데이터 저장이 되지 않습니다 (배포 후 정상 동작)
- `netlify/functions/entries.js` — 응답 저장/조회/수정/삭제를 처리하는 서버리스 함수
- `netlify.toml`, `package.json` — 배포 설정

## 배포 방법 (GitHub → Netlify 연결, 드래그앤드롭 배포 불가)
서버리스 함수(데이터 저장)를 쓰기 때문에 Netlify에 **드래그앤드롭으로는 배포할 수 없고**,
반드시 GitHub 저장소와 연결하는 방식으로 배포해야 합니다.

1. 이 폴더 전체를 새 GitHub 저장소에 업로드(push)합니다.
2. [Netlify](https://app.netlify.com) 접속 → "Add new site" → "Import an existing project" → 방금 만든 GitHub 저장소 선택
3. 빌드 설정은 그대로 두어도 됩니다 (`netlify.toml`에 이미 설정되어 있음: Publish directory `.`, Functions directory `netlify/functions`)
4. 배포(Deploy site) 클릭

## 관리자 비밀번호 설정 (중요)
배포 후 반드시 아래 절차로 관리자 비밀번호를 설정하세요. 설정하지 않으면 코드에 있는 기본값
(`za2030admin`)이 사용되어 보안에 취약합니다.

1. Netlify 사이트 대시보드 → **Site configuration → Environment variables**
2. 변수 추가: Key = `ADMIN_TOKEN`, Value = 원하는 비밀번호
3. 저장 후 "Deploys" 탭에서 재배포(Trigger deploy) 한 번 실행 (환경변수는 재배포해야 반영됩니다)

이 비밀번호는 화면 하단 "관리자" 버튼을 눌러 전체 응답을 삭제할 때 사용합니다.
**전체 삭제는 모든 팀의 데이터를 한 번에 지웁니다** (팀별 선택 삭제는 지원하지 않음).
한 팀의 사용이 끝나고 다른 팀이 이어서 쓰기 전 초기화하는 용도로 사용하세요.

## "데이터를 불러오지 못했습니다" / "Blobs 스토어를 초기화하지 못했습니다" 오류 해결 이력
- **1차 원인 추정**: `@netlify/blobs` 버전 범위가 애매해서(`^8.1.0`) 설치가 꼬였을 가능성 → 버전을 `11.0.3`으로 고정, 빌드 커맨드/번들러 명시 (해결 안 됨)
- **실제 원인 (확인됨)**: `MissingBlobsEnvironmentError`. 기존 코드가 Netlify Functions **v1 방식**(`exports.handler`)으로 작성되어 있었는데,
  Netlify Blobs의 "설정 없이 자동 인증"(zero-config)은 **v1 방식에서는 보장되지 않는 것으로 확인**되었습니다
  (Netlify 공식 문서 및 커뮤니티 사례 다수 확인 — v1은 `connectLambda`를 수동 호출해야 하고, v2 방식은 자동으로 동작).
- **적용한 수정**: `netlify/functions/entries.js`를 **Functions v2 방식**(`export default async (req, context) => {...}`,
  표준 Request/Response 객체 사용)으로 다시 작성했습니다. v2에서는 Blobs 인증이 자동으로 주입되어 별도 설정이 필요 없습니다.
  API 경로(`/api/entries`)와 요청/응답 형식은 이전과 동일하므로 화면(index.html) 쪽은 변경할 필요가 없습니다.

재배포 순서:
1. 이 zip의 파일들로 기존 GitHub 저장소 내용을 **전체 교체**한 뒤 commit & push
   (`netlify/functions/entries.js`, `netlify.toml`이 바뀌었습니다 — `netlify.toml`의 `/api/*` 리다이렉트 규칙은
   이제 함수 안의 `config.path`가 대신 처리하므로 제거되었습니다)
2. Netlify 사이트 대시보드 → **Deploys** 탭 → 새 커밋이 자동으로 재배포되는지 확인 (안 되면 "Trigger deploy" 클릭)
3. 배포 후 사이트를 새로고침해서 정상적으로 데이터가 뜨는지 확인
4. 그래도 안 되면 **Functions 탭 → entries 함수 클릭 → 실시간 로그**를 확인하거나, 화면에 뜨는 에러 메시지를
   그대로 알려주세요.

## 참여 방식 요약
- 참여자는 이름 + 소속(팀) + 4가지 요소 중 하나를 선택하고 이유를 남깁니다.
- 1인 1건 제한이며, 같은 기기/브라우저에서는 본인이 남긴 글만 수정·삭제할 수 있습니다.
  (브라우저 저장소 기반 식별이므로 기기나 브라우저를 바꾸면 새로 참여됩니다)
- 화면 상단 "CSV 다운로드" 버튼으로 전체 응답(소속, 이름, 선택 요소, 이유, 제출일시)을 누구나 내려받을 수 있습니다.

## 참고 — 아이콘/설명 문구
각 요소 카드의 아이콘은 제공해주신 이미지에서 점 그래픽만 잘라내어 base64로 내장했고,
설명 문구도 제공해주신 공식 문구로 반영되어 있습니다 (`index.html` 상단 `PILLARS` 배열).
문구를 다시 바꾸고 싶다면 같은 배열의 `desc` 값을 수정하면 됩니다.

타이틀 문구("우리 팀 성공의 핵심 요소")도 같은 파일의 `<h1>` 태그에서 바로 수정할 수 있습니다.
