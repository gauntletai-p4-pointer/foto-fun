/**
 * Brush-related type definitions
 */

export interface BrushSettings {
  size: number // 1-1000 pixels
  hardness: number // 0-100%
  opacity: number // 0-100%
  flow: number // 0-100%
  spacing: number // 1-1000% of brush size
  smoothing: number // 0-100%
  pressureSensitivity: BrushDynamics['pressureSensitivity']
}

export interface BrushDynamics {
  pressureSensitivity: {
    size: boolean
    opacity: boolean
    flow: boolean
  }
  sizeDynamics?: {
    jitter: number // 0-100%
    minimumDiameter: number // 0-100%
  }
  angleDynamics?: {
    jitter: number // 0-100%
    control: 'off' | 'direction' | 'rotation' | 'tilt'
  }
  roundnessDynamics?: {
    jitter: number // 0-100%
    minimumRoundness: number // 0-100%
  }
}

export interface BrushShape {
  type: 'round' | 'square' | 'custom'
  angle: number // 0-360 degrees
  roundness: number // 0-100%
  flipX: boolean
  flipY: boolean
  customShape?: ImageData // For custom brush tips
}

export interface BrushPreset {
  id: string
  name: string
  category: 'general' | 'basic' | 'dry-media' | 'wet-media' | 'special-effects' | 'custom'
  settings: BrushSettings
  shape: BrushShape
  dynamics?: BrushDynamics
  icon?: string // Base64 or URL
}

export interface BrushStroke {
  points: Array<{
    x: number
    y: number
    pressure: number
    timestamp: number
  }>
  settings: BrushSettings
  color: string
  blendMode: GlobalCompositeOperation
} 