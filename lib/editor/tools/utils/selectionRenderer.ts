import type { FabricObject, Canvas } from 'fabric'

export interface SelectionShape extends FabricObject {
  _animationFrame?: number
}

export function startMarchingAnts(shape: SelectionShape, canvas: Canvas): void {
  let dashOffset = 0
  
  const animate = () => {
    dashOffset = (dashOffset + 1) % 10
    shape.set('strokeDashOffset', -dashOffset)
    canvas.renderAll()
    shape._animationFrame = requestAnimationFrame(animate)
  }
  
  shape._animationFrame = requestAnimationFrame(animate)
}

export function stopMarchingAnts(shape: SelectionShape): void {
  if (shape._animationFrame) {
    cancelAnimationFrame(shape._animationFrame)
    delete shape._animationFrame
  }
}

export const selectionStyle = {
  fill: 'rgba(0, 0, 255, 0.1)',
  stroke: '#0066ff',
  strokeWidth: 1,
  strokeDashArray: [5, 5],
  selectable: false,
  evented: false,
  strokeUniform: true,
} 