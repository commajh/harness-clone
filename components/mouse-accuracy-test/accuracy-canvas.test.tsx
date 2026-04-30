import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { AccuracyCanvas } from "./accuracy-canvas"

const mockCtx = {
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "",
}

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)
  // Simulate a 500×500 rendered canvas so CSS-scale = 1 and coordinates are 1:1
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    left: 0,
    top: 0,
    width: 500,
    height: 500,
  })
})

function drawOnCanvas(canvas: HTMLElement, points: { x: number; y: number }[]) {
  const [first, ...rest] = points
  fireEvent.mouseDown(canvas, { clientX: first.x, clientY: first.y })
  for (const p of rest) {
    fireEvent.mouseMove(canvas, { clientX: p.x, clientY: p.y })
  }
  fireEvent.mouseUp(canvas)
}

// Points well outside the 10px too-small threshold (center = 250,250)
const SAMPLE_POINTS = [
  { x: 350, y: 250 },
  { x: 250, y: 350 },
  { x: 150, y: 250 },
  { x: 250, y: 150 },
]

describe("AccuracyCanvas — 초기 상태", () => {
  it("정확도 숫자가 없다", () => {
    render(<AccuracyCanvas shape="circle" />)
    expect(screen.queryByTestId("score")).toBeNull()
  })

  it("다시 시도 버튼이 없다", () => {
    render(<AccuracyCanvas shape="circle" />)
    expect(screen.queryByRole("button", { name: /다시 시도/ })).toBeNull()
  })
})

describe("AccuracyCanvas — mouseup 후 결과 (circle)", () => {
  it("정확도 %가 표시된다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByTestId("score").textContent).toMatch(/^\d+%$/)
  })

  it("다시 시도 버튼이 나타난다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeTruthy()
  })

  it("색상 범례가 표시된다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByText("정확")).toBeTruthy()
    expect(screen.getByText("오차 작음")).toBeTruthy()
    expect(screen.getByText("오차 큼")).toBeTruthy()
  })
})

describe("AccuracyCanvas — mouseup 후 결과 (square)", () => {
  it("정확도 %가 표시된다", () => {
    render(<AccuracyCanvas shape="square" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByTestId("score").textContent).toMatch(/^\d+%$/)
  })

  it("다시 시도 버튼이 나타난다", () => {
    render(<AccuracyCanvas shape="square" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeTruthy()
  })
})

describe("AccuracyCanvas — mouseup 후 결과 (triangle)", () => {
  it("정확도 %가 표시된다", () => {
    render(<AccuracyCanvas shape="triangle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByTestId("score").textContent).toMatch(/^\d+%$/)
  })

  it("다시 시도 버튼이 나타난다", () => {
    render(<AccuracyCanvas shape="triangle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeTruthy()
  })
})

describe("AccuracyCanvas — 다시 시도", () => {
  it("클릭 시 정확도 숫자가 사라진다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }))
    expect(screen.queryByTestId("score")).toBeNull()
  })

  it("클릭 후 버튼이 사라진다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }))
    expect(screen.queryByRole("button", { name: /다시 시도/ })).toBeNull()
  })
})

describe("AccuracyCanvas — 너무 작음 경고", () => {
  it("중심 근처(< 10px)에서 그리면 경고 문구가 표시된다", () => {
    render(<AccuracyCanvas shape="circle" />)
    // center = 250,250; these points are ~1-2px away → meanDist < 10px
    drawOnCanvas(screen.getByLabelText("drawing canvas"), [
      { x: 251, y: 250 },
      { x: 250, y: 251 },
      { x: 249, y: 250 },
    ])
    expect(screen.getByText(/너무 작습니다/)).toBeTruthy()
  })

  it("너무 작음 경고 후 정확도 숫자가 표시되지 않는다", () => {
    render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), [
      { x: 251, y: 250 },
      { x: 250, y: 251 },
    ])
    expect(screen.queryByTestId("score")).toBeNull()
  })

  it("너무 작음 경고 후 바로 다시 그리기 가능하다(경고가 사라진다)", () => {
    render(<AccuracyCanvas shape="circle" />)
    const canvas = screen.getByLabelText("drawing canvas")
    drawOnCanvas(canvas, [{ x: 251, y: 250 }, { x: 250, y: 251 }])
    expect(screen.getByText(/너무 작습니다/)).toBeTruthy()
    fireEvent.mouseDown(canvas, { clientX: 350, clientY: 250 })
    expect(screen.queryByText(/너무 작습니다/)).toBeNull()
  })
})

describe("AccuracyCanvas — 엣지 케이스", () => {
  it("점 1개(mousedown+mouseup)도 에러 없이 처리된다", () => {
    render(<AccuracyCanvas shape="circle" />)
    const canvas = screen.getByLabelText("drawing canvas")
    fireEvent.mouseDown(canvas, { clientX: 350, clientY: 250 })
    expect(() => fireEvent.mouseUp(canvas)).not.toThrow()
  })

  it("shape prop 변경 시 결과가 초기화된다", () => {
    const { rerender } = render(<AccuracyCanvas shape="circle" />)
    drawOnCanvas(screen.getByLabelText("drawing canvas"), SAMPLE_POINTS)
    expect(screen.getByTestId("score")).toBeTruthy()
    rerender(<AccuracyCanvas shape="square" />)
    expect(screen.queryByTestId("score")).toBeNull()
  })
})
