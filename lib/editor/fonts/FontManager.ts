import type { FontInfo } from '@/types/text'

/**
 * FontManager - Singleton class for managing fonts in FotoFun
 * Handles font loading, caching, and availability
 */
export class FontManager {
  private static instance: FontManager | null = null
  private loadedFonts = new Set<string>()
  private fontCache = new Map<string, FontFace>()
  private systemFonts: string[] = []
  private googleFonts: string[] = []
  
  // Common web-safe fonts that are likely available
  private readonly WEB_SAFE_FONTS = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Helvetica',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana'
  ]
  
  // Popular Google Fonts to preload
  private readonly GOOGLE_FONTS = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Poppins',
    'Merriweather',
    'Playfair Display',
    'Ubuntu'
  ]
  
  private constructor() {
    this.detectSystemFonts()
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): FontManager {
    if (!FontManager.instance) {
      FontManager.instance = new FontManager()
    }
    return FontManager.instance
  }
  
  /**
   * Load a font from URL or Google Fonts
   */
  async loadFont(fontFamily: string, url?: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return
    }
    
    try {
      if (url) {
        // Load from specific URL
        const font = new FontFace(fontFamily, `url(${url})`)
        await font.load()
        document.fonts.add(font)
        this.fontCache.set(fontFamily, font)
        this.loadedFonts.add(fontFamily)
      } else if (this.googleFonts.includes(fontFamily)) {
        // Load from Google Fonts
        await this.loadGoogleFont(fontFamily)
      } else {
        // Assume it's a system font
        this.loadedFonts.add(fontFamily)
      }
    } catch (error) {
      console.error(`Failed to load font: ${fontFamily}`, error)
      throw error
    }
  }
  
  /**
   * Load a font from Google Fonts
   */
  async loadGoogleFont(fontFamily: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) {
      return
    }
    
    try {
      // Create link element for Google Fonts
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;700&display=swap`
      link.rel = 'stylesheet'
      
      // Wait for font to load
      await new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
        document.head.appendChild(link)
      })
      
      // Wait a bit for font to be ready
      await document.fonts.ready
      
      this.loadedFonts.add(fontFamily)
      this.googleFonts.push(fontFamily)
    } catch (error) {
      console.error(`Failed to load Google Font: ${fontFamily}`, error)
      throw error
    }
  }
  
  /**
   * Get all available fonts
   */
  getAvailableFonts(): FontInfo[] {
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
    this.GOOGLE_FONTS.forEach(family => {
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
    return this.loadedFonts.has(fontFamily)
  }
  
  /**
   * Get font categories
   */
  getFontCategories(): Array<{ name: string; fonts: FontInfo[] }> {
    const categories = new Map<string, FontInfo[]>()
    
    this.getAvailableFonts().forEach(font => {
      const category = font.category
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push(font)
    })
    
    return Array.from(categories.entries()).map(([name, fonts]) => ({
      name,
      fonts
    }))
  }
} 