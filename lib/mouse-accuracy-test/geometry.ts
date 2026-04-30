import type { AccuracyResult, ColoredPoint, DrawPoint, ShapeType } from "@/types/mouse-accuracy-test"

function dist(a: DrawPoint, b: DrawPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function mean(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function distToSegment(p: DrawPoint, a: DrawPoint, b: DrawPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return dist(p, a)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

// Vertex at top (y points down in screen coords → top = -π/2)
const TRIANGLE_VERTEX_ANGLE = -Math.PI / 2

export function triangleVertices(center: DrawPoint, circumradius: number): [DrawPoint, DrawPoint, DrawPoint] {
  const r = circumradius
  return [
    { x: center.x, y: center.y - r },
    { x: center.x + (r * Math.sqrt(3)) / 2, y: center.y + r / 2 },
    { x: center.x - (r * Math.sqrt(3)) / 2, y: center.y + r / 2 },
  ]
}

// Polar boundary of equilateral triangle: r(θ) = cos(π/3) / cos(δ) * R
// where δ is the angle within the [-π/3, π/3] sector around the nearest vertex
function triangleNormalizedRadius(theta: number): number {
  const sector = (2 * Math.PI) / 3
  const delta = ((theta - TRIANGLE_VERTEX_ANGLE) % sector + sector) % sector - Math.PI / 3
  return Math.cos(Math.PI / 3) / Math.cos(delta)
}

function computeCircleAccuracy(points: DrawPoint[], center: DrawPoint): AccuracyResult {
  const dists = points.map((p) => dist(p, center))
  const idealRadius = mean(dists)
  const coloredPoints: ColoredPoint[] = points.map((p, i) => ({
    ...p,
    errorRatio: idealRadius === 0 ? 0 : clamp01(Math.abs(dists[i] - idealRadius) / idealRadius),
  }))
  const score = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio))) * 100
  return { score, coloredPoints, idealSize: idealRadius }
}

function computeSquareAccuracy(points: DrawPoint[], center: DrawPoint): AccuracyResult {
  const lInf = points.map((p) => Math.max(Math.abs(p.x - center.x), Math.abs(p.y - center.y)))
  const idealHalfSide = mean(lInf)
  const coloredPoints: ColoredPoint[] = points.map((p, i) => ({
    ...p,
    errorRatio:
      idealHalfSide === 0 ? 0 : clamp01(Math.abs(lInf[i] - idealHalfSide) / idealHalfSide),
  }))
  const score = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio))) * 100
  return { score, coloredPoints, idealSize: idealHalfSide }
}

// Uses polar approach: estimate circumradius per-angle, then compute error as
// |actualDist - idealDist| / idealDist. Perfect triangle → score = 100.
function computeTriangleAccuracy(points: DrawPoint[], center: DrawPoint): AccuracyResult {
  const dists = points.map((p) => dist(p, center))
  const thetas = points.map((p) => Math.atan2(p.y - center.y, p.x - center.x))
  const normRadii = thetas.map(triangleNormalizedRadius)

  // circumradius: per-point estimates averaged (robust to non-uniform sampling)
  const circumradius = mean(dists.map((d, i) => d / normRadii[i]))

  const coloredPoints: ColoredPoint[] = points.map((p, i) => {
    const idealDist = normRadii[i] * circumradius
    return {
      ...p,
      errorRatio: circumradius === 0 ? 0 : clamp01(Math.abs(dists[i] - idealDist) / idealDist),
    }
  })
  const score = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio))) * 100
  return { score, coloredPoints, idealSize: circumradius }
}

export function computeAccuracy(
  points: DrawPoint[],
  center: DrawPoint,
  shape: ShapeType,
): AccuracyResult {
  if (points.length === 0) return { score: 0, coloredPoints: [], idealSize: 0 }
  if (points.length === 1) return { score: 0, coloredPoints: [{ ...points[0], errorRatio: 1 }], idealSize: 0 }

  switch (shape) {
    case "circle":
      return computeCircleAccuracy(points, center)
    case "square":
      return computeSquareAccuracy(points, center)
    case "triangle":
      return computeTriangleAccuracy(points, center)
  }
}

