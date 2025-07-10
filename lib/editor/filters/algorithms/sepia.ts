import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Sepia filter algorithm
 * Applies a warm, vintage sepia tone effect
 */
export class SepiaFilter extends SelectionAwareFilter {
  /**
   * Apply sepia effect to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { intensity?: number }): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Sepia tone matrix values
    // These values create the characteristic warm brown tone
    const intensity = filterParams.intensity !== undefined ? filterParams.intensity / 100 : 1
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      const r = result.data[i]
      const g = result.data[i + 1]
      const b = result.data[i + 2]
      
      // Apply sepia matrix transformation
      const tr = (0.393 * r) + (0.769 * g) + (0.189 * b)
      const tg = (0.349 * r) + (0.686 * g) + (0.168 * b)
      const tb = (0.272 * r) + (0.534 * g) + (0.131 * b)
      
      // Blend with original based on intensity
      result.data[i] = this.clamp(r + (tr - r) * intensity)
      result.data[i + 1] = this.clamp(g + (tg - g) * intensity)
      result.data[i + 2] = this.clamp(b + (tb - b) * intensity)
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
    filterParams: { intensity?: number }
  ): Promise<[number, number, number, number]> {
    const intensity = filterParams.intensity !== undefined ? filterParams.intensity / 100 : 1
    
    // Apply sepia matrix transformation
    const tr = (0.393 * r) + (0.769 * g) + (0.189 * b)
    const tg = (0.349 * r) + (0.686 * g) + (0.168 * b)
    const tb = (0.272 * r) + (0.534 * g) + (0.131 * b)
    
    // Blend with original based on intensity
    return [
      this.clamp(r + (tr - r) * intensity),
      this.clamp(g + (tg - g) * intensity),
      this.clamp(b + (tb - b) * intensity),
      a // Alpha unchanged
    ]
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applySepia(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  intensity: number = 100,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const intensityFactor = intensity / 100
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      
      // Check mask if provided
      if (mask) {
        const maskAlpha = mask[index + 3]
        if (maskAlpha === 0) continue // Skip unselected pixels
      }
      
      const r = result[index]
      const g = result[index + 1]
      const b = result[index + 2]
      
      // Apply sepia matrix transformation
      const tr = (0.393 * r) + (0.769 * g) + (0.189 * b)
      const tg = (0.349 * r) + (0.686 * g) + (0.168 * b)
      const tb = (0.272 * r) + (0.534 * g) + (0.131 * b)
      
      // Blend with original based on intensity
      result[index] = Math.max(0, Math.min(255, Math.round(r + (tr - r) * intensityFactor)))
      result[index + 1] = Math.max(0, Math.min(255, Math.round(g + (tg - g) * intensityFactor)))
      result[index + 2] = Math.max(0, Math.min(255, Math.round(b + (tb - b) * intensityFactor)))
      // Alpha remains unchanged
    }
  }
  
  return result
} 