import type { AccuracyResult, ColoredPoint, DrawPoint, ShapeType } from "@/types/mouse-accuracy-test"

function dist(a: DrawPoint, b: DrawPoint): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
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

// Returns the dimensionless boundary ratio r(θ)/R for an equilateral triangle.
// δ is the angle within the [-π/3, π/3] sector around the nearest vertex.
// Multiply the result by the circumradius to get the actual boundary distance.
function triangleNormalizedRadius(theta: number): number {
  const sector = (2 * Math.PI) / 3
  const delta = ((theta - TRIANGLE_VERTEX_ANGLE) % sector + sector) % sector - Math.PI / 3
  return Math.cos(Math.PI / 3) / Math.cos(delta)
}

// Fraction of 360° covered by the drawn points, measured by the largest angular gap.
// Full circle → 1.0, semicircle → ~0.5, quarter arc → ~0.25.
function angularCoverage(points: DrawPoint[], center: DrawPoint): number {
  if (points.length < 2) return 0
  const angles = points
    .map((p) => Math.atan2(p.y - center.y, p.x - center.x))
    .sort((a, b) => a - b)
  let maxGap = angles[0] + 2 * Math.PI - angles[angles.length - 1] // wrap-around gap
  for (let i = 1; i < angles.length; i++) {
    maxGap = Math.max(maxGap, angles[i] - angles[i - 1])
  }
  return Math.max(0, (2 * Math.PI - maxGap) / (2 * Math.PI))
}

function computeCircleAccuracy(points: DrawPoint[], center: DrawPoint): AccuracyResult {
  const dists = points.map((p) => dist(p, center))
  const idealRadius = mean(dists)
  const coloredPoints: ColoredPoint[] = points.map((p, i) => ({
    ...p,
    errorRatio: idealRadius === 0 ? 0 : clamp01(Math.abs(dists[i] - idealRadius) / idealRadius),
  }))
  const accuracy = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio)))
  const completeness = angularCoverage(points, center)
  const score = accuracy * completeness * 100
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
  const accuracy = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio)))
  const completeness = angularCoverage(points, center)
  const score = accuracy * completeness * 100
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
  const accuracy = clamp01(1 - mean(coloredPoints.map((p) => p.errorRatio)))
  const completeness = angularCoverage(points, center)
  const score = accuracy * completeness * 100
  return { score, coloredPoints, idealSize: circumradius }
}

/**
 * Resamples a polyline to n evenly-spaced points by arc length.
 * Eliminates score bias from variable mouse speed — slow sections no longer
 * dominate the mean errorRatio just because they have more raw samples.
 */
export function resampleByArcLength(points: DrawPoint[], n: number): DrawPoint[] {
  if (points.length <= 2) return points

  // Build cumulative arc-length table
  const arcLen: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    arcLen.push(arcLen[i - 1] + dist(points[i - 1], points[i]))
  }
  const totalLen = arcLen[arcLen.length - 1]
  if (totalLen === 0) return points

  const result: DrawPoint[] = []
  const step = totalLen / (n - 1)
  let j = 0

  for (let i = 0; i < n; i++) {
    const target = i * step
    // Advance segment pointer until the next arc-length exceeds target
    while (j < arcLen.length - 2 && arcLen[j + 1] < target) j++
    const segLen = arcLen[j + 1] - arcLen[j]
    const t = segLen === 0 ? 0 : (target - arcLen[j]) / segLen
    result.push({
      x: points[j].x + t * (points[j + 1].x - points[j].x),
      y: points[j].y + t * (points[j + 1].y - points[j].y),
    })
  }

  return result
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
