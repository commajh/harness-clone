import { describe, it, expect } from "vitest"
import { computeAccuracy } from "./geometry"
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

function triangleBoundaryPoints(center: DrawPoint, circumradius: number): DrawPoint[] {
  const r = circumradius
  const v0 = { x: center.x, y: center.y - r }
  const v1 = { x: center.x + (r * Math.sqrt(3)) / 2, y: center.y + r / 2 }
  const v2 = { x: center.x - (r * Math.sqrt(3)) / 2, y: center.y + r / 2 }
  const steps = 6
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
    const points = circlePoints(CENTER, 100)
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
  it("완벽한 정사각형 경계 위의 점들 → score = 100", () => {
    const points = squareBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "square")
    expect(result.score).toBeCloseTo(100, 0)
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
  it("완벽한 정삼각형(꼭짓점 위) 경계 위의 점들 → score = 100", () => {
    const points = triangleBoundaryPoints(CENTER, 100)
    const result = computeAccuracy(points, CENTER, "triangle")
    expect(result.score).toBeCloseTo(100, 1)
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
