import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Hue rotation filter algorithm
 * Rotates the hue of pixels
 */
export class HueFilter extends SelectionAwareFilter {
  /**
   * Apply hue rotation to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { rotation: number }): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    const rotation = filterParams.rotation || 0
    const rotationRadians = (rotation * Math.PI) / 180
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      const [r, g, b] = this.rotateHue(
        result.data[i],
        result.data[i + 1],
        result.data[i + 2],
        rotationRadians
      )
      
      result.data[i] = r
      result.data[i + 1] = g
      result.data[i + 2] = b
      // Alpha channel (i + 3) remains unchanged
    }
    
    return result
  }
  
  /**
   * Process a single pixel
   */
  protected async processPixel(
    r: number,
    g: number,
    b: number,
    a: number,
    filterParams: { rotation: number }
  ): Promise<[number, number, number, number]> {
    const rotationRadians = (filterParams.rotation * Math.PI) / 180
    const [newR, newG, newB] = this.rotateHue(r, g, b, rotationRadians)
    
    return [newR, newG, newB, a]
  }
  
  /**
   * Rotate hue of RGB values
   */
  private rotateHue(r: number, g: number, b: number, rotation: number): [number, number, number] {
    // Convert RGB to HSL
    const [h, s, l] = this.rgbToHsl(r, g, b)
    
    // Rotate hue
    let newH = h + rotation / (2 * Math.PI)
    // Ensure hue is in [0, 1] range
    while (newH < 0) newH += 1
    while (newH > 1) newH -= 1
    
    // Convert back to RGB
    return this.hslToRgb(newH, s, l)
  }
  
  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255
    g /= 255
    b /= 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      
      h /= 6
    }
    
    return [h, s, l]
  }
  
  /**
   * Convert HSL to RGB
   */
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number
    
    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    return [
      this.clamp(Math.round(r * 255)),
      this.clamp(Math.round(g * 255)),
      this.clamp(Math.round(b * 255))
    ]
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyHueRotation(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  rotation: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const rotationRadians = (rotation * Math.PI) / 180
  
  // Helper functions (inline for performance)
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255
    g /= 255
    b /= 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      
      h /= 6
    }
    
    return [h, s, l]
  }
  
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r: number, g: number, b: number
    
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1/6) return p + (q - p) * 6 * t
        if (t < 1/2) return q
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
        return p
      }
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      
      r = hue2rgb(p, q, h + 1/3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1/3)
    }
    
    return [
      Math.max(0, Math.min(255, Math.round(r * 255))),
      Math.max(0, Math.min(255, Math.round(g * 255))),
      Math.max(0, Math.min(255, Math.round(b * 255)))
    ]
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      
      // Check mask if provided
      if (mask) {
        const maskAlpha = mask[index + 3]
        if (maskAlpha === 0) continue // Skip unselected pixels
      }
      
      // Convert to HSL
      const [h, s, l] = rgbToHsl(result[index], result[index + 1], result[index + 2])
      
      // Rotate hue
      let newH = h + rotationRadians / (2 * Math.PI)
      while (newH < 0) newH += 1
      while (newH > 1) newH -= 1
      
      // Convert back to RGB
      const [r, g, b] = hslToRgb(newH, s, l)
      
      result[index] = r
      result[index + 1] = g
      result[index + 2] = b
      // Alpha remains unchanged
    }
  }
  
  return result
} 