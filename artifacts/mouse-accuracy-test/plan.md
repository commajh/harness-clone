# Mouse Accuracy Test 구현 계획

## 아키텍처 결정

| 결정 | 선택 | 이유 |
|---|---|---|
| 페이지 위치 | `app/page.tsx` 교체 | 루트 URL(/)로 바로 접근 |
| 렌더링 전략 | 전체 Client Component (`'use client'`) | Canvas API, mouse 이벤트 — 브라우저 전용 |
| 정확도 알고리즘 | `lib/` 순수 함수 | 프레임워크 없이 단위 테스트 가능 |
| 도형 크기 기준 | 사용자 궤적 점들의 중심→평균 거리 | 크게/작게 그려도 동일 기준 적용 |
| 캔버스 크기 | 고정(CSS max-width + aspect-ratio 1:1) | 반응형 불필요(spec 제외) |

## 인프라 리소스

None

## 데이터 모델

### ShapeType
- `'circle' | 'square' | 'triangle'`

### DrawPoint
- `x: number`
- `y: number`

### ColoredPoint
- `x: number`
- `y: number`
- `errorRatio: number` — 0(완벽)~1(최대 오차), 색상 매핑에 사용

### AccuracyResult
- `score: number` — 0~100 (정수 아닌 소수점 포함)
- `coloredPoints: ColoredPoint[]`
- `idealSize: number` — 이상적 도형의 기준 크기(반지름 or 반변길이)

## 필요 스킬

| 스킬 | 적용 Task | 용도 |
|---|---|---|
| next-best-practices | Task 2 | `'use client'` 배치, RSC boundary |
| shadcn | Task 2, 4 | Button 컴포넌트 재사용 |

## 영향 받는 파일

| 파일 경로 | 변경 유형 | 관련 Task |
|---|---|---|
| `types/mouse-accuracy-test.ts` | New | Task 1 |
| `lib/mouse-accuracy-test/geometry.ts` | New | Task 1 |
| `lib/mouse-accuracy-test/geometry.test.ts` | New | Task 1 |
| `components/mouse-accuracy-test/accuracy-canvas.tsx` | New | Task 2 |
| `components/mouse-accuracy-test/accuracy-canvas.test.tsx` | New | Task 2 |
| `app/page.tsx` | Modify | Task 2 |
| `app/globals.css` | Modify | Task 2 (캔버스 cursor 스타일) |

## Tasks

### Task 1: 정확도 계산 순수 함수 (geometry lib)

- **담당 시나리오**: 불변 규칙 — 오차 비율은 도형 크기 대비 상대값 / 이상적 도형 크기 자동 결정
- **크기**: S (2 파일)
- **의존성**: None
- **참조**:
  - `artifacts/mouse-accuracy-test/spec.md` — 불변 규칙 섹션
- **구현 대상**:
  - `types/mouse-accuracy-test.ts` — ShapeType, DrawPoint, ColoredPoint, AccuracyResult
  - `lib/mouse-accuracy-test/geometry.ts`
    - `computeAccuracy(points: DrawPoint[], center: DrawPoint, shape: ShapeType): AccuracyResult`
    - 원: idealRadius = mean(dist(p, center)), errorRatio_i = clamp(|dist_i - idealRadius| / idealRadius, 0, 1)
    - 정사각형(방향 고정): idealHalfSide = mean(max(|px-cx|, |py-cy|)), errorRatio_i = |max(|px_i-cx|, |py_i-cy|) - idealHalfSide| / idealHalfSide
    - 정삼각형(꼭짓점 위 고정): circumradius = mean(dist(p, center)), 각 점의 이상적 삼각형 경계까지 최단 거리 / circumradius
    - score = clamp(100 - mean(errorRatio_i) * 100, 0, 100)
  - `lib/mouse-accuracy-test/geometry.test.ts`
- **수용 기준**:
  - [ ] 완벽한 원 위의 점들(오차 0) → score = 100
  - [ ] 원 반지름보다 2배 큰 반지름의 점들(50% 오차) → score ≤ 55 (평균 오차 ~50%)
  - [ ] 완벽한 정사각형 경계 위의 점들 → score = 100
  - [ ] 완벽한 정삼각형(꼭짓점 위) 경계 위의 점들 → score = 100
  - [ ] 점이 1개이거나 0개 → score = 0 또는 안전하게 처리(에러 없음)
  - [ ] coloredPoints 길이 = 입력 points 길이
  - [ ] errorRatio 모든 값이 0~1 범위
- **검증**: `bun run test -- geometry`

---

### Task 2: 캔버스 그리기 → 원 결과 표시 (Happy Path 수직 슬라이스)

- **담당 시나리오**: Scenario 1 (초기 상태 full), Scenario 2 (원 그리기 + 결과 full)
- **크기**: M (3 파일)
- **의존성**: Task 1 (geometry lib)
- **참조**:
  - next-best-practices — `'use client'` 배치
  - shadcn — Button 컴포넌트
  - `artifacts/mouse-accuracy-test/wireframe.html` — 레이아웃 참조
- **구현 대상**:
  - `components/mouse-accuracy-test/accuracy-canvas.tsx` — `'use client'`
    - 캔버스 중앙 기준 중심점(+) 표시
    - mousedown/mousemove로 DrawPoint[] 수집, 그리기 중 단색(회색) 궤적
    - mouseup 시: computeAccuracy 호출 → coloredPoints를 HSL(120→0) 스트로크로 캔버스 재렌더 + 이상적 원 dashed overlay
    - 현재: circle 모드만 구현
  - `components/mouse-accuracy-test/accuracy-canvas.test.tsx`
  - `app/page.tsx` — 기존 ComponentExample 제거, AccuracyCanvas 마운트
- **수용 기준**:
  - [ ] 페이지 로드 시 캔버스 중앙에 중심점(+)이 렌더된다
  - [ ] 페이지 새로고침 후 중심점(+)이 캔버스 정중앙에 표시된다
  - [ ] 페이지 로드 시 정확도 숫자가 없다
  - [ ] mousedown ~ mouseup 사이(그리기 중) 궤적은 단색으로만 표시되고 색상 피드백이 없다
  - [ ] mouseup 후 캔버스에 이상적 원 윤곽선이 나타난다
  - [ ] mouseup 후 궤적 위에 초록~붉은색 색상 피드백이 점진적으로 표시된다
  - [ ] mouseup 후 정확도 %가 표시된다 (0~100 숫자)
  - [ ] mouseup 후 "다시 시도" 버튼이 나타난다
  - [ ] mouseup 후 결과 화면에 색상 범례(정확/오차 작음/오차 큼)가 표시된다
  - [ ] "다시 시도" 클릭 시 정확도 숫자가 사라지고 캔버스가 초기화된다
  - [ ] "다시 시도" 클릭 후 중심점(+)이 유지된다
- **검증**:
  - `bun run test -- accuracy-canvas`
  - `bun run build`

---

### Checkpoint: Tasks 1-2 이후

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] `localhost:3000` 접속 → 캔버스 중심점 확인 → 원 그리기 → 색상 궤적 + 정확도 % 표시 end-to-end 동작

---

### Task 3: 정사각형 + 정삼각형 지원

- **담당 시나리오**: Scenario 3 (정사각형 방향 고정 full), Scenario 4 (정삼각형 방향 고정 full)
- **크기**: S (1 파일 수정)
- **의존성**: Task 2 (AccuracyCanvas 기반)
- **구현 대상**:
  - `components/mouse-accuracy-test/accuracy-canvas.tsx` 수정
    - shape prop 추가 (`ShapeType`)
    - mouseup 후 이상적 도형 오버레이: circle(원), rect(정사각형, 변 수평/수직), polygon(정삼각형, 꼭짓점 위)
    - 각 shape에 맞는 computeAccuracy 분기
- **수용 기준**:
  - [ ] shape="square" 시 mouseup 후 이상적 정사각형 윤곽선이 수평·수직 변으로 표시된다
  - [ ] shape="square" 시 mouseup 후 궤적 위에 초록~붉은색 색상 피드백이 표시된다
  - [ ] shape="triangle" 시 mouseup 후 이상적 정삼각형 윤곽선이 꼭짓점이 위를 향한 형태로 표시된다
  - [ ] shape="triangle" 시 mouseup 후 궤적 위에 초록~붉은색 색상 피드백이 표시된다
- **검증**: `bun run test -- accuracy-canvas`

---

### Task 4: 도형 선택 UI + 너무 작음 경고

- **담당 시나리오**: Scenario 5 (다시 시도 full), Scenario 6 (도형 변경 full), Scenario 7 (너무 작음 full)
- **크기**: S (1~2 파일 수정)
- **의존성**: Task 3
- **참조**:
  - shadcn — Button variant 활용
- **구현 대상**:
  - `app/page.tsx` 수정 — 도형 선택 상태(useState) + 버튼 3개(원/정사각형/정삼각형) + AccuracyCanvas에 shape prop 전달
  - `components/mouse-accuracy-test/accuracy-canvas.tsx` 수정
    - 최소 크기 검사: mouseup 시 mean(dist(p, center)) < 10px → "너무 작습니다. 더 크게 그려주세요" 표시, 자동 초기화
    - shape prop 변경 시 캔버스 초기화
- **수용 기준**:
  - [ ] 도형 버튼 3개(원/정사각형/정삼각형)가 표시된다, 원이 기본 선택
  - [ ] 선택된 도형 버튼이 시각적으로 구분된다 (active 상태)
  - [ ] 다른 도형 버튼 클릭 후 해당 버튼이 active 상태로 전환된다
  - [ ] 도형 변경 클릭 시 기존 궤적·오버레이·정확도가 사라진다
  - [ ] 도형 변경 후 중심점(+)이 유지된다
  - [ ] "다시 시도" 클릭 후 도형 선택 상태(원/정사각형/정삼각형)가 이전과 동일하게 유지된다
  - [ ] 반지름 10px 미만으로 그리면 "너무 작습니다. 더 크게 그려주세요"가 표시된다
  - [ ] 너무 작음 경고 후 정확도 숫자가 표시되지 않는다
  - [ ] 너무 작음 경고 후 바로 다시 그리기가 가능하다 (캔버스 자동 초기화)
- **검증**: `bun run test -- accuracy-canvas`

---

### Checkpoint: Tasks 3-4 이후 (최종)

- [ ] 모든 테스트 통과: `bun run test`
- [ ] 빌드 성공: `bun run build`
- [ ] E2E 스모크: `bun run test:e2e`
- [ ] Human review: 원/정사각형/정삼각형 각각 그린 후 색상 궤적이 직관적으로 보이는지, 정확도 %가 납득 가능한지 확인

---

## 미결정 항목

없음.
