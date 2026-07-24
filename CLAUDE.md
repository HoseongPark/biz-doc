# biz-doc

DDD 바운디드 컨텍스트/도메인 명세(YAML)를 시각적으로 편집하는 **로컬 데스크톱 도구** 프로젝트.
스택: **Tauri + React + Vite + TypeScript**, 다이어그램은 React Flow 예정.

## 진행 상태 (2026-07-24)

설계·요구사항·UI 목업까지 **사용자 승인 완료**. 구현 코드는 아직 없음.

**다음 단계**: 설계 문서 기반으로 구현 계획 작성(writing-plans) → 리포 루트에 Tauri + React 스캐폴딩.

## 설계 문서 (읽는 순서)

1. `document/common/overview.md` — 목적, 핵심 결정 요약
2. `document/common/architecture.md` — Tauri 구조, 워크스페이스 규약, 기각한 대안
3. `document/project/01-poc-진행/requirements.md` — 명세 스키마 정의 + v1 기능 범위
4. `document/design/ui.md` — 화면 구성, 디자인 토큰
5. `document/sample/context/swing-session.yml` — 샘플 명세 (스키마의 실제 예시)
6. `document/design/page.pen` — Pencil 목업 (Pencil MCP 도구로만 접근, Read/Grep 금지)

## 핵심 결정 (문서와 다르게 구현하지 말 것)

- **파일이 진실의 원천**: 워크스페이스의 `context/*.yml` 직접 읽기/쓰기, 컨텍스트 1개 = 파일 1개, 캐시 없음
- **YAML 키 순서 보존** 필수 — Git diff 최소화와 LLM 컨텍스트 활용이 프로젝트 목적
- 도메인 유형 4종: Root Aggregate(#4F63F6) / Entity(#0E9F6E) / Value(#8B5CF6) / Stereotype(#D97706)
  - Stereotype = Java enum 같은 열거형, `attributes` 대신 `values` 목록
- 용어: `business-logic` (business-rules 아님), 이름은 `meta.name` 한글 단순 문자열(ko/en 맵 금지), 영문 식별자는 도메인 키
- `identity.id`(UUID)·`audit`은 앱이 자동 관리, UI에서 읽기 전용
- 노드 좌표 등 뷰 설정은 워크스페이스 `.config/layout.json` (명세 YAML에 넣지 않음)
- Rust는 셸만: 파일 접근은 Tauri fs/dialog 플러그인을 TS에서 호출, 로직은 전부 TypeScript

## 도구 메모

- **Pencil MCP**: 목업 편집용. 미등록 시:
  `claude mcp add pencil --scope user -- "C:\Program Files\Pencil\resources\app.asar.unpacked\out\mcp-server-windows-x64.exe" --app desktop`
  (Pencil 데스크톱 앱 실행 중이어야 연결됨. 스크린샷 렌더가 늦게 반영될 수 있음 — 데이터 판정은 `batch_get` 사용. 폰트는 Google Fonts만: 한글은 Noto Sans KR)
- 목업 주요 노드 id: 메인 화면 `ho0jO`, 컨텍스트 박스 `X2reZ`
