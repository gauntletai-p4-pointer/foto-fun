import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Saturation filter algorithm
 * Adjusts the color saturation of pixels
 */
export class SaturationFilter extends SelectionAwareFilter {
  /**
   * Apply saturation adjustment to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { adjustment: number }): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    const adjustment = filterParams.adjustment || 0
    const saturationValue = adjustment / 100 // Convert percentage to -1 to 1 range
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      const [r, g, b] = this.adjustSaturation(
        result.data[i],
        result.data[i + 1],
        result.data[i + 2],
        saturationValue
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
    filterParams: { adjustment: number }
  ): Promise<[number, number, number, number]> {
    const saturationValue = filterParams.adjustment / 100
    const [newR, newG, newB] = this.adjustSaturation(r, g, b, saturationValue)
    
    return [newR, newG, newB, a]
  }
  
  /**
   * Adjust saturation of RGB values
   */
  private adjustSaturation(r: number, g: number, b: number, saturation: number): [number, number, number] {
    // Fabric.js saturation filter uses a matrix approach
    // We'll use the same approach for consistency
    
    // Calculate grayscale value (luminance)
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
    
    // Interpolate between grayscale and original color
    const adjust = saturation + 1
    
    const newR = this.clamp(gray + (r - gray) * adjust)
    const newG = this.clamp(gray + (g - gray) * adjust)
    const newB = this.clamp(gray + (b - gray) * adjust)
    
    return [newR, newG, newB]
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applySaturation(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  adjustment: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const saturationValue = adjustment / 100
  const adjust = saturationValue + 1
  
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
      
      // Calculate grayscale value (luminance)
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
      
      // Apply saturation adjustment
      result[index] = Math.max(0, Math.min(255, gray + (r - gray) * adjust))
      result[index + 1] = Math.max(0, Math.min(255, gray + (g - gray) * adjust))
      result[index + 2] = Math.max(0, Math.min(255, gray + (b - gray) * adjust))
      // Alpha remains unchanged
    }
  }
  
  return result
} 