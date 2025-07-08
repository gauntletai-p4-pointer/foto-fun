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
  private googleFontsLoaded = false
  
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
  
  // Popular Google Fonts to show initially (before full list loads)
  private readonly POPULAR_GOOGLE_FONTS = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Poppins',
    'Merriweather',
    'Playfair Display',
    'Ubuntu',
    'Nunito',
    'Quicksand',
    'Bebas Neue',
    'Dancing Script',
    'Pacifico',
    'Caveat',
    'Satisfy',
    'Great Vibes',
    'Permanent Marker',
    'Amatic SC'
  ]
  
  // Google Fonts API key (optional - works without it but has rate limits)
  private readonly GOOGLE_FONTS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY || ''
  
  private constructor() {
    this.detectSystemFonts()
    // Load popular Google Fonts list immediately
    this.googleFonts = [...this.POPULAR_GOOGLE_FONTS]
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
   * Load the full Google Fonts list from API
   */
  async loadGoogleFontsList(): Promise<void> {
    if (this.googleFontsLoaded) return
    
    try {
      const apiUrl = this.GOOGLE_FONTS_API_KEY 
        ? `https://www.googleapis.com/webfonts/v1/webfonts?key=${this.GOOGLE_FONTS_API_KEY}&sort=popularity`
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
      } else if (this.googleFonts.includes(fontFamily) || await this.isGoogleFont(fontFamily)) {
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