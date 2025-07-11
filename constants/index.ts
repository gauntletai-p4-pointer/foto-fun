// Zoom levels
export const ZOOM_LEVELS = [
  1, 5, 10, 25, 33, 50, 66, 100, 200, 300, 400, 500, 800, 1600, 3200
] as const

export const DEFAULT_ZOOM = 100
export const MIN_ZOOM = 1
export const MAX_ZOOM = 3200

// Document presets
export const DOCUMENT_PRESETS = {
  default: { width: 800, height: 600, resolution: 72 },
  photo: { width: 3000, height: 2000, resolution: 300 },
  print: { width: 2550, height: 3300, resolution: 300 }, // 8.5x11 at 300 DPI
  web: { width: 1920, height: 1080, resolution: 72 },
  mobile: { width: 375, height: 812, resolution: 72 },
} as const

// Aspect ratios for crop tool
export const ASPECT_RATIOS = {
  free: null,
  square: 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '5:7': 5 / 7,
} as const

// File size limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_DIMENSION = 8192 // Max width or height

// History
export const MAX_HISTORY_ENTRIES = 50

// Tool IDs
export const TOOL_IDS = {
  MOVE: 'move',
  MARQUEE_RECT: 'marquee-rect',
  MARQUEE_ELLIPSE: 'marquee-ellipse',
  LASSO: 'lasso',
  MAGIC_WAND: 'magic-wand',
  QUICK_SELECTION: 'quick-selection',
  CROP: 'crop',
  EYEDROPPER: 'eyedropper',
  HAND: 'hand',
  ZOOM: 'zoom',
  BRUSH: 'brush',
  CLONE_STAMP: 'clone-stamp',
  HEALING_BRUSH: 'healing-brush',
  ERASER: 'eraser',
  GRADIENT: 'gradient',
  TYPE_HORIZONTAL: 'type-horizontal',
  TYPE_VERTICAL: 'type-vertical',
  TYPE_MASK: 'type-mask',
  TYPE_ON_PATH: 'type-on-path',
  // Adjustment tools
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  SATURATION: 'saturation',
  HUE: 'hue',
  EXPOSURE: 'exposure',
  // Transform tools
  ROTATE: 'rotate',
  FLIP: 'flip',
  RESIZE: 'resize',
  // Filter tools
  BLUR: 'blur',
  SHARPEN: 'sharpen',
  GRAYSCALE: 'grayscale',
  INVERT: 'invert',
  VINTAGE_EFFECTS: 'vintage-effects',
  // AI-Native tools
  AI_IMAGE_GENERATION: 'ai-image-generation',
} as const

// Tool Groups
export const TOOL_GROUPS = {
  // Selection tools
  MARQUEE: [
    TOOL_IDS.MARQUEE_RECT, 
    TOOL_IDS.MARQUEE_ELLIPSE,
  ],
  LASSO: [
    TOOL_IDS.LASSO,
    // TODO: Polygonal Lasso, Magnetic Lasso
  ],
  QUICK_SELECTION: [
    TOOL_IDS.QUICK_SELECTION,
    TOOL_IDS.MAGIC_WAND,
  ],
  
  // Transform tools
  MOVE: [TOOL_IDS.MOVE],
  CROP: [
    TOOL_IDS.CROP,
    // TODO: Slice, Perspective Crop
  ],
  
  // Drawing tools
  BRUSH: [
    TOOL_IDS.BRUSH,
    // TODO: Pencil, Color Replacement, Mixer Brush
  ],
  CLONE: [
    TOOL_IDS.CLONE_STAMP,
    TOOL_IDS.HEALING_BRUSH,
    // TODO: Spot Healing, Patch Tool
  ],
  GRADIENT: [
    TOOL_IDS.GRADIENT,
    // TODO: Paint Bucket Tool
  ],
  ERASER: [
    TOOL_IDS.ERASER,
    // TODO: Background Eraser, Magic Eraser
  ],
  
  // Type tools
  TYPE: [
    TOOL_IDS.TYPE_HORIZONTAL,
    TOOL_IDS.TYPE_VERTICAL,
    TOOL_IDS.TYPE_MASK,
    TOOL_IDS.TYPE_ON_PATH,
  ],
  
  // Navigation tools
  NAV: [TOOL_IDS.HAND, TOOL_IDS.ZOOM],
  
  // Sampling tools
  EYEDROPPER: [
    TOOL_IDS.EYEDROPPER,
    // TODO: Color Sampler, Ruler, Note, Count
  ],
  
  // Adjustment tools (new group)
  ADJUSTMENTS: [
    TOOL_IDS.BRIGHTNESS,
    TOOL_IDS.CONTRAST,
    TOOL_IDS.HUE,
    TOOL_IDS.SATURATION,
    TOOL_IDS.EXPOSURE,
  ],
  
  // Filter tools (new group)
  FILTERS: [
    TOOL_IDS.BLUR,
    TOOL_IDS.SHARPEN,
    TOOL_IDS.GRAYSCALE,
    TOOL_IDS.INVERT,
    TOOL_IDS.VINTAGE_EFFECTS,
  ],
} as const 