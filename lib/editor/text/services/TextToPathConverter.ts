import opentype from 'opentype.js'
import type { Font, Glyph, Path } from 'opentype.js'

export interface TextOptions {
  fontFamily: string
  fontSize: number
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
}

export interface PathData {
  data: string // SVG path data
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface GlyphPath {
  char: string
  path: PathData
  advance: number
  kerning: number
}

export interface TextMetrics {
  width: number
  height: number
  ascender: number
  descender: number
  lineHeight: number
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Service for converting text to SVG paths using OpenType.js
 * Provides accurate font metrics and glyph conversion
 */
export class TextToPathConverter {
  private fontCache = new Map<string, Font>()
  private fontLoadPromises = new Map<string, Promise<Font>>()
  
  // Default font URLs - in production these would come from a font service
  private fontUrls: Record<string, string> = {
    'Arial': '/fonts/Arial.ttf',
    'Helvetica': '/fonts/Helvetica.ttf',
    'Times New Roman': '/fonts/TimesNewRoman.ttf',
    'Georgia': '/fonts/Georgia.ttf',
    'Verdana': '/fonts/Verdana.ttf',
    // Add more fonts as needed
  }
  
  /**
   * Convert text to SVG path data
   */
  async convert(text: string, options: TextOptions): Promise<PathData> {
    const font = await this.loadFont(options.fontFamily)
    const scale = options.fontSize / font.unitsPerEm
    
    // Get glyphs and apply letter spacing
    const glyphs = font.stringToGlyphs(text)
    const glyphPaths = this.glyphsToPaths(glyphs, font, scale, options.letterSpacing || 0)
    
    // Combine all glyph paths into a single path
    return this.combinePaths(glyphPaths, options)
  }
  
  /**
   * Measure text dimensions
   */
  async measureText(text: string, options: TextOptions): Promise<TextMetrics> {
    const font = await this.loadFont(options.fontFamily)
    const scale = options.fontSize / font.unitsPerEm
    
    // Calculate text metrics
    const glyphs = font.stringToGlyphs(text)
    let width = 0
    let minY = Infinity
    let maxY = -Infinity
    let minX = 0
    let maxX = 0
    
    let x = 0
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i]
      
      // Update bounds
      if (glyph.xMin !== undefined) {
        minX = Math.min(minX, x + glyph.xMin * scale)
      }
      if (glyph.xMax !== undefined) {
        maxX = Math.max(maxX, x + glyph.xMax * scale)
      }
      if (glyph.yMin !== undefined) {
        minY = Math.min(minY, glyph.yMin * scale)
      }
      if (glyph.yMax !== undefined) {
        maxY = Math.max(maxY, glyph.yMax * scale)
      }
      
      // Advance position
      const advance = glyph.advanceWidth || 0
      x += advance * scale
      
      // Add letter spacing
      if (i < glyphs.length - 1 && options.letterSpacing) {
        x += options.letterSpacing
      }
      
      // Add kerning
      if (i < glyphs.length - 1) {
        const kerning = font.getKerningValue(glyph, glyphs[i + 1])
        x += kerning * scale
      }
    }
    
    width = x
    
    const ascender = font.ascender * scale
    const descender = font.descender * scale
    const lineHeight = options.lineHeight 
      ? options.fontSize * options.lineHeight 
      : (ascender - descender) * 1.2
    
    return {
      width,
      height: maxY - minY,
      ascender,
      descender,
      lineHeight,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }
  }
  
  /**
   * Get individual glyph paths
   */
  async getGlyphPaths(text: string, options: TextOptions): Promise<GlyphPath[]> {
    const font = await this.loadFont(options.fontFamily)
    const scale = options.fontSize / font.unitsPerEm
    const glyphs = font.stringToGlyphs(text)
    
    return this.glyphsToPaths(glyphs, font, scale, options.letterSpacing || 0)
  }
  
  /**
   * Load font from cache or URL
   */
  private async loadFont(fontFamily: string): Promise<Font> {
    // Check cache
    if (this.fontCache.has(fontFamily)) {
      return this.fontCache.get(fontFamily)!
    }
    
    // Check if already loading
    if (this.fontLoadPromises.has(fontFamily)) {
      return this.fontLoadPromises.get(fontFamily)!
    }
    
    // Load font
    const loadPromise = this.loadFontFromUrl(fontFamily)
    this.fontLoadPromises.set(fontFamily, loadPromise)
    
    try {
      const font = await loadPromise
      this.fontCache.set(fontFamily, font)
      this.fontLoadPromises.delete(fontFamily)
      return font
    } catch (error) {
      this.fontLoadPromises.delete(fontFamily)
      throw error
    }
  }
  
  /**
   * Load font from URL
   */
  private async loadFontFromUrl(fontFamily: string): Promise<Font> {
    const url = this.fontUrls[fontFamily]
    if (!url) {
      // Try to load from Google Fonts or system fonts
      // For now, throw an error
      throw new Error(`Font "${fontFamily}" not found`)
    }
    
    return new Promise((resolve, reject) => {
      opentype.load(url, (err, font) => {
        if (err || !font) {
          reject(err || new Error('Failed to load font'))
        } else {
          resolve(font)
        }
      })
    })
  }
  
  /**
   * Convert glyphs to path data
   */
  private glyphsToPaths(
    glyphs: Glyph[], 
    font: Font, 
    scale: number, 
    letterSpacing: number
  ): GlyphPath[] {
    const paths: GlyphPath[] = []
    let x = 0
    
    for (let i = 0; i < glyphs.length; i++) {
      const glyph = glyphs[i]
      const path = glyph.getPath(x, 0, scale * font.unitsPerEm)
      
      // Convert to SVG path data
      const pathData = path.toPathData(2) // 2 decimal places
      
      // Calculate bounds
      const bounds = {
        x: x,
        y: (glyph.yMin || 0) * scale,
        width: (glyph.advanceWidth || 0) * scale,
        height: ((glyph.yMax || 0) - (glyph.yMin || 0)) * scale
      }
      
      // Get kerning for next character
      let kerning = 0
      if (i < glyphs.length - 1) {
        kerning = font.getKerningValue(glyph, glyphs[i + 1]) * scale
      }
      
      paths.push({
        char: String.fromCharCode(glyph.unicode || 0),
        path: {
          data: pathData,
          bounds
        },
        advance: (glyph.advanceWidth || 0) * scale,
        kerning
      })
      
      // Advance position
      x += (glyph.advanceWidth || 0) * scale + letterSpacing + kerning
    }
    
    return paths
  }
  
  /**
   * Combine individual glyph paths into a single path
   */
  private combinePaths(glyphPaths: GlyphPath[], options: TextOptions): PathData {
    // Combine all path data
    const combinedPath = glyphPaths
      .map(gp => gp.path.data)
      .filter(data => data.length > 0)
      .join(' ')
    
    // Calculate combined bounds
    if (glyphPaths.length === 0) {
      return {
        data: '',
        bounds: { x: 0, y: 0, width: 0, height: 0 }
      }
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    glyphPaths.forEach(gp => {
      const bounds = gp.path.bounds
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    })
    
    // Apply text alignment offset
    let offsetX = 0
    const totalWidth = maxX - minX
    
    if (options.textAlign === 'center') {
      offsetX = -totalWidth / 2
    } else if (options.textAlign === 'right') {
      offsetX = -totalWidth
    }
    
    // Apply offset if needed
    let finalPath = combinedPath
    if (offsetX !== 0) {
      // Simple SVG transform - in production would parse and transform the path
      finalPath = `<g transform="translate(${offsetX}, 0)">${combinedPath}</g>`
    }
    
    return {
      data: finalPath,
      bounds: {
        x: minX + offsetX,
        y: minY,
        width: totalWidth,
        height: maxY - minY
      }
    }
  }
  
  /**
   * Register a custom font
   */
  async registerFont(fontFamily: string, url: string): Promise<void> {
    this.fontUrls[fontFamily] = url
    // Optionally preload the font
    await this.loadFont(fontFamily)
  }
  
  /**
   * Clear font cache
   */
  clearCache(): void {
    this.fontCache.clear()
    this.fontLoadPromises.clear()
  }
}

// Export singleton instance
export const textToPathConverter = new TextToPathConverter() 