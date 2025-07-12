import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface FontInfo {
  family: string
  name: string
  category: 'system' | 'google' | 'custom'
  loaded: boolean
  variants?: string[]
  url?: string
}

/**
 * Configuration for FontManager
 */
export interface FontManagerConfig {
  preload?: boolean
  caching?: boolean
  googleFontsApiKey?: string
  maxCachedFonts?: number
}

/**
 * Manages font loading, caching, and availability
 * Provides a unified interface for system fonts, Google Fonts, and custom fonts
 */
export class FontManager {
  private loadedFonts = new Set<string>()
  private fontCache = new Map<string, FontFace>()
  private systemFonts: string[] = []
  private googleFonts: string[] = []
  private googleFontsLoaded = false
  private disposed = false
  
  // Web-safe fonts that are available on most systems
  private readonly WEB_SAFE_FONTS = [
    'Arial', 'Arial Black', 'Arial Narrow',
    'Helvetica', 'Helvetica Neue',
    'Times', 'Times New Roman',
    'Georgia', 'Garamond',
    'Courier', 'Courier New',
    'Verdana', 'Geneva',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Palatino',
    'Lucida Console',
    'Tahoma'
  ]
  
  // Popular Google Fonts to load immediately
  private readonly POPULAR_GOOGLE_FONTS = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
    'Source Sans Pro', 'Raleway', 'PT Sans', 'Lora', 'Nunito',
    'Ubuntu', 'Playfair Display', 'Merriweather', 'Poppins', 'Roboto Condensed',
    'Noto Sans', 'Fira Sans', 'Work Sans', 'Crimson Text', 'Libre Baskerville'
  ]
  
  private readonly googleFontsApiKey: string
  
  constructor(
    private typedEventBus: TypedEventBus,
    private config: FontManagerConfig = {}
  ) {
    this.googleFontsApiKey = config.googleFontsApiKey || process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || ''
    this.initialize()
  }
  
  private initialize(): void {
    this.detectSystemFonts()
    this.setupEventHandlers()
    
    // Load popular Google Fonts list immediately
    this.googleFonts = [...this.POPULAR_GOOGLE_FONTS]
    
    if (this.config.preload) {
      this.preloadCommonFonts().catch(error => {
        console.warn('[FontManager] Failed to preload common fonts:', error)
      })
    }
  }
  
  private setupEventHandlers(): void {
    // Listen for text events to track font usage
    this.typedEventBus.on('text.font.used', (event) => {
      // Auto-load fonts when they're used
      this.loadFont(event.fontFamily).catch(error => {
        console.warn(`[FontManager] Failed to auto-load font: ${event.fontFamily}`, error)
      })
    })
    
    this.typedEventBus.on('text.created', (event) => {
      // Emit font usage analytics
      if (this.config.caching) {
        console.log(`[FontManager] Text created: ${event.textId}`)
      }
    })
  }
  
  /**
   * Load the full Google Fonts list from API
   */
  async loadGoogleFontsList(): Promise<void> {
    if (this.disposed) {
      throw new Error('FontManager has been disposed')
    }
    
    if (this.googleFontsLoaded) return
    
    try {
      const apiUrl = this.googleFontsApiKey 
        ? `https://www.googleapis.com/webfonts/v1/webfonts?key=${this.googleFontsApiKey}&sort=popularity`
        : 'https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity'
      
      const response = await fetch(apiUrl)
      if (!response.ok) {
        console.warn('Failed to load Google Fonts list, using popular fonts only')
        return
      }
      
      const data = await response.json()
      // Take top 100 most popular fonts
      this.googleFonts = data.items
        .slice(0, 100)
        .map((font: { family: string }) => font.family)
      
      this.googleFontsLoaded = true
    } catch (error) {
      console.warn('Failed to load Google Fonts list:', error)
      // Keep using the popular fonts list
    }
  }
  
  /**
   * Search fonts by name
   */
  async searchFonts(query: string): Promise<FontInfo[]> {
    if (this.disposed) {
      throw new Error('FontManager has been disposed')
    }
    
    // Ensure Google Fonts list is loaded
    await this.loadGoogleFontsList()
    
    const searchTerm = query.toLowerCase()
    const allFonts = this.getAvailableFonts()
    
    return allFonts.filter(font => 
      font.name.toLowerCase().includes(searchTerm)
    )
  }
  
  /**
   * Load a font from URL or Google Fonts
   */
  async loadFont(fontFamily: string, url?: string): Promise<void> {
    if (this.disposed) {
      throw new Error('FontManager has been disposed')
    }
    
    if (this.loadedFonts.has(fontFamily)) {
      return
    }
    
    try {
      if (url) {
        // Load from specific URL
        const font = new FontFace(fontFamily, `url(${url})`)
        await font.load()
        document.fonts.add(font)
        
        if (this.config.caching) {
          this.fontCache.set(fontFamily, font)
        }
        
        this.loadedFonts.add(fontFamily)
      } else if (this.googleFonts.includes(fontFamily) || await this.isGoogleFont(fontFamily)) {
        // Load from Google Fonts
        await this.loadGoogleFont(fontFamily)
      } else {
        // Assume it's a system font
        this.loadedFonts.add(fontFamily)
      }
      
      // Emit font loaded event
      this.typedEventBus.emit('text.font.used', { fontFamily })
      
    } catch (error) {
      console.error(`Failed to load font: ${fontFamily}`, error)
      throw error
    }
  }
  
  /**
   * Check if a font is available on Google Fonts
   */
  private async isGoogleFont(fontFamily: string): Promise<boolean> {
    // Try to load it from Google Fonts API
    try {
      const response = await fetch(
        `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}`
      )
      return response.ok
    } catch {
      return false
    }
  }
  
  /**
   * Load a font from Google Fonts with variants
   */
  async loadGoogleFont(fontFamily: string, variants: string[] = ['400', '700']): Promise<void> {
    if (this.disposed) {
      throw new Error('FontManager has been disposed')
    }
    
    if (this.loadedFonts.has(fontFamily)) {
      return
    }
    
    try {
      // Create link element for Google Fonts with multiple weights
      const link = document.createElement('link')
      const weights = variants.join(',')
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@${weights}&display=swap`
      link.rel = 'stylesheet'
      
      // Wait for font to load
      await new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
        document.head.appendChild(link)
      })
      
      // Wait for fonts to be ready
      await document.fonts.ready
      
      this.loadedFonts.add(fontFamily)
      if (!this.googleFonts.includes(fontFamily)) {
        this.googleFonts.push(fontFamily)
      }
    } catch (error) {
      console.error(`Failed to load Google Font: ${fontFamily}`, error)
      throw error
    }
  }
  
  /**
   * Get all available fonts
   */
  getAvailableFonts(): FontInfo[] {
    if (this.disposed) return []
    
    const fonts: FontInfo[] = []
    
    // Add system fonts
    this.systemFonts.forEach(family => {
      fonts.push({
        family,
        name: family,
        category: 'system',
        loaded: this.loadedFonts.has(family)
      })
    })
    
    // Add Google fonts
    this.googleFonts.forEach(family => {
      fonts.push({
        family,
        name: family,
        category: 'google',
        loaded: this.loadedFonts.has(family)
      })
    })
    
    // Sort alphabetically
    return fonts.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  /**
   * Preload common fonts for better performance
   */
  async preloadCommonFonts(): Promise<void> {
    if (this.disposed) return
    
    const commonFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Roboto', 'Open Sans']
    
    await Promise.all(
      commonFonts.map(font => this.loadFont(font).catch(() => {
        // Ignore errors for fonts that can't be loaded
      }))
    )
  }
  
  /**
   * Detect system fonts (basic implementation)
   */
  private detectSystemFonts(): void {
    // Start with web-safe fonts
    this.systemFonts = [...this.WEB_SAFE_FONTS]
    
    // Mark web-safe fonts as loaded since they're system fonts
    this.WEB_SAFE_FONTS.forEach(font => {
      this.loadedFonts.add(font)
    })
  }
  
  /**
   * Check if a font is loaded
   */
  isFontLoaded(fontFamily: string): boolean {
    if (this.disposed) return false
    return this.loadedFonts.has(fontFamily)
  }
  
  /**
   * Get font categories for UI organization
   */
  getFontCategories(): Array<{ name: string; fonts: FontInfo[] }> {
    if (this.disposed) return []
    
    const allFonts = this.getAvailableFonts()
    
    return [
      {
        name: 'System Fonts',
        fonts: allFonts.filter(f => f.category === 'system')
      },
      {
        name: 'Google Fonts',
        fonts: allFonts.filter(f => f.category === 'google')
      },
      {
        name: 'Custom Fonts',
        fonts: allFonts.filter(f => f.category === 'custom')
      }
    ]
  }
  
  /**
   * Clear font cache to free memory
   */
  clearCache(): void {
    if (this.disposed) return
    this.fontCache.clear()
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; fonts: string[] } {
    if (this.disposed) {
      return { size: 0, maxSize: 0, fonts: [] }
    }
    
    return {
      size: this.fontCache.size,
      maxSize: this.config.maxCachedFonts || 50,
      fonts: Array.from(this.fontCache.keys())
    }
  }
  
  /**
   * Dispose the FontManager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.clearCache()
    this.loadedFonts.clear()
    this.systemFonts = []
    this.googleFonts = []
    this.disposed = true
    
    // Remove event listeners
    this.typedEventBus.clear('text.font.used')
    this.typedEventBus.clear('text.created')
  }
  
  /**
   * Check if the manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
} 