"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { computeAccuracy } from "@/lib/mouse-accuracy-test/geometry"
import type { AccuracyResult, DrawPoint } from "@/types/mouse-accuracy-test"

const CANVAS_SIZE = 500

function errorToHsl(errorRatio: number): string {
  return `hsl(${Math.round((1 - errorRatio) * 120)}, 100%, 45%)`
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  size: number,
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
    // Gray trajectory while drawing
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

  // Ideal circle dashed overlay
  ctx.strokeStyle = "#3b82f6"
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(cx, cy, result.idealSize, 0, 2 * Math.PI)
  ctx.stroke()
  ctx.setLineDash([])
}

export function AccuracyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<DrawPoint[]>([])
  const [result, setResult] = useState<AccuracyResult | null>(null)

  const size = CANVAS_SIZE
  const center: DrawPoint = { x: size / 2, y: size / 2 }

  const redraw = useCallback(
    (points: DrawPoint[], res: AccuracyResult | null) => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      drawScene(ctx, size, points, res)
    },
    [size],
  )

  useEffect(() => {
    redraw([], null)
  }, [redraw])

  function getPoint(e: React.MouseEvent<HTMLCanvasElement>): DrawPoint {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pt = getPoint(e)
    drawingRef.current = true
    pointsRef.current = [pt]
    setResult(null)
    redraw([pt], null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const pt = getPoint(e)
    pointsRef.current = [...pointsRef.current, pt]
    redraw(pointsRef.current, null)
  }

  function handleMouseUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    const pts = pointsRef.current
    const res = computeAccuracy(pts, center, "circle")
    setResult(res)
    redraw(pts, res)
  }

  function handleReset() {
    pointsRef.current = []
    setResult(null)
    redraw([], null)
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

      {result && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl font-bold tabular-nums">
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
