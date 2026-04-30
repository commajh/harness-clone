import { describe, it, expect } from "vitest"
import { computeAccuracy, resampleByArcLength } from "./geometry"
import type { DrawPoint } from "@/types/mouse-accuracy-test"

const CENTER: DrawPoint = { x: 200, y: 200 }

function circlePoints(center: DrawPoint, radius: number, n = 16): DrawPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
  })
}

function squareBoundaryPoints(center: DrawPoint, halfSide: number): DrawPoint[] {
  const s = halfSide
  const cx = center.x
  const cy = center.y
  return [
    { x: cx - s, y: cy - s },
    { x: cx, y: cy - s },
    { x: cx + s, y: cy - s },
    { x: cx + s, y: cy },
    { x: cx + s, y: cy + s },
    { x: cx, y: cy + s },
    { x: cx - s, y: cy + s },
    { x: cx - s, y: cy },
  ]
}

// Generates n points per side (total 4n), providing dense angular coverage for completeness tests.
function denseSquareBoundaryPoints(center: DrawPoint, halfSide: number, n: number): DrawPoint[] {
  const s = halfSide
  const cx = center.x
  const cy = center.y
  const pts: DrawPoint[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    pts.push({ x: cx - s + t * 2 * s, y: cy - s })      // top
    pts.push({ x: cx + s, y: cy - s + t * 2 * s })      // right
    pts.push({ x: cx + s - t * 2 * s, y: cy + s })      // bottom
    pts.push({ x: cx - s, y: cy + s - t * 2 * s })      // left
  }
  return pts
}

function triangleBoundaryPoints(center: DrawPoint, circumradius: number, steps = 6): DrawPoint[] {
  const r = circumradius
  const v0 = { x: center.x, y: center.y - r }
  const v1 = { x: center.x + (r * Math.sqrt(3)) / 2, y: center.y + r / 2 }
  const v2 = { x: center.x - (r * Math.sqrt(3)) / 2, y: center.y + r / 2 }
  const points: DrawPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({ x: v0.x + t * (v1.x - v0.x), y: v0.y + t * (v1.y - v0.y) })
    points.push({ x: v1.x + t * (v2.x - v1.x), y: v1.y + t * (v2.y - v1.y) })
    points.push({ x: v2.x + t * (v0.x - v2.x), y: v2.y + t * (v0.y - v2.y) })
  }
  return points
}

describe("computeAccuracy — circle", () => {
  it("완벽한 원 위의 점들 → score = 100", () => {
    const points = circlePoints(CENTER, 100, 360)
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.score).toBeCloseTo(100, 0)
  })

  it("절반은 r=50, 절반은 r=150 (평균 100, 각 50% 오차) → score ≤ 55", () => {
    const inner = Array.from({ length: 5 }, (_, i) => ({
      x: CENTER.x + 50 * Math.cos((i * 2 * Math.PI) / 5),
      y: CENTER.y + 50 * Math.sin((i * 2 * Math.PI) / 5),
    }))
    const outer = Array.from({ length: 5 }, (_, i) => ({
      x: CENTER.x + 150 * Math.cos((i * 2 * Math.PI) / 5),
      y: CENTER.y + 150 * Math.sin((i * 2 * Math.PI) / 5),
    }))
    const result = computeAccuracy([...inner, ...outer], CENTER, "circle")
    expect(result.score).toBeLessThanOrEqual(55)
  })

  it("빈 points 배열 → score = 0, 에러 없음", () => {
    expect(() => computeAccuracy([], CENTER, "circle")).not.toThrow()
    expect(computeAccuracy([], CENTER, "circle").score).toBe(0)
  })

  it("점 1개 → score = 0, 에러 없음", () => {
    expect(computeAccuracy([CENTER], CENTER, "circle").score).toBe(0)
  })

  it("coloredPoints 길이 = 입력 points 길이", () => {
    const points = circlePoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.coloredPoints).toHaveLength(points.length)
  })

  it("모든 errorRatio가 0~1 범위", () => {
    const points = circlePoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "circle")
    for (const p of result.coloredPoints) {
      expect(p.errorRatio).toBeGreaterThanOrEqual(0)
      expect(p.errorRatio).toBeLessThanOrEqual(1)
    }
  })
})

describe("computeAccuracy — square", () => {
  it("완벽한 정사각형 경계 위의 점들 → score ≈ 100", () => {
    const points = denseSquareBoundaryPoints(CENTER, 100, 50)
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.score).toBeGreaterThan(99)
  })

  it("coloredPoints 길이 = 입력 points 길이", () => {
    const points = squareBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.coloredPoints).toHaveLength(points.length)
  })

  it("모든 errorRatio가 0~1 범위", () => {
    const points = squareBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "square")
    for (const p of result.coloredPoints) {
      expect(p.errorRatio).toBeGreaterThanOrEqual(0)
      expect(p.errorRatio).toBeLessThanOrEqual(1)
    }
  })
})

describe("computeAccuracy — triangle", () => {
  it("완벽한 정삼각형(꼭짓점 위) 경계 위의 점들 → score ≈ 100", () => {
    const points = triangleBoundaryPoints(CENTER, 100, 60)
    const result = computeAccuracy(points, CENTER, "triangle")
    expect(result.score).toBeGreaterThan(99)
  })

  it("coloredPoints 길이 = 입력 points 길이", () => {
    const points = triangleBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "triangle")
    expect(result.coloredPoints).toHaveLength(points.length)
  })

  it("모든 errorRatio가 0~1 범위", () => {
    const points = triangleBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "triangle")
    for (const p of result.coloredPoints) {
      expect(p.errorRatio).toBeGreaterThanOrEqual(0)
      expect(p.errorRatio).toBeLessThanOrEqual(1)
    }
  })
})

describe("resampleByArcLength", () => {
  it("직선 비균등 점들을 균등 간격으로 리샘플링한다", () => {
    // 원래: 0, 1, 100 (비균등) → 리샘플 3개: 0, 50, 100 (균등)
    const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 100, y: 0 }]
    const result = resampleByArcLength(pts, 3)
    expect(result).toHaveLength(3)
    expect(result[0].x).toBeCloseTo(0, 5)
    expect(result[1].x).toBeCloseTo(50, 0)
    expect(result[2].x).toBeCloseTo(100, 5)
  })

  it("완벽한 원을 비균등 샘플로 주면 균등 리샘플 후에도 score=100에 가깝다", () => {
    const r = 100
    const biasedPoints: DrawPoint[] = []
    // 상반원: 촘촘하게 (30개)
    for (let i = 0; i <= 30; i++) {
      const a = (Math.PI * i) / 30
      biasedPoints.push({ x: CENTER.x + r * Math.cos(a), y: CENTER.y + r * Math.sin(a) })
    }
    // 하반원: 성기게 (3개)
    for (let i = 1; i <= 3; i++) {
      const a = Math.PI + (Math.PI * i) / 3
      biasedPoints.push({ x: CENTER.x + r * Math.cos(a), y: CENTER.y + r * Math.sin(a) })
    }
    const resampled = resampleByArcLength(biasedPoints, 200)
    const result = computeAccuracy(resampled, CENTER, "circle")
    expect(result.score).toBeGreaterThan(90)
  })

  it("정확한 구간 과다 샘플링으로 부풀려진 score를 리샘플링이 교정한다", () => {
    // 상반원(정확, r=100): 31점 과다 샘플 → 오차 없는 점이 score를 지배
    // 하반원(오차, r=70): 10점 과소 샘플 → coverage 패널티는 비슷하게 유지하되 accuracy 편향이 유지됨
    const biasedPoints: DrawPoint[] = []
    for (let i = 0; i <= 30; i++) {
      const a = (Math.PI * i) / 30
      biasedPoints.push({ x: CENTER.x + 100 * Math.cos(a), y: CENTER.y + 100 * Math.sin(a) })
    }
    for (let i = 1; i <= 10; i++) {
      const a = Math.PI + (Math.PI * i) / 10
      biasedPoints.push({ x: CENTER.x + 70 * Math.cos(a), y: CENTER.y + 70 * Math.sin(a) })
    }
    const scoreBiased = computeAccuracy(biasedPoints, CENTER, "circle").score
    const scoreResampled = computeAccuracy(resampleByArcLength(biasedPoints, 200), CENTER, "circle").score
    // 과다 샘플된 정확 구간이 score를 부풀리므로, 리샘플 후 score가 낮아져야 함
    expect(scoreBiased).toBeGreaterThan(scoreResampled)
  })

  it("점이 2개 이하면 그대로 반환한다", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(resampleByArcLength(pts, 100)).toEqual(pts)
  })

  it("리샘플 결과 개수가 요청한 n과 같다", () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }]
    expect(resampleByArcLength(pts, 7)).toHaveLength(7)
  })

  it("총 호 길이가 0인 점들(모두 같은 위치)이면 그대로 반환한다", () => {
    const pts = [{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }]
    expect(resampleByArcLength(pts, 5)).toEqual(pts)
  })
})

describe("computeAccuracy — circle 완성도(angular coverage)", () => {
  it("완전한 원(360°) → score = 100", () => {
    const points = circlePoints(CENTER, 100, 360)
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.score).toBeCloseTo(100, 0)
  })

  it("완벽한 반원(180°) → score ≈ 50", () => {
    const points = Array.from({ length: 32 }, (_, i) => {
      const a = (Math.PI * i) / 31
      return { x: CENTER.x + 100 * Math.cos(a), y: CENTER.y + 100 * Math.sin(a) }
    })
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.score).toBeGreaterThan(40)
    expect(result.score).toBeLessThan(60)
  })

  it("완벽한 사분원(90°) → score ≈ 25", () => {
    const points = Array.from({ length: 32 }, (_, i) => {
      const a = (Math.PI / 2 * i) / 31
      return { x: CENTER.x + 100 * Math.cos(a), y: CENTER.y + 100 * Math.sin(a) }
    })
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.score).toBeGreaterThan(15)
    expect(result.score).toBeLessThan(35)
  })

  it("거의 완전한 원(350°) → score > 95", () => {
    const points = Array.from({ length: 64 }, (_, i) => {
      const a = (2 * Math.PI * 350 / 360) * i / 63
      return { x: CENTER.x + 100 * Math.cos(a), y: CENTER.y + 100 * Math.sin(a) }
    })
    const result = computeAccuracy(points, CENTER, "circle")
    expect(result.score).toBeGreaterThan(95)
  })

})

describe("computeAccuracy — square 완성도(angular coverage)", () => {
  it("완전한 정사각형(4변) → score > 99", () => {
    const points = denseSquareBoundaryPoints(CENTER, 100, 50)
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.score).toBeGreaterThan(99)
  })

  it("정사각형 한 변만 그리면 score ≈ 25", () => {
    // 윗변만: 각도 -135° ~ -45° → 완성도 90°/360° = 25%
    const points = denseSquareBoundaryPoints(CENTER, 100, 50).filter(
      (_, i) => i % 4 === 0, // top side only (every 4th starting from index 0)
    )
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.score).toBeCloseTo(25, 0)
  })

  it("정사각형 세 변(75%) → score ≈ 75", () => {
    // 윗변·오른쪽·아랫변: 각도 -135° ~ 135° → 완성도 270°/360° = 75%
    const points = denseSquareBoundaryPoints(CENTER, 100, 50).filter(
      (_, i) => i % 4 !== 3, // exclude left side (index % 4 === 3)
    )
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.score).toBeCloseTo(75, 0)
  })
})

describe("computeAccuracy — triangle 완성도(angular coverage)", () => {
  it("완전한 정삼각형 → score > 99", () => {
    const points = triangleBoundaryPoints(CENTER, 100, 60)
    const result = computeAccuracy(points, CENTER, "triangle")
    expect(result.score).toBeGreaterThan(99)
  })

  it("정삼각형 한 변만 그리면 score ≈ 33", () => {
    // v0→v1: -90° ~ 30° → 완성도 120°/360° = 33.3%
    const r = 100
    const v0 = { x: CENTER.x, y: CENTER.y - r }
    const v1 = { x: CENTER.x + (r * Math.sqrt(3)) / 2, y: CENTER.y + r / 2 }
    const n = 60
    const points = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1)
      return { x: v0.x + t * (v1.x - v0.x), y: v0.y + t * (v1.y - v0.y) }
    })
    const result = computeAccuracy(points, CENTER, "triangle")
    expect(result.score).toBeCloseTo(33, 0)
  })
})
