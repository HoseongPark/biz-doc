# 02. 요구사항 (v1 범위)

> 상태: 합의됨 · 2026-07-23 스키마 개정(도메인 유형·비즈니스 로직·속성 구조) 반영

## 명세 스키마 (source of truth)

샘플: `document/sample/context/swing-session.yml`

```yaml
info:
  context:
    id: <uuid>
    name: 스윙 레코더 (Swing Recorder)
  audit:
    author: 박호성
    created-at: 2026-07-23 10:46:00
    updated-at: 2026-07-23 10:46:00

domain:
  <DomainKey>:                  # 영문 키 (예: SwingSession)
    meta:
      identity:
        id: <uuid>
        type: Root Aggregate    # Root Aggregate | Entity | Value | Stereotype
      name: 스윙 세션            # 한글 이름 (영문 표기는 도메인 키가 담당)
      description: <설명>
      audit: { author, created-at, updated-at }
    attributes:                 # 리스트 구조 (유형에 따라 없을 수 있음)
      - name: startTime         # 영문 속성명
        type: DateTime
        description: 시작 시간   # 한글 설명
    business-logic:
      - name: validateTime
        description: 시작 시간이 종료 시간보다 이전이어야 합니다.
    values:                     # Stereotype 전용: 열거형 상수 목록 (attributes 대신)
      - name: GOOD
        description: 좋은 스윙

relationships:
  - from: { context-id, domain-id }
    to: { context-id, domain-id }
    relationship: 포함됨
```

### 도메인 유형 (identity.type)

| 유형 | 특징 | UI 색상 |
|---|---|---|
| Root Aggregate | 속성 + 비즈니스 로직 | 파랑 (accent) |
| Entity | 속성 + 비즈니스 로직 | 초록 |
| Value | 값 객체(Value Object). 식별자 없이 속성 값으로 동일성을 판단, 불변이 원칙. 속성 중심 + 필요 시 검증 룰 | 보라 |
| Stereotype | Java의 enum과 같은 열거형. 속성 대신 `values`(상수 목록)를 가짐 | 주황 |

## v1 기능 범위

웹 UI(다이어그램 + 편집 패널)에서 다음 작업이 가능해야 한다.

### 컨텍스트 (Bounded Context)
- 생성 → 워크스페이스에 새 `.yml` 파일 생성
- 이름 수정
- 삭제 → 해당 `.yml` 파일 삭제

### 도메인 객체
- 생성(유형 선택 포함) / 수정 / 삭제
- 이름(한글), 설명, 유형(identity.type) 편집 — 영문 표기는 도메인 키(`<DomainKey>`)가 담당
- `identity.id`(UUID)와 `audit`(author, created-at, updated-at)은 앱이 자동 관리 (UI에서는 읽기 전용 표시)

### 속성 (attributes)
- 추가 / 수정 / 삭제
- 항목: 영문 이름(`name`) · 타입(`type`) · 한글 설명(`description`)

### 비즈니스 로직 (business-logic)
- 추가 / 수정 / 삭제
- 항목: 이름(`name`) · 설명(`description`)

### 열거 값 (values) — Stereotype 전용
- 추가 / 수정 / 삭제
- 항목: 상수 이름(`name`, 영문 대문자 관례) · 설명(`description`)

### 관계 (relationships)
- 연결 / 수정 / 삭제
- 다이어그램에서 노드 핸들을 드래그해 다른 노드에 연결하면 관계 생성
- 관계는 `context-id` + `domain-id` 쌍으로 표현되어 **파일(컨텍스트)을 넘나드는 관계** 표현 가능

## v1에서 제외 (이후 버전 후보)
- 검색
- 속성 타입 목록 관리 (타입 사전)
- 유효성 검증 고도화 (예: Stereotype은 attributes 없이 values만 갖는다 같은 유형별 규칙)
- 파일 감시(외부 수정 자동 반영) — v1은 수동 새로고침

## 비기능 요구사항
- **YAML 보존성**: 저장 시 키 순서를 보존해 Git diff를 최소화 (사람/LLM 가독성 유지)
- **캐시 없음**: 앱은 상태를 캐시하지 않고 파일을 직접 읽고 씀. 외부(IDE, LLM)에서 파일을 수정해도 새로고침으로 반영
- **쓰기 단위**: 수정 발생 시 해당 컨텍스트의 yml 파일 전체를 재직렬화하여 저장
