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

// CanvasObject is now defined in @/lib/editor/objects/types
// This old definition is removed to avoid conflicts

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
  objects: import('@/lib/editor/objects/types').CanvasObject[]
  
  // Parent layer for groups
  parentId?: string
  
  // Mask (if any)
  mask?: LayerMask
  
  // Non-destructive filter stack
  filterStack?: FilterStack
}

export type Selection = 
  | { type: 'rectangle'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'ellipse'; bounds: Rect; feather: number; antiAlias: boolean }
  | { type: 'polygon'; points: Point[]; feather: number; antiAlias: boolean }
  | { type: 'freeform'; path: string; feather: number; antiAlias: boolean }
  | { type: 'pixel'; bounds: Rect; mask: ImageData }
  | { type: 'objects'; objectIds: string[] } // Add object-based selection

export interface CanvasState {
  // Canvas (viewport) properties
  canvasWidth: number
  canvasHeight: number
  zoom: number
  pan: Point
  
  // Object properties (NO LAYERS!)
  objects: Map<string, import('@/lib/editor/objects/types').CanvasObject> // Object ID -> Object
  objectOrder: string[] // IDs in z-order
  selectedObjectIds: Set<string> // Selected object IDs
  pixelSelection?: Selection // Selection within object
  
  // UI state
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
  type: 'mousedown' | 'mousemove' | 'mouseup' | 'keydown' | 'keyup'
  point: Point // Canvas coordinates
  screenPoint: Point // Screen coordinates
  pressure: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
  button: number
  nativeEvent?: MouseEvent | KeyboardEvent
}

export interface Filter {
  id?: string
  name?: string
  type: 'brightness' | 'contrast' | 'blur' | 'grayscale' | 'sepia' | 'invert' | 
        'hue' | 'saturation' | 'pixelate' | 'noise' | 'emboss' | 'enhance' | 
        'sharpen' | 'brownie' | 'vintage-pinhole' | 'kodachrome' | 'technicolor' | 
        'polaroid' | 'custom'
  params: Record<string, number | string | boolean>
  apply?: (imageData: ImageData, params: Record<string, unknown>) => ImageData
}

/**
 * Layer mask for selective filter/adjustment application
 */
export interface LayerMask {
  type: 'alpha' | 'vector' | 'selection'
  enabled: boolean
  inverted: boolean
  opacity: number
  // Mask data - could be ImageData, Path2D, or Selection
  data: ImageData | Konva.Shape | Selection
  // Cached mask image for performance
  cachedMask?: HTMLCanvasElement
}

/**
 * Non-destructive filter stack for layers
 */
export interface FilterStack {
  filters: FilterInstance[]
  enabled: boolean
  opacity: number
  blendMode: BlendMode
  // Cached result for performance
  cachedResult?: HTMLCanvasElement
  isDirty: boolean
}

/**
 * Individual filter instance in a stack
 */
export interface FilterInstance {
  id: string
  filter: Filter
  enabled: boolean
  opacity: number
  blendMode?: BlendMode
  mask?: LayerMask
  // WebGL or Konva filter type
  engineType: 'webgl' | 'konva'
}

/**
 * Adjustment layer specific properties
 */
export interface AdjustmentLayerData {
  adjustmentType: 'brightness' | 'contrast' | 'curves' | 'levels' | 'hue-saturation' | 
                   'color-balance' | 'vibrance' | 'exposure' | 'custom'
  settings: Record<string, unknown>
  // Which layers this adjustment affects
  affectsLayers?: string[] // If not specified, affects all layers below
}

export interface CanvasManager {
  // State
  state: CanvasState
  
  // Konva access
  stage: Konva.Stage
  contentLayer: Konva.Layer
  
  // Initialization
  initialize?(): Promise<void>
  
  // Object operations
  addObject(object: Partial<import('@/lib/editor/objects/types').CanvasObject>): Promise<string>
  removeObject(objectId: string): Promise<void>
  updateObject(objectId: string, updates: Partial<import('@/lib/editor/objects/types').CanvasObject>): Promise<void>
  getObject(objectId: string): import('@/lib/editor/objects/types').CanvasObject | null
  getAllObjects(): import('@/lib/editor/objects/types').CanvasObject[]
  findObject(id: string): import('@/lib/editor/objects/types').CanvasObject | null
  
  // Selection operations
  setSelection(selection: Selection | null): void
  selectAll(): void
  deselectAll(): void
  selectObject(objectId: string): void
  selectMultiple(objectIds: string[]): void
  selectObjects(objectIds: string[]): void
  clearSelection(): void
  getSelectedObjects(): import('@/lib/editor/objects/types').CanvasObject[]
  getSelectionManager(): SelectionManager
  
  // Object ordering operations
  getObjectOrder(): string[]
  setObjectOrder(ids: string[]): void
  bringObjectToFront(id: string): void
  sendObjectToBack(id: string): void
  bringObjectForward(id: string): void
  sendObjectBackward(id: string): void
  
  // Pixel operations
  getImageData(rect?: Rect): ImageData
  putImageData(imageData: ImageData, point: Point): void
  
  // Filter operations
  applyFilter(filter: Filter, targetIds?: string[]): Promise<void>
  removeFilter(filterId: string, targetIds?: string[]): Promise<void>
  getFilterManager?(): unknown
  
  // Transform operations
  resize(width: number, height: number): Promise<void>
  updateViewport(): void
  crop(rect: Rect): Promise<void>
  rotate(angle: number, targetIds?: string[]): Promise<void>
  flip(direction: 'horizontal' | 'vertical', targetIds?: string[]): Promise<void>
  
  // View operations
  setZoom(zoom: number): void
  setPan(pan: Point): void
  fitToScreen(): void
  setDraggable(draggable: boolean): void
  getWidth(): number
  getHeight(): number
  
  // Object finding
  getObjectAtPoint(point: Point): import('@/lib/editor/objects/types').CanvasObject | null
  getObjectsInBounds(bounds: Rect): import('@/lib/editor/objects/types').CanvasObject[]
  
  // Konva node access
  getNode(objectId: string): Konva.Node | null
  
  // Rendering
  render(): void
  renderAll(): void
  
  // Export
  exportImage(format?: 'png' | 'jpeg' | 'webp'): Promise<Blob>
  toDataURL(format?: string, quality?: number): string
  
  // Utility
  loadImage(src: string): Promise<string>
  destroy(): void
  
  // Events
  on?(event: string, handler: (...args: unknown[]) => void): void
  off?(event: string, handler: (...args: unknown[]) => void): void
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

// Type alias for cleaner references
type CanvasObjectType = import('@/lib/editor/objects/types').CanvasObject

// Serialization helpers
export type SerializedCanvasObject = Omit<CanvasObjectType, 'node'> & {
  node?: undefined
}

export function serializeCanvasObject(obj: CanvasObjectType): SerializedCanvasObject {
  // Remove any Konva node references for serialization
  const { ...rest } = obj
  return rest as SerializedCanvasObject
}

export function serializeCanvasObjects(objects: CanvasObjectType[]): SerializedCanvasObject[] {
  return objects.map(serializeCanvasObject)
}

// Type guards for data unions
export function isImageData(data: CanvasObjectType['data']): data is import('@/lib/editor/objects/types').ImageData {
  return data && typeof data === 'object' && 'element' in data
}

export function isStringData(data: CanvasObjectType['data']): data is import('@/lib/editor/objects/types').TextData {
  return data && typeof data === 'object' && 'content' in data
}

export function isRecordData(data: CanvasObjectType['data']): data is import('@/lib/editor/objects/types').ShapeData {
  return data && typeof data === 'object' && 'type' in data
}

// Helper to get typed metadata
export function getTypedMetadata(obj: CanvasObjectType): TypedMetadata {
  return (obj.metadata || {}) as TypedMetadata
}

// Helper to safely access metadata values
export function getMetadataValue<T extends MetadataValue>(
  obj: CanvasObjectType,
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

// Legacy canvas context - REMOVED: Use @/lib/ai/canvas/CanvasContext instead

export interface ToolContext {
  canvas: CanvasManager
  selection?: Selection
} 