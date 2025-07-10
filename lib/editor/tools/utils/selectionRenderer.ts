import Konva from 'konva'

export interface SelectionShape {
  node: Konva.Shape
  animation?: Konva.Animation
}

/**
 * Start marching ants animation for selection shapes
 */
export function startMarchingAnts(shape: SelectionShape, layer: Konva.Layer): void {
  let dashOffset = 0
  
  // Create animation
  shape.animation = new Konva.Animation((frame) => {
    if (frame) {
      dashOffset = (frame.time / 50) % 10
      shape.node.dashOffset(-dashOffset)
    }
  }, layer)
  
  shape.animation.start()
}

/**
 * Stop marching ants animation
 */
export function stopMarchingAnts(shape: SelectionShape): void {
  if (shape.animation) {
    shape.animation.stop()
    shape.animation = undefined
  }
}

/**
 * Default selection style for Konva shapes
 */
export const selectionStyle = {
  fill: 'rgba(0, 0, 255, 0.1)',
  stroke: '#0066ff',
  strokeWidth: 1,
  dash: [5, 5],
  listening: false, // Konva equivalent of non-selectable
  draggable: false,
}

/**
 * Create a selection rectangle
 */
export function createSelectionRect(
  x: number,
  y: number,
  width: number,
  height: number
): Konva.Rect {
  return new Konva.Rect({
    x,
    y,
    width,
    height,
    ...selectionStyle
  })
}

/**
 * Create a selection ellipse
 */
export function createSelectionEllipse(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number
): Konva.Ellipse {
  return new Konva.Ellipse({
    x,
    y,
    radiusX,
    radiusY,
    ...selectionStyle
  })
}

/**
 * Create a selection path (for lasso/freeform)
 */
export function createSelectionPath(data: string): Konva.Path {
  return new Konva.Path({
    data,
    ...selectionStyle
  })
} 