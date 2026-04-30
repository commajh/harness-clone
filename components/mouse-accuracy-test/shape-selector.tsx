"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AccuracyCanvas } from "./accuracy-canvas"
import type { ShapeType } from "@/types/mouse-accuracy-test"

const SHAPES: { value: ShapeType; label: string }[] = [
  { value: "circle", label: "원" },
  { value: "square", label: "정사각형" },
  { value: "triangle", label: "정삼각형" },
]

export function ShapeSelector() {
  const [shape, setShape] = useState<ShapeType>("circle")

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {SHAPES.map(({ value, label }) => (
          <Button
            key={value}
            variant={shape === value ? "default" : "outline"}
            onClick={() => setShape(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <AccuracyCanvas shape={shape} />
    </div>
  )
}
