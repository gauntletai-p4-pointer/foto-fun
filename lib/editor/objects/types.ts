import type { BlendMode, Filter } from '@/lib/editor/canvas/types'
import type Konva from 'konva'

export interface Adjustment {
  id: string
  type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'curves' | 'levels' | 'exposure'
  params: Record<string, number | string | boolean>
  enabled: boolean
}

export interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'group' | 'verticalText'
  name: string
  
  // Layer association
  layerId?: string
  
  // Position & Transform
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scaleX: number
  scaleY: number
  
  // Optional combined transform for compatibility
  transform?: import('@/lib/editor/canvas/types').Transform
  
  // Stacking
  zIndex: number
  
  // Visual Properties
  opacity: number
  blendMode: BlendMode
  visible: boolean
  locked: boolean
  
  // Effects
  filters: Filter[]
  adjustments: Adjustment[]
  
  // Group-specific
  children?: string[] // Object IDs
  
  // Type-specific data
  data: ImageData | TextData | ShapeData
  
  // Konva node reference (managed by CanvasManager)
  node?: Konva.Node
  
  // Metadata for selections, effects, etc
  metadata?: {
    isEffectGroup?: boolean
    selection?: {
      type: 'lasso' | 'rectangle' | 'ellipse'
      mask?: ImageData
      bounds?: { x: number; y: number; width: number; height: number }
    }
    [key: string]: unknown
  }
}

export interface ImageData {
  src?: string
  naturalWidth: number
  naturalHeight: number
  element: HTMLImageElement | HTMLCanvasElement
}

export interface TextData {
  content: string
  font: string
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  // For vertical text
  direction?: 'horizontal' | 'vertical'
  // For text warp effects
  isWarped?: boolean
  warpStyle?: string | null
  bendAmount?: number
}

export interface ShapeData {
  type: 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'path'
  fill?: string
  stroke?: string
  strokeWidth?: number
  points?: Array<{ x: number; y: number }> // For polygon/path
  radius?: number // For rounded rectangles
  path?: string // SVG path string for path shapes
}

// Helper type for effect groups
export interface EffectGroup extends CanvasObject {
  type: 'group'
  metadata: {
    isEffectGroup: true
    originalObjectId: string
    effects: Array<{
      type: string
      objectId: string
    }>
  }
}

// Type guards
export function isImageObject(obj: CanvasObject): obj is CanvasObject & { data: ImageData } {
  return obj.type === 'image'
}

export function isTextObject(obj: CanvasObject): obj is CanvasObject & { data: TextData } {
  return obj.type === 'text'
}

export function isShapeObject(obj: CanvasObject): obj is CanvasObject & { data: ShapeData } {
  return obj.type === 'shape'
}

export function isGroupObject(obj: CanvasObject): obj is CanvasObject & { type: 'group' } {
  return obj.type === 'group'
}

export function isEffectGroup(obj: CanvasObject): obj is EffectGroup {
  return obj.type === 'group' && obj.metadata?.isEffectGroup === true
} 