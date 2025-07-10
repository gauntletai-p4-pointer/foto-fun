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
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = this.adjustContrast(result.data[i], contrastValue)     // R
      result.data[i + 1] = this.adjustContrast(result.data[i + 1], contrastValue) // G
      result.data[i + 2] = this.adjustContrast(result.data[i + 2], contrastValue) // B
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
    
    return [
      this.adjustContrast(r, contrastValue),
      this.adjustContrast(g, contrastValue),
      this.adjustContrast(b, contrastValue),
      a // Alpha unchanged
    ]
  }
  
  /**
   * Adjust contrast of a single color channel
   */
  private adjustContrast(value: number, contrast: number): number {
    // Fabric.js contrast filter formula
    // contrast is in range -1 to 1
    const factor = (259 * (contrast + 1)) / (1 * (259 - contrast))
    return this.clamp(factor * (value - 128) + 128)
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
  const factor = (259 * (contrastValue + 1)) / (1 * (259 - contrastValue))
  
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