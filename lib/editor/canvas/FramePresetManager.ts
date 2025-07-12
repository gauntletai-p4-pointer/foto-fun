import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Frame preset definition
 */
export interface FramePreset {
  id: string
  name: string
  category: 'social' | 'print' | 'web' | 'document' | 'custom'
  dimensions: {
    width: number
    height: number
  }
  dpi?: number
  description?: string
  style?: {
    fill?: string
    stroke?: {
      color: string
      width: number
      style: 'solid' | 'dashed'
    }
    background?: {
      color: string
      opacity: number
    }
  }
  export?: {
    format: 'png' | 'jpeg' | 'webp'
    quality: number
    dpi: number
  }
  metadata?: {
    isBuiltIn: boolean
    createdAt: number
    updatedAt: number
  }
}

/**
 * Frame Preset Manager
 * Manages built-in and custom frame presets with proper DI and event system
 */
export class FramePresetManager {
  private builtInPresets: Map<string, FramePreset> = new Map()
  private customPresets: Map<string, FramePreset> = new Map()
  private eventBus: TypedEventBus

  constructor(eventBus: TypedEventBus) {
    this.eventBus = eventBus
    this.initializeBuiltInPresets()
  }

  /**
   * Initialize built-in presets
   */
  private initializeBuiltInPresets(): void {
    const builtInPresets: FramePreset[] = [
      // Social Media Presets
      {
        id: 'instagram-post',
        name: 'Instagram Post',
        category: 'social',
        dimensions: { width: 1080, height: 1080 },
        dpi: 72,
        description: 'Square format for Instagram posts',
        style: {
          fill: 'transparent',
          stroke: { color: '#E1306C', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.9, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'instagram-story',
        name: 'Instagram Story',
        category: 'social',
        dimensions: { width: 1080, height: 1920 },
        dpi: 72,
        description: 'Vertical format for Instagram stories',
        style: {
          fill: 'transparent',
          stroke: { color: '#E1306C', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.9, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'twitter-post',
        name: 'Twitter Post',
        category: 'social',
        dimensions: { width: 1200, height: 675 },
        dpi: 72,
        description: 'Optimal size for Twitter posts',
        style: {
          fill: 'transparent',
          stroke: { color: '#1DA1F2', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.9, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'facebook-post',
        name: 'Facebook Post',
        category: 'social',
        dimensions: { width: 1200, height: 630 },
        dpi: 72,
        description: 'Recommended size for Facebook posts',
        style: {
          fill: 'transparent',
          stroke: { color: '#1877F2', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.9, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'youtube-thumbnail',
        name: 'YouTube Thumbnail',
        category: 'social',
        dimensions: { width: 1280, height: 720 },
        dpi: 72,
        description: 'Standard YouTube thumbnail size',
        style: {
          fill: 'transparent',
          stroke: { color: '#FF0000', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.95, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'linkedin-post',
        name: 'LinkedIn Post',
        category: 'social',
        dimensions: { width: 1200, height: 627 },
        dpi: 72,
        description: 'Optimal size for LinkedIn posts',
        style: {
          fill: 'transparent',
          stroke: { color: '#0A66C2', width: 2, style: 'solid' }
        },
        export: { format: 'jpeg', quality: 0.9, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },

      // Print Presets
      {
        id: 'business-card',
        name: 'Business Card',
        category: 'print',
        dimensions: { width: 1050, height: 600 },
        dpi: 300,
        description: 'Standard business card size (3.5" x 2")',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'solid' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'postcard',
        name: 'Postcard',
        category: 'print',
        dimensions: { width: 1800, height: 1200 },
        dpi: 300,
        description: 'Standard postcard size (6" x 4")',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'solid' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'flyer-letter',
        name: 'Flyer (Letter)',
        category: 'print',
        dimensions: { width: 2550, height: 3300 },
        dpi: 300,
        description: 'Letter size flyer (8.5" x 11")',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'solid' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },

      // Document Presets
      {
        id: 'a4-portrait',
        name: 'A4 Portrait',
        category: 'document',
        dimensions: { width: 2480, height: 3508 },
        dpi: 300,
        description: 'A4 paper in portrait orientation',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'a4-landscape',
        name: 'A4 Landscape',
        category: 'document',
        dimensions: { width: 3508, height: 2480 },
        dpi: 300,
        description: 'A4 paper in landscape orientation',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'letter-portrait',
        name: 'Letter Portrait',
        category: 'document',
        dimensions: { width: 2550, height: 3300 },
        dpi: 300,
        description: 'US Letter paper in portrait orientation',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'letter-landscape',
        name: 'Letter Landscape',
        category: 'document',
        dimensions: { width: 3300, height: 2550 },
        dpi: 300,
        description: 'US Letter paper in landscape orientation',
        style: {
          fill: '#ffffff',
          stroke: { color: '#cccccc', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 300 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },

      // Web Presets
      {
        id: 'web-banner',
        name: 'Web Banner',
        category: 'web',
        dimensions: { width: 1920, height: 600 },
        dpi: 72,
        description: 'Standard web banner size',
        style: {
          fill: 'transparent',
          stroke: { color: '#666666', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'web-header',
        name: 'Web Header',
        category: 'web',
        dimensions: { width: 1920, height: 400 },
        dpi: 72,
        description: 'Website header image',
        style: {
          fill: 'transparent',
          stroke: { color: '#666666', width: 1, style: 'dashed' }
        },
        export: { format: 'png', quality: 1.0, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      },
      {
        id: 'desktop-wallpaper',
        name: 'Desktop Wallpaper',
        category: 'web',
        dimensions: { width: 1920, height: 1080 },
        dpi: 72,
        description: 'Full HD desktop wallpaper',
        style: {
          fill: 'transparent',
          stroke: { color: '#666666', width: 1, style: 'dashed' }
        },
        export: { format: 'jpeg', quality: 0.95, dpi: 72 },
        metadata: { isBuiltIn: true, createdAt: Date.now(), updatedAt: Date.now() }
      }
    ]

    // Add all built-in presets to the map
    builtInPresets.forEach(preset => {
      this.builtInPresets.set(preset.id, preset)
    })

    // Emit initialization event
    this.eventBus.emit('frame.presets.initialized', {
      builtInCount: this.builtInPresets.size,
      customCount: this.customPresets.size,
      timestamp: Date.now()
    })
  }

  /**
   * Get a preset by ID
   */
  getPreset(id: string): FramePreset | null {
    return this.builtInPresets.get(id) || this.customPresets.get(id) || null
  }

  /**
   * Get all presets
   */
  getAllPresets(): FramePreset[] {
    return [...this.builtInPresets.values(), ...this.customPresets.values()]
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: FramePreset['category']): FramePreset[] {
    return this.getAllPresets().filter(preset => preset.category === category)
  }

  /**
   * Get built-in presets only
   */
  getBuiltInPresets(): FramePreset[] {
    return Array.from(this.builtInPresets.values())
  }

  /**
   * Get custom presets only
   */
  getCustomPresets(): FramePreset[] {
    return Array.from(this.customPresets.values())
  }

  /**
   * Add a custom preset
   */
  addCustomPreset(preset: Omit<FramePreset, 'metadata'>): void {
    const customPreset: FramePreset = {
      ...preset,
      metadata: {
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }

    this.customPresets.set(preset.id, customPreset)

    // Emit event
    this.eventBus.emit('frame.preset.created', {
      presetId: preset.id,
      preset: customPreset as unknown as Record<string, unknown>,
      timestamp: Date.now()
    })
  }

  /**
   * Update a custom preset
   */
  updateCustomPreset(id: string, updates: Partial<Omit<FramePreset, 'id' | 'metadata'>>): boolean {
    const existingPreset = this.customPresets.get(id)
    if (!existingPreset) return false

    const updatedPreset: FramePreset = {
      ...existingPreset,
      ...updates,
      metadata: {
        isBuiltIn: existingPreset.metadata?.isBuiltIn || false,
        createdAt: existingPreset.metadata?.createdAt || Date.now(),
        updatedAt: Date.now()
      }
    }

    this.customPresets.set(id, updatedPreset)

    // Emit event
    this.eventBus.emit('frame.preset.updated', {
      presetId: id,
      preset: updatedPreset as unknown as Record<string, unknown>,
      changes: updates as Record<string, unknown>,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Delete a custom preset
   */
  deleteCustomPreset(id: string): boolean {
    const preset = this.customPresets.get(id)
    if (!preset) return false

    this.customPresets.delete(id)

    // Emit event
    this.eventBus.emit('frame.preset.deleted', {
      presetId: id,
      preset: preset as unknown as Record<string, unknown>,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Check if a preset exists
   */
  hasPreset(id: string): boolean {
    return this.builtInPresets.has(id) || this.customPresets.has(id)
  }

  /**
   * Get preset categories
   */
  getCategories(): Array<{ id: FramePreset['category']; name: string; count: number }> {
    const categories = new Map<FramePreset['category'], number>()
    
    this.getAllPresets().forEach(preset => {
      categories.set(preset.category, (categories.get(preset.category) || 0) + 1)
    })

    return Array.from(categories.entries()).map(([id, count]) => ({
      id,
      name: this.getCategoryDisplayName(id),
      count
    }))
  }

  /**
   * Get category display name
   */
  private getCategoryDisplayName(category: FramePreset['category']): string {
    const names: Record<FramePreset['category'], string> = {
      social: 'Social Media',
      print: 'Print',
      web: 'Web',
      document: 'Document',
      custom: 'Custom'
    }
    return names[category] || category
  }

  /**
   * Search presets by name or description
   */
  searchPresets(query: string): FramePreset[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllPresets().filter(preset => 
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description?.toLowerCase().includes(lowerQuery) ||
      preset.id.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get preset statistics
   */
  getStatistics(): {
    total: number
    builtIn: number
    custom: number
    byCategory: Record<FramePreset['category'], number>
  } {
    const byCategory: Record<FramePreset['category'], number> = {
      social: 0,
      print: 0,
      web: 0,
      document: 0,
      custom: 0
    }

    this.getAllPresets().forEach(preset => {
      byCategory[preset.category]++
    })

    return {
      total: this.builtInPresets.size + this.customPresets.size,
      builtIn: this.builtInPresets.size,
      custom: this.customPresets.size,
      byCategory
    }
  }

  /**
   * Export custom presets for backup
   */
  exportCustomPresets(): FramePreset[] {
    return this.getCustomPresets()
  }

  /**
   * Import custom presets from backup
   */
  importCustomPresets(presets: FramePreset[]): { imported: number; skipped: number; errors: string[] } {
    let imported = 0
    let skipped = 0
    const errors: string[] = []

    presets.forEach(preset => {
      try {
        // Validate preset structure
        if (!preset.id || !preset.name || !preset.category || !preset.dimensions) {
          errors.push(`Invalid preset structure: ${preset.id || 'unknown'}`)
          return
        }

        // Skip if already exists
        if (this.hasPreset(preset.id)) {
          skipped++
          return
        }

        // Add as custom preset
        this.addCustomPreset(preset)
        imported++
      } catch (error) {
        errors.push(`Failed to import preset ${preset.id}: ${error}`)
      }
    })

    return { imported, skipped, errors }
  }

  /**
   * Create a preset from frame dimensions
   */
  createPresetFromDimensions(
    id: string,
    name: string,
    width: number,
    height: number,
    category: FramePreset['category'] = 'custom',
    options?: Partial<FramePreset>
  ): FramePreset {
    const preset: FramePreset = {
      id,
      name,
      category,
      dimensions: { width, height },
      dpi: 72,
      description: `Custom preset ${name}`,
      style: {
        fill: 'transparent',
        stroke: { color: '#999999', width: 1, style: 'dashed' }
      },
      export: { format: 'png', quality: 1.0, dpi: 72 },
      ...options,
      metadata: {
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }

    this.addCustomPreset(preset)
    return preset
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.builtInPresets.clear()
    this.customPresets.clear()
  }
} 