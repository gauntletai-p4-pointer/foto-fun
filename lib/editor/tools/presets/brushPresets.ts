import type { BrushSettings, BrushShape } from '../types/brush-types'

/**
 * Brush Preset System
 * Provides common brush presets similar to Photoshop
 */

export interface BrushPreset {
  id: string
  name: string
  category: 'basic' | 'artistic' | 'texture' | 'special'
  icon?: string
  settings: BrushSettings
  shape?: BrushShape
  thumbnail?: string
}

// Basic Brushes
export const BASIC_BRUSHES: BrushPreset[] = [
  {
    id: 'hard-round',
    name: 'Hard Round',
    category: 'basic',
    settings: {
      size: 10,
      hardness: 100,
      opacity: 100,
      flow: 100,
      spacing: 25,
      smoothing: 10,
      pressureSensitivity: {
        size: true,
        opacity: false,
        flow: false
      }
    }
  },
  {
    id: 'soft-round',
    name: 'Soft Round',
    category: 'basic',
    settings: {
      size: 20,
      hardness: 0,
      opacity: 100,
      flow: 100,
      spacing: 25,
      smoothing: 10,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: false
      }
    }
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    category: 'basic',
    settings: {
      size: 50,
      hardness: 0,
      opacity: 20,
      flow: 10,
      spacing: 10,
      smoothing: 20,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: true
      }
    }
  }
]

// Artistic Brushes
export const ARTISTIC_BRUSHES: BrushPreset[] = [
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'artistic',
    settings: {
      size: 30,
      hardness: 0,
      opacity: 50,
      flow: 30,
      spacing: 20,
      smoothing: 15,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: true
      }
    }
  },
  {
    id: 'oil-paint',
    name: 'Oil Paint',
    category: 'artistic',
    settings: {
      size: 25,
      hardness: 50,
      opacity: 80,
      flow: 90,
      spacing: 15,
      smoothing: 25,
      pressureSensitivity: {
        size: true,
        opacity: false,
        flow: true
      }
    }
  },
  {
    id: 'chalk',
    name: 'Chalk',
    category: 'artistic',
    settings: {
      size: 40,
      hardness: 80,
      opacity: 60,
      flow: 100,
      spacing: 30,
      smoothing: 5,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: false
      }
    }
  }
]

// Texture Brushes
export const TEXTURE_BRUSHES: BrushPreset[] = [
  {
    id: 'rough-texture',
    name: 'Rough Texture',
    category: 'texture',
    settings: {
      size: 35,
      hardness: 70,
      opacity: 70,
      flow: 80,
      spacing: 40,
      smoothing: 0,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: false
      }
    }
  },
  {
    id: 'splatter',
    name: 'Splatter',
    category: 'texture',
    settings: {
      size: 60,
      hardness: 100,
      opacity: 100,
      flow: 100,
      spacing: 100,
      smoothing: 0,
      pressureSensitivity: {
        size: false,
        opacity: true,
        flow: false
      }
    }
  }
]

// Special Effect Brushes
export const SPECIAL_BRUSHES: BrushPreset[] = [
  {
    id: 'glow',
    name: 'Glow Brush',
    category: 'special',
    settings: {
      size: 80,
      hardness: 0,
      opacity: 30,
      flow: 50,
      spacing: 5,
      smoothing: 30,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: false
      }
    }
  },
  {
    id: 'scatter',
    name: 'Scatter Brush',
    category: 'special',
    settings: {
      size: 15,
      hardness: 100,
      opacity: 100,
      flow: 100,
      spacing: 150,
      smoothing: 0,
      pressureSensitivity: {
        size: true,
        opacity: false,
        flow: false
      }
    }
  }
]

// All presets combined
export const ALL_BRUSH_PRESETS: BrushPreset[] = [
  ...BASIC_BRUSHES,
  ...ARTISTIC_BRUSHES,
  ...TEXTURE_BRUSHES,
  ...SPECIAL_BRUSHES
]

/**
 * Brush Preset Manager
 */
export class BrushPresetManager {
  private customPresets: BrushPreset[] = []
  
  /**
   * Get all presets (built-in + custom)
   */
  getAllPresets(): BrushPreset[] {
    return [...ALL_BRUSH_PRESETS, ...this.customPresets]
  }
  
  /**
   * Get presets by category
   */
  getPresetsByCategory(category: BrushPreset['category']): BrushPreset[] {
    return this.getAllPresets().filter(preset => preset.category === category)
  }
  
  /**
   * Get preset by ID
   */
  getPresetById(id: string): BrushPreset | undefined {
    return this.getAllPresets().find(preset => preset.id === id)
  }
  
  /**
   * Save custom preset
   */
  saveCustomPreset(preset: Omit<BrushPreset, 'id'>): BrushPreset {
    const newPreset: BrushPreset = {
      ...preset,
      id: `custom-${Date.now()}`
    }
    
    this.customPresets.push(newPreset)
    this.saveToLocalStorage()
    
    return newPreset
  }
  
  /**
   * Delete custom preset
   */
  deleteCustomPreset(id: string): boolean {
    const index = this.customPresets.findIndex(preset => preset.id === id)
    if (index !== -1) {
      this.customPresets.splice(index, 1)
      this.saveToLocalStorage()
      return true
    }
    return false
  }
  
  /**
   * Load custom presets from localStorage
   */
  loadCustomPresets(): void {
    try {
      const saved = localStorage.getItem('foto-fun-brush-presets')
      if (saved) {
        this.customPresets = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load custom brush presets:', error)
    }
  }
  
  /**
   * Save custom presets to localStorage
   */
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('foto-fun-brush-presets', JSON.stringify(this.customPresets))
    } catch (error) {
      console.error('Failed to save custom brush presets:', error)
    }
  }
  
  /**
   * Export presets to JSON
   */
  exportPresets(): string {
    return JSON.stringify(this.customPresets, null, 2)
  }
  
  /**
   * Import presets from JSON
   */
  importPresets(json: string): void {
    try {
      const presets = JSON.parse(json)
      if (Array.isArray(presets)) {
        this.customPresets = [...this.customPresets, ...presets]
        this.saveToLocalStorage()
      }
    } catch (error) {
      console.error('Failed to import brush presets:', error)
    }
  }
} 