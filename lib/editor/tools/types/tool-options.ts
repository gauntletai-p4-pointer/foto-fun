import { TOOL_IDS } from '@/constants'

/**
 * Type-safe tool options system
 * 
 * Provides compile-time type safety for tool options,
 * preventing runtime errors from mismatched types.
 */

// Base option types
export interface BaseOption<T> {
  value: T
  min?: number
  max?: number
  step?: number
  options?: Array<{ value: T; label: string; icon?: string }>
}

// Tool-specific option types
export interface BrightnessOptions {
  adjustment: BaseOption<number> & { min: -100; max: 100 }
}

export interface ContrastOptions {
  adjustment: BaseOption<number> & { min: -100; max: 100 }
}

export interface SaturationOptions {
  adjustment: BaseOption<number> & { min: -100; max: 100 }
}

export interface HueOptions {
  adjustment: BaseOption<number> & { min: -180; max: 180 }
}

export interface ExposureOptions {
  adjustment: BaseOption<number> & { min: -100; max: 100 }
}

export interface CropOptions {
  aspectRatio: BaseOption<string>
  showGuides: BaseOption<boolean>
}

export interface BrushOptions {
  color: BaseOption<string>
  size: BaseOption<number> & { min: 1; max: 100 }
  opacity: BaseOption<number> & { min: 0; max: 100 }
  hardness: BaseOption<number> & { min: 0; max: 100 }
  smoothing: BaseOption<boolean>
}

export interface MoveOptions {
  autoSelect: BaseOption<boolean>
  showTransform: BaseOption<boolean>
  alignmentGuides: BaseOption<boolean>
}

export interface MarqueeOptions {
  selectionMode: BaseOption<'new' | 'add' | 'subtract' | 'intersect'>
  feather: BaseOption<number> & { min: 0; max: 250 }
  antiAlias: BaseOption<boolean>
}

export interface MagicWandOptions {
  tolerance: BaseOption<number> & { min: 0; max: 255 }
  contiguous: BaseOption<boolean>
  selectionMode: BaseOption<'new' | 'add' | 'subtract' | 'intersect'>
}

export interface ZoomOptions {
  zoomStep: BaseOption<number> & { min: 10; max: 100 }
  animateZoom: BaseOption<boolean>
}

export interface RotateOptions {
  angle: BaseOption<number> & { min: -180; max: 180 }
  quickRotate: BaseOption<number | null>
}

export interface FlipOptions {
  flipAction: BaseOption<'horizontal' | 'vertical' | null>
}

export interface ResizeOptions {
  mode: BaseOption<'percentage' | 'absolute'>
  percentage: BaseOption<number> & { min: 10; max: 200 }
  width: BaseOption<number> & { min: 1; max: 4096 }
  height: BaseOption<number> & { min: 1; max: 4096 }
  maintainAspectRatio: BaseOption<boolean>
}

export interface BlurOptions {
  blur: BaseOption<number> & { min: 0; max: 100 }
}

export interface SharpenOptions {
  sharpen: BaseOption<number> & { min: 0; max: 100 }
}

export interface GrayscaleOptions {
  action: BaseOption<'toggle' | null>
}

export interface InvertOptions {
  action: BaseOption<'toggle' | null>
}

export interface TextOptions {
  fontFamily: BaseOption<string>
  fontSize: BaseOption<number> & { min: 8; max: 144 }
  color: BaseOption<string>
  alignment: BaseOption<'left' | 'center' | 'right' | 'justify'>
  bold: BaseOption<boolean>
  italic: BaseOption<boolean>
  underline: BaseOption<boolean>
}

export interface EyedropperOptions {
  sampleAllLayers: BaseOption<boolean>
}

export interface QuickSelectionOptions {
  brushSize: BaseOption<number> & { min: 5; max: 100 }
  tolerance: BaseOption<number> & { min: 0; max: 100 }
  autoExpand: BaseOption<boolean>
  edgeDetection: BaseOption<boolean>
}

export interface VintageEffectsOptions {
  effect: BaseOption<'brownie' | 'vintage-pinhole' | 'kodachrome' | 'technicolor' | 'polaroid'>
  intensity?: BaseOption<number> & { min: 0; max: 100 }
}

export interface ImageGenerationOptions {
  prompt: BaseOption<string>
  style?: BaseOption<string>
}

export interface LassoOptions {
  selectionMode: BaseOption<'new' | 'add' | 'subtract' | 'intersect'>
  feather: BaseOption<number> & { min: 0; max: 250 }
  antiAlias: BaseOption<boolean>
}

export type HandOptions = Record<string, never> // No options for hand tool

export interface EraserOptions {
  size: BaseOption<number> & { min: 1; max: 100 }
  opacity: BaseOption<number> & { min: 0; max: 100 }
}

// Complete tool options map
export interface ToolOptionsMap {
  [TOOL_IDS.BRIGHTNESS]: BrightnessOptions
  [TOOL_IDS.CONTRAST]: ContrastOptions
  [TOOL_IDS.SATURATION]: SaturationOptions
  [TOOL_IDS.HUE]: HueOptions
  [TOOL_IDS.EXPOSURE]: ExposureOptions
  [TOOL_IDS.CROP]: CropOptions
  [TOOL_IDS.BRUSH]: BrushOptions
  [TOOL_IDS.MOVE]: MoveOptions
  [TOOL_IDS.MARQUEE_RECT]: MarqueeOptions
  [TOOL_IDS.MARQUEE_ELLIPSE]: MarqueeOptions
  [TOOL_IDS.MAGIC_WAND]: MagicWandOptions
  [TOOL_IDS.ZOOM]: ZoomOptions
  [TOOL_IDS.ROTATE]: RotateOptions
  [TOOL_IDS.FLIP]: FlipOptions
  [TOOL_IDS.RESIZE]: ResizeOptions
  [TOOL_IDS.BLUR]: BlurOptions
  [TOOL_IDS.SHARPEN]: SharpenOptions
  [TOOL_IDS.GRAYSCALE]: GrayscaleOptions
  [TOOL_IDS.INVERT]: InvertOptions
  [TOOL_IDS.VINTAGE_EFFECTS]: VintageEffectsOptions
  [TOOL_IDS.TYPE_HORIZONTAL]: TextOptions
  [TOOL_IDS.TYPE_VERTICAL]: TextOptions
  [TOOL_IDS.TYPE_MASK]: TextOptions
  [TOOL_IDS.TYPE_ON_PATH]: TextOptions
  [TOOL_IDS.EYEDROPPER]: EyedropperOptions
  [TOOL_IDS.QUICK_SELECTION]: QuickSelectionOptions
  [TOOL_IDS.LASSO]: LassoOptions
  [TOOL_IDS.HAND]: HandOptions
  [TOOL_IDS.ERASER]: EraserOptions
  [TOOL_IDS.AI_IMAGE_GENERATION]: ImageGenerationOptions
}

// Type guards
export function hasToolOptions<T extends keyof ToolOptionsMap>(
  toolId: string
): toolId is T {
  return toolId in TOOL_IDS
}

// Get option value with type safety
export function getToolOptionValue<T extends keyof ToolOptionsMap>(
  toolId: T,
  optionKey: keyof ToolOptionsMap[T]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // This would be implemented by the store
  // Just showing the type signature here
  void toolId
  void optionKey
  return undefined
}

// Update option with type safety
export function updateToolOption<T extends keyof ToolOptionsMap>(
  toolId: T,
  optionKey: keyof ToolOptionsMap[T],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
): void {
  // This would be implemented by the store
  // Just showing the type signature here
  void toolId
  void optionKey
  void value
} 