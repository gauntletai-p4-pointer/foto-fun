/**
 * Fabric to Konva Type Migration Utilities
 * 
 * This file provides type mappings and utilities to facilitate
 * the migration from Fabric.js to Konva while maintaining
 * type safety and architectural consistency.
 */

import type { CanvasObject, Point, Transform, CanvasManager } from '@/lib/editor/canvas/types'
import type Konva from 'konva'

/**
 * Legacy Fabric type mappings for migration
 * These should be gradually replaced with proper Konva types
 */
export type FabricObject = CanvasObject
export type Canvas = CanvasManager
export type FabricCanvas = CanvasManager

/**
 * Fabric-specific types that need migration
 */
export interface FabricPoint {
  x: number
  y: number
}

export interface FabricTransform {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  skewX: number
  skewY: number
  flipX: boolean
  flipY: boolean
}

/**
 * Pointer event mapping
 */
export interface TPointerEventInfo {
  e: MouseEvent | TouchEvent
  pointer: Point
  absolutePointer: Point
  target?: CanvasObject
  subTargets?: CanvasObject[]
  transform?: any
}

/**
 * Matrix type for transformations
 */
export type TMat2D = [number, number, number, number, number, number]

/**
 * Path type for Konva
 */
export interface Path {
  path: string
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  angle?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

/**
 * Text types for migration
 */
export interface IText {
  type: 'text'
  text: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: string
  textAlign?: string
  lineHeight?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface Textbox extends IText {
  width?: number
  height?: number
  splitByGrapheme?: boolean
}

/**
 * Image type for migration
 */
export interface FabricImage {
  type: 'image'
  src: string
  filters?: any[]
  applyFilters?: () => void
}

/**
 * Group and ActiveSelection for migration
 */
export interface Group {
  type: 'group'
  objects: CanvasObject[]
}

export interface ActiveSelection {
  type: 'activeSelection'
  objects: CanvasObject[]
}

/**
 * Shadow type
 */
export interface Shadow {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

/**
 * Gradient types
 */
export interface Gradient {
  type: 'linear' | 'radial'
  coords: {
    x1: number
    y1: number
    x2: number
    y2: number
    r1?: number
    r2?: number
  }
  colorStops: Array<{
    offset: number
    color: string
  }>
}

export interface Pattern {
  source: HTMLImageElement | HTMLCanvasElement
  repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
}

/**
 * Utility functions for type conversion
 */
export function fabricPointToKonva(point: FabricPoint): Point {
  return {
    x: point.x,
    y: point.y
  }
}

export function fabricTransformToKonva(transform: FabricTransform): Transform {
  return {
    x: transform.left,
    y: transform.top,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    rotation: transform.angle,
    skewX: transform.skewX,
    skewY: transform.skewY
  }
}

export function konvaTransformToFabric(transform: Transform): FabricTransform {
  return {
    left: transform.x,
    top: transform.y,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    angle: transform.rotation,
    skewX: transform.skewX,
    skewY: transform.skewY,
    flipX: false,
    flipY: false
  }
}

/**
 * Type guards for migration
 */
export function isFabricText(obj: any): obj is IText | Textbox {
  return obj && (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox')
}

export function isFabricImage(obj: any): obj is FabricImage {
  return obj && obj.type === 'image'
}

export function isFabricGroup(obj: any): obj is Group {
  return obj && obj.type === 'group'
}

export function isFabricActiveSelection(obj: any): obj is ActiveSelection {
  return obj && obj.type === 'activeSelection'
}

/**
 * Canvas compatibility layer
 */
export class CanvasCompatibilityLayer {
  constructor(private canvasManager: CanvasManager) {}
  
  getWidth(): number {
    return this.canvasManager.state.width
  }
  
  getHeight(): number {
    return this.canvasManager.state.height
  }
  
  getObjects(): CanvasObject[] {
    const objects: CanvasObject[] = []
    this.canvasManager.state.layers.forEach(layer => {
      objects.push(...layer.objects)
    })
    return objects
  }
  
  getActiveObjects(): CanvasObject[] {
    const selection = this.canvasManager.state.selection
    if (!selection || selection.type !== 'objects') return []
    
    const selectedObjects: CanvasObject[] = []
    selection.objectIds.forEach(id => {
      const obj = this.findObject(id)
      if (obj) selectedObjects.push(obj)
    })
    return selectedObjects
  }
  
  renderAll(): void {
    this.canvasManager.konvaStage.batchDraw()
  }
  
  private findObject(id: string): CanvasObject | null {
    for (const layer of this.canvasManager.state.layers) {
      const obj = layer.objects.find(o => o.id === id)
      if (obj) return obj
    }
    return null
  }
}

/**
 * Migration helpers
 */
export function migrateCanvasReference(canvas: any): CanvasManager {
  // Check if it has the expected CanvasManager properties
  if (canvas && 
      typeof canvas === 'object' && 
      'state' in canvas && 
      'konvaStage' in canvas &&
      typeof canvas.addObject === 'function') {
    return canvas as CanvasManager
  }
  throw new Error('Invalid canvas reference - must be CanvasManager')
}

export function migrateObjectReference(obj: any): CanvasObject {
  if (obj && typeof obj === 'object' && 'id' in obj && 'type' in obj) {
    return obj as CanvasObject
  }
  throw new Error('Invalid object reference - must be CanvasObject')
}