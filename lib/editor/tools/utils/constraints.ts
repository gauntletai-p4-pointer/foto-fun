/**
 * Utility functions for handling tool constraints (Shift, Alt, etc.)
 */

export interface Point {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

/**
 * Constrain dimensions to maintain aspect ratio (for Shift key)
 */
export function constrainProportions(
  width: number,
  height: number
): Dimensions {
  const size = Math.max(Math.abs(width), Math.abs(height))
  return {
    width: width < 0 ? -size : size,
    height: height < 0 ? -size : size
  }
}

/**
 * Calculate dimensions when drawing from center (for Alt key)
 */
export function drawFromCenter(
  startPoint: Point,
  currentPoint: Point
): { position: Point; dimensions: Dimensions } {
  const width = Math.abs(currentPoint.x - startPoint.x) * 2
  const height = Math.abs(currentPoint.y - startPoint.y) * 2
  
  return {
    position: {
      x: startPoint.x - width / 2,
      y: startPoint.y - height / 2
    },
    dimensions: { width, height }
  }
}

/**
 * Constrain angle to specific increments (e.g., 45° for Shift key)
 */
export function constrainAngle(
  startPoint: Point,
  endPoint: Point,
  angleIncrement: number = 45
): Point {
  const dx = endPoint.x - startPoint.x
  const dy = endPoint.y - startPoint.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  
  // Round to nearest increment
  const constrainedAngle = Math.round(angle / angleIncrement) * angleIncrement
  const radians = constrainedAngle * (Math.PI / 180)
  
  // Calculate distance
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  return {
    x: startPoint.x + Math.cos(radians) * distance,
    y: startPoint.y + Math.sin(radians) * distance
  }
}

/**
 * Constrain point to horizontal or vertical line
 */
export function constrainToAxis(
  startPoint: Point,
  currentPoint: Point
): Point {
  const dx = Math.abs(currentPoint.x - startPoint.x)
  const dy = Math.abs(currentPoint.y - startPoint.y)
  
  if (dx > dy) {
    // Horizontal constraint
    return { x: currentPoint.x, y: startPoint.y }
  } else {
    // Vertical constraint
    return { x: startPoint.x, y: currentPoint.y }
  }
}

/**
 * Apply constraints based on keyboard modifiers
 */
export interface ConstraintOptions {
  shiftKey: boolean
  altKey: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

export function applyConstraints(
  startPoint: Point,
  currentPoint: Point,
  options: ConstraintOptions,
  constraintType: 'proportional' | 'angle' | 'axis' = 'proportional'
): { point: Point; fromCenter: boolean } {
  let point = currentPoint
  let fromCenter = false
  
  // Apply Shift constraint
  if (options.shiftKey) {
    switch (constraintType) {
      case 'proportional':
        const width = currentPoint.x - startPoint.x
        const height = currentPoint.y - startPoint.y
        const constrained = constrainProportions(width, height)
        point = {
          x: startPoint.x + constrained.width,
          y: startPoint.y + constrained.height
        }
        break
      case 'angle':
        point = constrainAngle(startPoint, currentPoint)
        break
      case 'axis':
        point = constrainToAxis(startPoint, currentPoint)
        break
    }
  }
  
  // Alt key indicates drawing from center
  if (options.altKey) {
    fromCenter = true
  }
  
  return { point, fromCenter }
}

/**
 * Calculate bounding box from two points
 */
export function getBoundingBox(
  point1: Point,
  point2: Point
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(point1.x, point2.x)
  const y = Math.min(point1.y, point2.y)
  const width = Math.abs(point2.x - point1.x)
  const height = Math.abs(point2.y - point1.y)
  
  return { x, y, width, height }
}

/**
 * Snap point to grid
 */
export function snapToGrid(
  point: Point,
  gridSize: number
): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

/**
 * Calculate distance between two points
 */
export function distance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x
  const dy = point2.y - point1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Interpolate between two points
 */
export function lerp(
  start: Point,
  end: Point,
  t: number
): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t
  }
} 