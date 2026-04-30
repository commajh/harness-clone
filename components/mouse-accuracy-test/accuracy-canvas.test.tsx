import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AccuracyCanvas } from "./accuracy-canvas"

const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "",
}

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)
})

function drawOnCanvas(canvas: HTMLElement, points: { x: number; y: number }[]) {
  const [first, ...rest] = points
  fireEvent.mouseDown(canvas, { clientX: first.x, clientY: first.y })
  for (const p of rest) {
    fireEvent.mouseMove(canvas, { clientX: p.x, clientY: p.y })
  }
  fireEvent.mouseUp(canvas)
}

describe("AccuracyCanvas", () => {
  it("초기 상태: 정확도 숫자가 없다", () => {
    render(<AccuracyCanvas />)
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it("초기 상태: 다시 시도 버튼이 없다", () => {
    render(<AccuracyCanvas />)
    expect(screen.queryByRole("button", { name: /다시 시도/ })).toBeNull()
  })

  it("mouseup 후 정확도 %가 표시된다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [
      { x: 100, y: 200 },
      { x: 150, y: 150 },
      { x: 200, y: 100 },
    ])
    expect(screen.getByText(/%/)).toBeTruthy()
  })

  it("mouseup 후 다시 시도 버튼이 나타난다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [
      { x: 100, y: 200 },
      { x: 150, y: 150 },
    ])
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeTruthy()
  })

  it("mouseup 후 색상 범례가 표시된다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [
      { x: 100, y: 200 },
      { x: 150, y: 150 },
    ])
    expect(screen.getByText("정확")).toBeTruthy()
    expect(screen.getByText("오차 작음")).toBeTruthy()
    expect(screen.getByText("오차 큼")).toBeTruthy()
  })

  it("다시 시도 클릭 시 정확도 숫자가 사라진다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [
      { x: 100, y: 200 },
      { x: 150, y: 150 },
    ])
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }))
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it("다시 시도 클릭 후 버튼이 사라진다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [
      { x: 100, y: 200 },
      { x: 150, y: 150 },
    ])
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }))
    expect(screen.queryByRole("button", { name: /다시 시도/ })).toBeNull()
  })

  it("점 1개(mousedown+mouseup, mousemove 없음)도 에러 없이 처리된다", () => {
    render(<AccuracyCanvas />)
    const canvas = screen.getByLabelText("drawing canvas")
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
    expect(() => fireEvent.mouseUp(canvas)).not.toThrow()
  })
})
