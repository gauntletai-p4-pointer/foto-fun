import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Contrast filter algorithm
 * Adjusts the contrast of pixels
 */
export class ContrastFilter extends SelectionAwareFilter {
  /**
   * Apply contrast adjustment to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { adjustment: number }): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    const adjustment = filterParams.adjustment || 0
    const contrastValue = adjustment / 100 // Convert percentage to -1 to 1 range
    
    // Calculate the factor once for efficiency
    const factor = this.calculateContrastFactor(contrastValue)
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = this.adjustContrastWithFactor(result.data[i], factor)     // R
      result.data[i + 1] = this.adjustContrastWithFactor(result.data[i + 1], factor) // G
      result.data[i + 2] = this.adjustContrastWithFactor(result.data[i + 2], factor) // B
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
    filterParams: { adjustment: number }
  ): Promise<[number, number, number, number]> {
    const contrastValue = filterParams.adjustment / 100
    
    // Calculate the factor once for efficiency
    const factor = this.calculateContrastFactor(contrastValue)
    
    return [
      this.adjustContrastWithFactor(r, factor),
      this.adjustContrastWithFactor(g, factor),
      this.adjustContrastWithFactor(b, factor),
      a // Alpha unchanged
    ]
  }
  
  /**
   * Calculate contrast factor
   */
  private calculateContrastFactor(contrast: number): number {
    // Clamp contrast to safe range to prevent division by zero or extreme values
    const safeContrast = Math.max(-0.99, Math.min(0.99, contrast))
    
    // Fabric.js contrast filter formula
    // contrast is in range -1 to 1
    const factor = (259 * (safeContrast + 1)) / (1 * (259 - safeContrast))
    
    return factor
  }
  
  /**
   * Adjust contrast of a single color channel with pre-calculated factor
   */
  private adjustContrastWithFactor(value: number, factor: number): number {
    const adjusted = factor * (value - 128) + 128
    return this.clamp(adjusted)
  }
  
  /**
   * Adjust contrast of a single color channel
   */
  private adjustContrast(value: number, contrast: number): number {
    const factor = this.calculateContrastFactor(contrast)
    return this.adjustContrastWithFactor(value, factor)
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyContrast(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  adjustment: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const contrastValue = adjustment / 100
  
  // Clamp contrast to safe range
  const safeContrast = Math.max(-0.99, Math.min(0.99, contrastValue))
  
  const factor = (259 * (safeContrast + 1)) / (1 * (259 - safeContrast))
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      
      // Check mask if provided
      if (mask) {
        const maskAlpha = mask[index + 3]
        if (maskAlpha === 0) continue // Skip unselected pixels
      }
      
      // Apply contrast adjustment
      result[index] = Math.max(0, Math.min(255, factor * (result[index] - 128) + 128))
      result[index + 1] = Math.max(0, Math.min(255, factor * (result[index + 1] - 128) + 128))
      result[index + 2] = Math.max(0, Math.min(255, factor * (result[index + 2] - 128) + 128))
      // Alpha remains unchanged
    }
  }
  
  return result
} 