# 컨텍스트 명세 — 도메인 유형별 포맷

> 기준 샘플: `document/sample/context/swing-session.yml`

컨텍스트 1개 = YAML 파일 1개. 최상위 키는 `info` / `domains` / `relationships` 3개다.

## 공통 구조

### info — 컨텍스트 메타데이터

```yaml
info:
  context:
    id: <uuid>            # 앱 자동 관리
    name: 스윙 레코더       # 한글 단순 문자열 (ko/en 맵 금지)
  audit:
    author: 박호성
    created-at: 2026-07-23 10:46:00
    updated-at: 2026-07-24 22:08:14
```

### domains — 도메인 목록 (리스트)

각 도메인은 리스트 항목이며, `id`와 `type`을 최상위에 두고 나머지 메타데이터는 `meta`에 담는다.

```yaml
domains:
  - id: <uuid>            # 앱 자동 관리, UI 읽기 전용
    type: AGGREGATE       # AGGREGATE | ENTITY | VALUE | STEREO | SERVICE
    meta:
      name: 스윙 세션      # 한글 이름
      description: <한글 설명>
      audit:              # 앱 자동 관리, UI 읽기 전용
        author: 박호성
        created-at: 2026-07-23 10:46:00
        updated-at: 2026-07-23 10:46:00
    # 이하 유형별 본문 섹션 (attributes / business-logic / values / operations)
```

## 유형별 포맷 (5종)

| type | 의미 | 본문 섹션 | UI 색상 |
|---|---|---|---|
| `AGGREGATE` | 루트 집합 (Root Aggregate) | `attributes` + `business-logic` | 파랑 `#4F63F6` |
| `ENTITY` | 엔터티 | `attributes` + `business-logic` | 초록 `#0E9F6E` |
| `VALUE` | 값 객체 | `attributes` + `business-logic`(검증 룰) | 보라 `#8B5CF6` |
| `STEREO` | 열거형 (Stereotype) | `values` (attributes 없음) | 주황 `#D97706` |
| `SERVICE` | 도메인 서비스 | `operations` (attributes 없음) | 청록 `#0891B2` |

### 1. AGGREGATE — 루트 집합

컨텍스트의 진입점이 되는 애그리거트 루트. 속성과 비즈니스 로직을 가진다.

```yaml
- id: <uuid>
  type: AGGREGATE
  meta:
    name: 스윙 세션
    description: 스윙 세션을 관리하는 루트 집합입니다.
    audit: { ... }
  attributes:
    - name: startTime          # 영문 속성명
      type: DateTime           # 타입
      description: 시작 시간    # 한글 설명
  business-logic:              # 용어 주의: business-rules 아님
    - name: validateTime
      description: 시작 시간이 종료 시간보다 이전이어야 합니다.
```

### 2. ENTITY — 엔터티

식별자를 갖는 도메인 객체. 포맷은 AGGREGATE와 동일 (`attributes` + `business-logic`).

```yaml
- id: <uuid>
  type: ENTITY
  meta:
    name: 스윙 레코더
    description: 스윙 세션을 기록하는 엔터티입니다.
    audit: { ... }
  attributes:
    - name: time
      type: DateTime
      description: 기록 시간
  business-logic:
    - name: checkTime
      description: 기록 시간이 세션 시작 시간보다 이후이어야 합니다.
```

### 3. VALUE — 값 객체

식별자 없이 속성 값으로 동일성을 판단하며 불변이 원칙. 속성 중심이며, 필요 시 `business-logic`에 검증 룰을 둔다.

```yaml
- id: <uuid>
  type: VALUE
  meta:
    name: 스윙 구간
    description: 스윙의 시작과 끝 시간을 나타내는 값 객체입니다.
    audit: { ... }
  attributes:
    - name: begin
      type: DateTime
      description: 구간 시작 시간
  business-logic:
    - name: validateInterval
      description: 구간 시작이 종료보다 이전이어야 합니다.
```

### 4. STEREO — 열거형

Java의 enum과 같은 열거형(Stereotype). `attributes` 대신 `values`(상수 목록)를 가진다. 상수 이름은 영문 대문자 관례.

```yaml
- id: <uuid>
  type: STEREO
  meta:
    name: 스윙 결과
    description: 스윙의 평가 결과를 나타내는 열거형입니다.
    audit: { ... }
  values:
    - name: GOOD               # 영문 대문자 관례
      description: 좋은 스윙
    - name: BAD
      description: 잘못된 스윙
```

### 5. SERVICE — 도메인 서비스

특정 객체 하나에 자연스럽게 속하지 않는, **2개 이상의 도메인에 걸친 로직**만 담는다. 단일 객체에 속할 수 있는 로직은 해당 객체의 `business-logic`에 둔다(빈약한 도메인 모델 방지). `attributes` 대신 `operations`를 가진다.

```yaml
- id: <uuid>
  type: SERVICE
  meta:
    name: 스윙 평가
    description: 세션의 스윙 기록을 평가해 스윙 결과를 산출하는 도메인 서비스입니다.
    audit: { ... }
  operations:
    - name: evaluate
      description: 스윙 세션의 기록들을 분석해 스윙 결과를 산출합니다.
      related-domains: [<도메인 uuid>, <도메인 uuid>]   # 관련 도메인 id 목록 (선택)
```

## relationships — 도메인 간 관계

`relationship`(한글 자유 서술: 포함됨, 사용함 등)을 먼저 쓰고, `from`/`to`는 `context-id` + `domain-id` 쌍으로 표현해 **파일(컨텍스트)을 넘나드는 관계**도 가능하다.

```yaml
relationships:
  - relationship: 포함됨
    from:
      context-id: <컨텍스트 uuid>
      domain-id: <도메인 uuid>
    to:
      context-id: <컨텍스트 uuid>
      domain-id: <도메인 uuid>
```

## 작성 규칙 요약

- **키 순서 보존** 필수 — Git diff 최소화와 LLM 가독성이 목적
- `id`(UUID)와 `audit`은 앱이 자동 관리하며 UI에서 읽기 전용
- 이름(`meta.name`, `info.context.name`)은 한글 단순 문자열
- 노드 좌표 등 뷰 설정은 명세 YAML이 아닌 워크스페이스 `.config/layout.json`에 저장
