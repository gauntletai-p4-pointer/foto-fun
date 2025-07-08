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
  CROP: 'crop',
  HAND: 'hand',
  ZOOM: 'zoom',
  BRUSH: 'brush',
  ERASER: 'eraser',
  TEXT: 'text',
} as const

// Tool Groups
export const TOOL_GROUPS = {
  SELECT: [TOOL_IDS.MARQUEE_RECT, TOOL_IDS.MARQUEE_ELLIPSE],
  MOVE: [TOOL_IDS.MOVE],
  CROP: [TOOL_IDS.CROP],
  NAV: [TOOL_IDS.HAND, TOOL_IDS.ZOOM],
} as const 