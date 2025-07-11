import type { FontManager } from '../../fonts/FontManager'
import type { TextMetrics, TextStyle } from '@/types/text'

/**
 * TextEngine handles font management, text layout, and glyph conversion
 * Core engine for all text-related operations in the editor
 */
export class TextEngine {
  private fontManager: FontManager
  private layoutCache = new Map<string, TextLayout>()
  
  constructor(fontManager: FontManager) {
    this.fontManager = fontManager
  }
  
  /**
   * Measure text with given style
   */
  measureText(text: string, style: TextStyle): TextMetrics {
    const cacheKey = this.getCacheKey(text, style)
    
    // Check cache
    if (this.layoutCache.has(cacheKey)) {
      const layout = this.layoutCache.get(cacheKey)!
      return layout.metrics
    }
    
    // Create canvas for measurement
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Apply font style
    ctx.font = this.buildFontString(style)
    
    // Measure text
    const metrics = ctx.measureText(text)
    
    // Calculate additional metrics
    const lineHeight = style.lineHeight || style.fontSize * 1.2
    const ascent = metrics.actualBoundingBoxAscent || style.fontSize * 0.8
    const descent = metrics.actualBoundingBoxDescent || style.fontSize * 0.2
    
    const textMetrics: TextMetrics = {
      width: metrics.width,
      height: lineHeight,
      ascent,
      descent,
      lineHeight,
      actualBoundingBoxLeft: metrics.actualBoundingBoxLeft || 0,
      actualBoundingBoxRight: metrics.actualBoundingBoxRight || metrics.width,
      actualBoundingBoxAscent: ascent,
      actualBoundingBoxDescent: descent
    }
    
    // Cache the result
    this.layoutCache.set(cacheKey, {
      text,
      style,
      metrics: textMetrics,
      glyphs: []
    })
    
    return textMetrics
  }
  
  /**
   * Layout text for rendering
   */
  layoutText(
    text: string,
    style: TextStyle,
    maxWidth?: number,
    alignment: 'left' | 'center' | 'right' | 'justify' = 'left'
  ): TextLayout {
    const lines = this.breakIntoLines(text, style, maxWidth)
    const lineLayouts: LineLayout[] = []
    
    let y = 0
    const lineHeight = style.lineHeight || style.fontSize * 1.2
    
    for (const line of lines) {
      const lineMetrics = this.measureText(line, style)
      let x = 0
      
      // Calculate x position based on alignment
      if (maxWidth) {
        switch (alignment) {
          case 'center':
            x = (maxWidth - lineMetrics.width) / 2
            break
          case 'right':
            x = maxWidth - lineMetrics.width
            break
          case 'justify':
            // Justify will be handled in glyph positioning
            break
        }
      }
      
      // Layout glyphs for this line
      const glyphs = this.layoutGlyphs(line, style, x, y, alignment === 'justify' ? maxWidth : undefined)
      
      lineLayouts.push({
        text: line,
        x,
        y,
        width: lineMetrics.width,
        height: lineHeight,
        glyphs
      })
      
      y += lineHeight
    }
    
    // Calculate total metrics
    const totalWidth = Math.max(...lineLayouts.map(l => l.width))
    const totalHeight = y
    
    return {
      text,
      style,
      metrics: {
        width: totalWidth,
        height: totalHeight,
        ascent: style.fontSize * 0.8,
        descent: style.fontSize * 0.2,
        lineHeight,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: totalWidth,
        actualBoundingBoxAscent: style.fontSize * 0.8,
        actualBoundingBoxDescent: style.fontSize * 0.2
      },
      lines: lineLayouts,
      glyphs: lineLayouts.flatMap(l => l.glyphs)
    }
  }
  
  /**
   * Break text into lines based on max width
   */
  private breakIntoLines(text: string, style: TextStyle, maxWidth?: number): string[] {
    if (!maxWidth) {
      // No wrapping, split only on newlines
      return text.split('\n')
    }
    
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = this.buildFontString(style)
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && currentLine) {
        // Line is too long, start new line
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines.length > 0 ? lines : ['']
  }
  
  /**
   * Layout individual glyphs for a line of text
   */
  private layoutGlyphs(
    text: string,
    style: TextStyle,
    startX: number,
    startY: number,
    justifyWidth?: number
  ): GlyphLayout[] {
    const glyphs: GlyphLayout[] = []
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.font = this.buildFontString(style)
    
    let x = startX
    const y = startY + (style.fontSize * 0.8) // Baseline position
    
    // Calculate spacing for justified text
    let extraSpacing = 0
    if (justifyWidth && text.includes(' ')) {
      const textWidth = ctx.measureText(text).width
      const spaceCount = (text.match(/ /g) || []).length
      extraSpacing = (justifyWidth - textWidth) / spaceCount
    }
    
    // Layout each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const metrics = ctx.measureText(char)
      
      glyphs.push({
        char,
        x,
        y,
        width: metrics.width,
        height: style.fontSize,
        font: style.fontFamily,
        fontSize: style.fontSize,
        index: i
      })
      
      x += metrics.width
      
      // Add kerning
      if (i < text.length - 1) {
        const kerning = this.getKerning(char, text[i + 1], style)
        x += kerning
      }
      
      // Add extra spacing for justified text
      if (char === ' ' && justifyWidth) {
        x += extraSpacing
      }
    }
    
    return glyphs
  }
  
  /**
   * Get kerning value between two characters
   */
  private getKerning(char1: string, char2: string, style: TextStyle): number {
    // Simple kerning implementation
    // In a real implementation, this would use font kerning tables
    const kernPairs: Record<string, number> = {
      'AV': -0.1,
      'AW': -0.1,
      'AY': -0.1,
      'FA': -0.1,
      'LA': -0.05,
      'LT': -0.1,
      'LV': -0.1,
      'LW': -0.1,
      'LY': -0.1,
      'PA': -0.1,
      'TA': -0.1,
      'TO': -0.05,
      'VA': -0.1,
      'VO': -0.05,
      'WA': -0.1,
      'YA': -0.1,
      'YO': -0.05
    }
    
    const pair = char1.toUpperCase() + char2.toUpperCase()
    const kernValue = kernPairs[pair] || 0
    
    return kernValue * style.fontSize
  }
  
  /**
   * Convert text to path for warping and effects
   */
  async convertToPath(text: string, style: TextStyle): Promise<Path2D> {
    const layout = this.layoutText(text, style)
    const path = new Path2D()
    
    // For each glyph, add to path
    for (const glyph of layout.glyphs) {
      // In a real implementation, this would use font glyph data
      // For now, we'll create simple rectangular paths
      path.rect(glyph.x, glyph.y - glyph.height * 0.8, glyph.width, glyph.height)
    }
    
    return path
  }
  
  /**
   * Apply text warping
   */
  applyWarp(
    layout: TextLayout,
    warpType: 'arc' | 'bulge' | 'wave' | 'flag' | 'rise',
    bend: number // -100 to 100
  ): TextLayout {
    const warpedLayout = { ...layout }
    warpedLayout.glyphs = layout.glyphs.map(glyph => {
      const warpedGlyph = { ...glyph }
      
      // Calculate warped position based on type
      const t = glyph.x / layout.metrics.width // 0 to 1 position
      const centerY = layout.metrics.height / 2
      
      switch (warpType) {
        case 'arc': {
          const angle = (t - 0.5) * Math.PI * (bend / 100)
          const radius = layout.metrics.width / 2
          warpedGlyph.x = glyph.x
          warpedGlyph.y = glyph.y + Math.sin(angle) * radius * (bend / 100)
          warpedGlyph.rotation = angle * 180 / Math.PI
          break
        }
        
        case 'bulge': {
          const bulgeAmount = Math.sin(t * Math.PI) * (bend / 100)
          warpedGlyph.x = glyph.x
          warpedGlyph.y = glyph.y - bulgeAmount * centerY
          break
        }
        
        case 'wave': {
          const waveAmount = Math.sin(t * Math.PI * 2) * (bend / 100)
          warpedGlyph.x = glyph.x
          warpedGlyph.y = glyph.y + waveAmount * centerY * 0.5
          break
        }
        
        case 'flag': {
          const flagAmount = Math.sin(t * Math.PI * 3) * (bend / 100)
          warpedGlyph.x = glyph.x
          warpedGlyph.y = glyph.y + flagAmount * centerY * 0.3 * t
          break
        }
        
        case 'rise': {
          const riseAmount = Math.pow(t, 2) * (bend / 100)
          warpedGlyph.x = glyph.x
          warpedGlyph.y = glyph.y - riseAmount * centerY
          break
        }
      }
      
      return warpedGlyph
    })
    
    return warpedLayout
  }
  
  /**
   * Build font string from style
   */
  private buildFontString(style: TextStyle): string {
    const parts: string[] = []
    
    if (style.fontStyle && style.fontStyle !== 'normal') {
      parts.push(style.fontStyle)
    }
    
    if (style.fontWeight && style.fontWeight !== 'normal') {
      parts.push(style.fontWeight.toString())
    }
    
    parts.push(`${style.fontSize}px`)
    parts.push(style.fontFamily)
    
    return parts.join(' ')
  }
  
  /**
   * Get cache key for text and style
   */
  private getCacheKey(text: string, style: TextStyle): string {
    return `${text}_${JSON.stringify(style)}`
  }
  
  /**
   * Clear layout cache
   */
  clearCache(): void {
    this.layoutCache.clear()
  }
}

// Type definitions
interface TextLayout {
  text: string
  style: TextStyle
  metrics: TextMetrics
  lines?: LineLayout[]
  glyphs: GlyphLayout[]
}

interface LineLayout {
  text: string
  x: number
  y: number
  width: number
  height: number
  glyphs: GlyphLayout[]
}

interface GlyphLayout {
  char: string
  x: number
  y: number
  width: number
  height: number
  font: string
  fontSize: number
  index: number
  rotation?: number
} 