# 03. 아키텍처 및 프로젝트 구조

> 상태: 합의됨

## 접근 방식

React + Vite + TypeScript 프론트엔드를 **Tauri** 셸에 담은 로컬 데스크톱 앱.
서버 프로세스 없음 — 파일 접근은 Tauri 플러그인을 통해 프론트에서 직접 수행.

## 프로젝트 구조

```
biz-doc/                            # Tauri 앱 프로젝트 (리포 루트에 구성)
├── src/                            # React + Vite (TypeScript)
│   ├── App.tsx
│   ├── workspace/
│   │   ├── useWorkspace.ts         # 워크스페이스 열기 / 최근 경로 기억
│   │   ├── yamlStore.ts            # yml 읽기/쓰기 (yaml 패키지, 키 순서 보존)
│   │   └── schema.ts               # 명세 스키마 타입 + zod 검증
│   ├── components/
│   │   ├── ContextMap.tsx          # React Flow 다이어그램 (메인 뷰)
│   │   ├── nodes/                  # 컨텍스트 그룹 노드, 도메인 노드
│   │   └── panels/                 # 상세 편집 패널 (도메인/속성/관계 폼)
│   └── types.ts
├── src-tauri/                      # Tauri 셸 (Rust — 기본 생성 상태 유지)
│   ├── tauri.conf.json             # fs / dialog 플러그인 권한 설정
│   └── src/main.rs
└── package.json                    # npm run tauri dev
```

## 워크스페이스 규약

이 도구로 여는 대상 폴더의 구조:

```
<워크스페이스>/
├── context/*.yml        # 명세 원본 (컨텍스트 1개 = 파일 1개)
└── .config/
    └── layout.json      # 노드 좌표 등 뷰 설정 (명세와 분리)
```

- 개발 중에는 이 리포의 `document/sample`를 워크스페이스로 열어 샘플로 테스트
- 최근 워크스페이스 경로는 앱 자체 설정(Tauri app config 디렉터리)에 저장, 실행 시 자동 오픈

## 핵심 원칙

1. **Rust는 셸만**: 파일 접근은 Tauri `fs`·`dialog` 플러그인을 TypeScript에서 호출.
   YAML 파싱/직렬화, 검증, 비즈니스 로직은 전부 TypeScript. Rust 코드는 초기 생성 상태 유지.
2. **파일이 진실의 원천**: 상태 캐시 없음. 수정 즉시 yml 저장. 외부 수정은 새로고침으로 반영.
3. **쓰기는 컨텍스트 파일 단위**: `yaml` 패키지로 키 순서를 보존해 Git diff 최소화.
4. **메타데이터 자동 관리**: `identity.id`(UUID)와 `audit`(author, `created-at`/`updated-at`)은 앱이 생성·갱신.

## 검토했다 기각한 대안

| 대안 | 기각 사유 |
|---|---|
| Vite + Express 웹 앱 | 서버 프로세스 관리 필요. "IDE처럼 파일을 다루는 로컬 도구" 성격에는 Tauri가 더 적합 |
| Next.js 풀스택 | 로컬 파일 편집 도구에 프레임워크가 과함 (SSR 등 미사용 기능 다수) |
| DB 저장 + YAML export | 파일이 진실의 원천이라는 목적(Git/LLM)과 상충 |
| 좌표를 YAML meta에 저장 | 명세에 뷰 정보가 섞여 LLM 컨텍스트/Git diff 오염 |
