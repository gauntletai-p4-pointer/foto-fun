// Tool IDs - centralized constants for tool identification
export const TOOL_IDS = {
  // Navigation tools
  HAND: 'hand',
  ZOOM: 'zoom',
  EYEDROPPER: 'eyedropper',
  
  // Selection tools
  MARQUEE_RECT: 'marquee-rect',
  MARQUEE_ELLIPSE: 'marquee-ellipse',
  LASSO: 'lasso',
  MAGIC_WAND: 'magic-wand',
  QUICK_SELECTION: 'quick-selection',
  
  // Transform tools
  MOVE: 'move',
  CROP: 'crop',
  ROTATE: 'rotate',
  FLIP: 'flip',
  RESIZE: 'resize',
  
  // Drawing tools
  BRUSH: 'brush',
  ERASER: 'eraser',
  GRADIENT: 'gradient',
  
  // Shape tools
  FRAME: 'frame',
  
  // Text tools
  HORIZONTAL_TYPE: 'horizontal-type',
  VERTICAL_TYPE: 'vertical-type',
  TYPE_MASK: 'type-mask',
  TYPE_ON_PATH: 'type-on-path',
  
  // Adjustment tools
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  SATURATION: 'saturation',
  HUE: 'hue',
  EXPOSURE: 'exposure',
  
  // Filter tools
  BLUR: 'blur',
  SHARPEN: 'sharpen',
  GRAYSCALE: 'grayscale',
  INVERT: 'invert',
  VINTAGE_EFFECTS: 'vintage-effects'
} as const

// Canvas configuration
export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 1920,
  DEFAULT_HEIGHT: 1080,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.1
} as const

// File handling configuration
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB 