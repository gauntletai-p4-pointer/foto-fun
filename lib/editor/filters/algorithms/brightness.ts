import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Brightness filter algorithm
 * Adjusts the brightness of pixels
 */
export class BrightnessFilter extends SelectionAwareFilter {
  /**
   * Apply brightness adjustment to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { adjustment: number }): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    const adjustment = filterParams.adjustment || 0
    const brightnessValue = adjustment / 100 // Convert percentage to -1 to 1 range
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = this.adjustBrightness(result.data[i], brightnessValue)     // R
      result.data[i + 1] = this.adjustBrightness(result.data[i + 1], brightnessValue) // G
      result.data[i + 2] = this.adjustBrightness(result.data[i + 2], brightnessValue) // B
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
    const brightnessValue = filterParams.adjustment / 100
    
    return [
      this.adjustBrightness(r, brightnessValue),
      this.adjustBrightness(g, brightnessValue),
      this.adjustBrightness(b, brightnessValue),
      a // Alpha unchanged
    ]
  }
  
  /**
   * Adjust brightness of a single color channel
   */
  private adjustBrightness(value: number, brightness: number): number {
    // Fabric.js brightness filter uses additive brightness
    // brightness is in range -1 to 1
    return this.clamp(value + brightness * 255)
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyBrightness(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  adjustment: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const brightnessValue = adjustment / 100
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      
      // Check mask if provided
      if (mask) {
        const maskAlpha = mask[index + 3]
        if (maskAlpha === 0) continue // Skip unselected pixels
      }
      
      // Apply brightness adjustment
      result[index] = Math.max(0, Math.min(255, result[index] + brightnessValue * 255))
      result[index + 1] = Math.max(0, Math.min(255, result[index + 1] + brightnessValue * 255))
      result[index + 2] = Math.max(0, Math.min(255, result[index + 2] + brightnessValue * 255))
      // Alpha remains unchanged
    }
  }
  
  return result
} 