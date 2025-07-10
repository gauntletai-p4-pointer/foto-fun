import type Konva from 'konva'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'

/**
 * Core canvas types for the new Konva-based architecture
 */

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface Transform {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  skewX: number
  skewY: number
}

export type BlendMode = 
  | 'normal'
  | 'multiply' 
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export interface CanvasObject {
  id: string
  type: 'image' | 'text' | 'shape' | 'path' | 'group' | 'verticalText'
  name?: string
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  transform: Transform
  node: Konva.Node // Konva node reference
  layerId: string
  // Additional data based on type
  data?: HTMLImageElement | string | Record<string, unknown> // Type-specific data
  filters?: Filter[]
  style?: Record<string, string | number | boolean>
  metadata?: Record<string, unknown>
}

export interface Layer {
  id: string
  name: string
  type: 'raster' | 'vector' | 'adjustment' | 'text' | 'group'
  visible: boolean
  locked: boolean
  opacity: number
  blendMode: BlendMode
  
  // Konva layer reference
  konvaLayer: Konva.Layer
  
  // Objects in this layer
  objects: CanvasObject[]
  
  // Parent layer for groups
  parentId?: string
  
  // Mask (if any)
  mask?: {
    type: 'alpha' | 'vector'
    data: ImageData | Konva.Shape
  }
}

export type Selection = 
  | { type: 'rectangle'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'ellipse'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'polygon'; points: Point[]; feather: number; antiAlias: boolean }
  | { type: 'freeform'; path: string; feather: number; antiAlias: boolean }
  | { type: 'pixel'; bounds: Rect; mask: ImageData }
  | { type: 'objects'; objectIds: string[] } // Add object-based selection

export interface CanvasState {
  width: number
  height: number
  zoom: number
  pan: Point
  layers: Layer[]
  selection: Selection | null
  activeLayerId: string | null
  backgroundColor: string
  isLoading: boolean
  canUndo: boolean
  canRedo: boolean
}

export interface Tool {
  id: string
  name: string
  icon: React.ComponentType
  cursor: string
  shortcut?: string
  
  // Tool lifecycle
  onActivate?(canvas: CanvasManager): void
  onDeactivate?(canvas: CanvasManager): void
  
  // Event handlers
  onMouseDown?(event: ToolEvent): void
  onMouseMove?(event: ToolEvent): void
  onMouseUp?(event: ToolEvent): void
  onKeyDown?(event: KeyboardEvent): void
  onKeyUp?(event: KeyboardEvent): void
}

export interface ToolEvent {
  point: Point // Canvas coordinates
  screenPoint: Point // Screen coordinates
  pressure: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  button: number
}

export interface Filter {
  id?: string
  name?: string
  type: 'brightness' | 'contrast' | 'blur' | 'grayscale' | 'sepia' | 'invert' | 
        'hue' | 'saturation' | 'pixelate' | 'noise' | 'emboss' | 'enhance' | 
        'sharpen' | 'custom'
  params: Record<string, number | string | boolean>
  apply?: (imageData: ImageData, params: Record<string, unknown>) => ImageData
}

export interface CanvasManager {
  // State
  state: CanvasState
  
  // Konva access
  konvaStage: Konva.Stage
  
  // Layer operations
  addLayer(layer: Partial<Layer>): Layer
  removeLayer(layerId: string): void
  setActiveLayer(layerId: string): void
  getActiveLayer(): Layer | null
  reorderLayers(fromIndex: number, toIndex: number): void
  
  // Object operations - now async for event emission
  addObject(object: Partial<CanvasObject>, layerId?: string): Promise<CanvasObject>
  removeObject(objectId: string): Promise<void>
  updateObject(objectId: string, updates: Partial<CanvasObject>): Promise<void>
  
  // Selection operations
  setSelection(selection: Selection | null): void
  selectAll(): void
  deselectAll(): void
  getSelectionManager(): SelectionManager
  
  // Pixel operations
  getImageData(rect?: Rect): ImageData
  putImageData(imageData: ImageData, point: Point): void
  applyFilter(filter: Filter, target?: CanvasObject | CanvasObject[]): Promise<void>
  
  // Transform operations
  resize(width: number, height: number): Promise<void>
  crop(rect: Rect): Promise<void>
  rotate(angle: number, target?: CanvasObject | CanvasObject[]): Promise<void>
  flip(direction: 'horizontal' | 'vertical', target?: CanvasObject | CanvasObject[]): Promise<void>
  
  // View operations
  setZoom(zoom: number): void
  setPan(pan: Point): void
  fitToScreen(): void
  
  // Object finding
  getObjectAtPoint(point: Point): CanvasObject | null
  
  // Export/Import
  exportImage(format: 'png' | 'jpeg' | 'webp'): Promise<Blob>
  loadImage(src: string): Promise<CanvasObject>
  
  // Lifecycle
  destroy(): void
} 

// Helper types for metadata access with proper typing
export type MetadataValue = string | number | boolean | Record<string, unknown> | unknown[] | undefined

export interface TypedMetadata {
  // Known metadata properties
  textEffects?: Record<string, unknown>
  filters?: Record<string, FilterParams>
  warpOptions?: Record<string, unknown>
  styles?: Record<string, unknown>
  leftIndent?: number
  rightIndent?: number
  firstLineIndent?: number
  justifyLastLine?: boolean
  wordSpacing?: string
  hyphenation?: boolean
  spaceBefore?: number
  spaceAfter?: number
  // Allow any other properties
  [key: string]: MetadataValue
}

// Filter params type
export interface FilterParams {
  value?: number
  amount?: number
  radius?: number
  size?: number
  strength?: number
  whiteLevel?: number
  direction?: string
  rotation?: number
}

// Serialization helpers
export type SerializedCanvasObject = Omit<CanvasObject, 'node'> & {
  node?: undefined
}

export function serializeCanvasObject(obj: CanvasObject): SerializedCanvasObject {
  const { node, ...rest } = obj
  return rest as SerializedCanvasObject
}

export function serializeCanvasObjects(objects: CanvasObject[]): SerializedCanvasObject[] {
  return objects.map(serializeCanvasObject)
}

// Type guards for data unions
export function isImageData(data: CanvasObject['data']): data is HTMLImageElement {
  return data instanceof HTMLImageElement
}

export function isStringData(data: CanvasObject['data']): data is string {
  return typeof data === 'string'
}

export function isRecordData(data: CanvasObject['data']): data is Record<string, unknown> {
  return data !== null && 
         data !== undefined && 
         typeof data === 'object' && 
         !(data instanceof HTMLImageElement) &&
         typeof data !== 'string'
}

// Helper to get typed metadata
export function getTypedMetadata(obj: CanvasObject): TypedMetadata {
  return (obj.metadata || {}) as TypedMetadata
}

// Helper to safely access metadata values
export function getMetadataValue<T extends MetadataValue>(
  obj: CanvasObject,
  key: keyof TypedMetadata,
  defaultValue: T
): T {
  const metadata = getTypedMetadata(obj)
  return (metadata[key] ?? defaultValue) as T
}

// Transform helpers
export interface PositionTransform extends Transform {
  position?: { x: number; y: number }
}

export function getTransformPosition(transform: Transform): { x: number; y: number } {
  return { x: transform.x, y: transform.y }
}

export function getTransformScale(transform: Transform): { x: number; y: number } {
  return { x: transform.scaleX, y: transform.scaleY }
}

// Canvas context type for AI operations
export interface CanvasContext {
  canvas: CanvasManager
  targetImages: CanvasObject[]
  targetingMode: 'all' | 'selected' | 'layer' | 'none' | 'auto-single'
  dimensions: {
    width: number
    height: number
  }
  selection: {
    type: 'none' | 'objects' | 'pixels'
    data?: unknown
  }
}

// Tool event types (missing from migration)
export interface ToolEvent {
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'keydown' | 'keyup'
  point: { x: number; y: number }
  nativeEvent?: MouseEvent | KeyboardEvent
  pressure: number
}

export interface ToolContext {
  canvas: CanvasManager
  selection?: Selection
} 