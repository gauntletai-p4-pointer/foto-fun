/**
 * Type mapping and migration utilities for Fabric.js to Konva transition
 * This file provides type aliases and conversion functions to help with gradual migration
 */

import type Konva from 'konva'
import type { CanvasObject, Point, Transform, Layer } from '@/lib/editor/canvas/types'

/**
 * Type guards for safe migration
 */
export function isFabricObject(obj: any): obj is { type: string; id?: string } {
  return obj && typeof obj.type === 'string' && typeof obj.toObject === 'function'
}

export function isKonvaNode(obj: any): obj is Konva.Node {
  return obj && typeof obj.nodeType === 'string' && typeof obj.getLayer === 'function'
}

export function isCanvasObject(obj: any): obj is CanvasObject {
  return obj && typeof obj.id === 'string' && typeof obj.type === 'string' && obj.node
}

/**
 * Conversion utilities
 */
export function fabricPointToKonva(point: { x: number; y: number }): Point {
  return { x: point.x, y: point.y }
}

export function fabricTransformToKonva(obj: any): Transform {
  return {
    x: obj.left || 0,
    y: obj.top || 0,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
    rotation: obj.angle || 0,
    skewX: obj.skewX || 0,
    skewY: obj.skewY || 0
  }
}

/**
 * Map Fabric object types to Konva/Canvas object types
 */
export const FABRIC_TO_CANVAS_TYPE_MAP: Record<string, CanvasObject['type']> = {
  'image': 'image',
  'text': 'text',
  'i-text': 'text',
  'textbox': 'text',
  'rect': 'shape',
  'circle': 'shape',
  'ellipse': 'shape',
  'polygon': 'shape',
  'path': 'path',
  'group': 'group'
}

/**
 * Convert Fabric blend mode to Konva global composite operation
 */
export function fabricBlendModeToKonva(mode: string): GlobalCompositeOperation {
  const modeMap: Record<string, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity'
  }
  return modeMap[mode] || 'source-over'
}

/**
 * Temporary polyfill for Fabric Canvas methods on CanvasManager
 * This allows gradual migration of components
 */
export interface FabricCanvasPolyfill {
  getActiveObjects(): CanvasObject[]
  getObjects(): CanvasObject[]
  renderAll(): void
  getWidth(): number
  getHeight(): number
  getPointer(e: Event): Point
  findTarget(e: Event): CanvasObject | null
  setActiveObject(obj: CanvasObject): void
  discardActiveObject(): void
  requestRenderAll(): void
}

/**
 * Create a Fabric-compatible wrapper around CanvasManager
 * This is a temporary measure for migration
 */
export function createFabricPolyfill(canvasManager: any): FabricCanvasPolyfill {
  return {
    getActiveObjects(): CanvasObject[] {
      const selection = canvasManager.state.selection
      if (selection?.type === 'objects') {
        return selection.objectIds
          .map((id: string) => canvasManager.findObject(id))
          .filter(Boolean) as CanvasObject[]
      }
      return []
    },
    
    getObjects(): CanvasObject[] {
      return canvasManager.state.layers.flatMap((layer: Layer) => layer.objects)
    },
    
    renderAll(): void {
      canvasManager.render()
    },
    
    getWidth(): number {
      return canvasManager.state.width
    },
    
    getHeight(): number {
      return canvasManager.state.height
    },
    
    getPointer(e: Event): Point {
      return canvasManager.getPointerPosition(e)
    },
    
    findTarget(e: Event): CanvasObject | null {
      const point = canvasManager.getPointerPosition(e)
      return canvasManager.getObjectAtPoint(point)
    },
    
    setActiveObject(obj: CanvasObject): void {
      canvasManager.selectObjects([obj.id])
    },
    
    discardActiveObject(): void {
      canvasManager.clearSelection()
    },
    
    requestRenderAll(): void {
      requestAnimationFrame(() => canvasManager.render())
    }
  }
}

/**
 * Migration error class for better debugging
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly fabricMethod?: string,
    public readonly suggestion?: string
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

/**
 * Helper to log migration warnings in development
 */
export function logMigrationWarning(
  component: string,
  issue: string,
  suggestion?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `[Konva Migration] ${component}: ${issue}`,
      suggestion ? `\nSuggestion: ${suggestion}` : ''
    )
  }
}