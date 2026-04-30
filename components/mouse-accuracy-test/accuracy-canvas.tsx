"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { computeAccuracy, triangleVertices } from "@/lib/mouse-accuracy-test/geometry"
import type { AccuracyResult, DrawPoint, ShapeType } from "@/types/mouse-accuracy-test"

const CANVAS_SIZE = 500
const MIN_RADIUS_PX = 10

function errorToHsl(errorRatio: number): string {
  return `hsl(${Math.round((1 - errorRatio) * 120)}, 100%, 45%)`
}

function meanDist(points: DrawPoint[], center: DrawPoint): number {
  if (points.length === 0) return 0
  const sum = points.reduce(
    (s, p) => s + Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2),
    0,
  )
  return sum / points.length
}

function drawIdealOverlay(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  cx: number,
  cy: number,
  idealSize: number,
) {
  ctx.strokeStyle = "#3b82f6"
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()

  if (shape === "circle") {
    ctx.arc(cx, cy, idealSize, 0, 2 * Math.PI)
  } else if (shape === "square") {
    const h = idealSize
    ctx.rect(cx - h, cy - h, h * 2, h * 2)
  } else {
    const [v0, v1, v2] = triangleVertices({ x: cx, y: cy }, idealSize)
    ctx.moveTo(v0.x, v0.y)
    ctx.lineTo(v1.x, v1.y)
    ctx.lineTo(v2.x, v2.y)
    ctx.closePath()
  }

  ctx.stroke()
  ctx.setLineDash([])
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  size: number,
  shape: ShapeType,
  points: DrawPoint[],
  result: AccuracyResult | null,
) {
  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2

  // Center crosshair
  ctx.strokeStyle = "#888"
  ctx.lineWidth = 1
  ctx.setLineDash([])
  const arm = 10
  ctx.beginPath()
  ctx.moveTo(cx - arm, cy)
  ctx.lineTo(cx + arm, cy)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, cy - arm)
  ctx.lineTo(cx, cy + arm)
  ctx.stroke()

  if (points.length < 2) return

  if (!result) {
    // Gray trajectory while drawing — no color feedback until mouseup
    ctx.strokeStyle = "#999"
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
    return
  }

  // Colored trajectory after mouseup
  const cp = result.coloredPoints
  for (let i = 1; i < cp.length; i++) {
    ctx.strokeStyle = errorToHsl(cp[i].errorRatio)
    ctx.lineWidth = 3
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(cp[i - 1].x, cp[i - 1].y)
    ctx.lineTo(cp[i].x, cp[i].y)
    ctx.stroke()
  }

  drawIdealOverlay(ctx, shape, cx, cy, result.idealSize)
}

interface AccuracyCanvasProps {
  shape: ShapeType
}

export function AccuracyCanvas({ shape }: AccuracyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<DrawPoint[]>([])
  const [result, setResult] = useState<AccuracyResult | null>(null)
  const [tooSmall, setTooSmall] = useState(false)

  const size = CANVAS_SIZE
  const center: DrawPoint = { x: size / 2, y: size / 2 }

  const redraw = useCallback(
    (points: DrawPoint[], res: AccuracyResult | null, currentShape: ShapeType) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      drawScene(ctx, size, currentShape, points, res)
    },
    [size],
  )

  // Reset canvas when shape changes
  useEffect(() => {
    drawingRef.current = false
    pointsRef.current = []
    setResult(null)
    setTooSmall(false)
    redraw([], null, shape)
  }, [shape, redraw])

  function getPoint(e: React.MouseEvent<HTMLCanvasElement>): DrawPoint {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pt = getPoint(e)
    drawingRef.current = true
    pointsRef.current = [pt]
    setResult(null)
    setTooSmall(false)
    redraw([pt], null, shape)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    pointsRef.current.push(getPoint(e))
    redraw(pointsRef.current, null, shape)
  }

  function handleMouseUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const pts = pointsRef.current
    if (meanDist(pts, center) < MIN_RADIUS_PX) {
      pointsRef.current = []
      setTooSmall(true)
      redraw([], null, shape)
      return
    }
    const res = computeAccuracy(pts, center, shape)
    setResult(res)
    redraw(pts, res, shape)
  }

  function handleReset() {
    pointsRef.current = []
    setResult(null)
    setTooSmall(false)
    redraw([], null, shape)
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border border-border rounded-lg cursor-crosshair max-w-full"
        style={{ aspectRatio: "1 / 1" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        aria-label="drawing canvas"
      />

      {tooSmall && (
        <p className="text-sm text-destructive">너무 작습니다. 더 크게 그려주세요</p>
      )}

      {result && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl font-bold tabular-nums" data-testid="score">
            {Math.round(result.score)}%
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-1.5 rounded" style={{ background: errorToHsl(0) }} />
              정확
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-1.5 rounded" style={{ background: errorToHsl(0.5) }} />
              오차 작음
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 h-1.5 rounded" style={{ background: errorToHsl(1) }} />
              오차 큼
            </span>
          </div>

          <Button onClick={handleReset}>다시 시도</Button>
        </div>
      )}
    </div>
  )
}
