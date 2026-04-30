export type ShapeType = "circle" | "square" | "triangle"

export interface DrawPoint {
  x: number
  y: number
}

export interface ColoredPoint extends DrawPoint {
  errorRatio: number
}

export interface AccuracyResult {
  score: number
  coloredPoints: ColoredPoint[]
  idealSize: number
}
