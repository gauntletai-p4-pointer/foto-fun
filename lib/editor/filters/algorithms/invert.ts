/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Invert filter algorithm
 * Inverts the color values of pixels
 */
export class InvertFilter extends SelectionAwareFilter {
  /**
   * Apply color inversion to entire image
   */
  protected async applyFilter(imageData: ImageData, _filterParams: any): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = 255 - result.data[i]       // R
      result.data[i + 1] = 255 - result.data[i + 1] // G
      result.data[i + 2] = 255 - result.data[i + 2] // B
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
    _filterParams: any
  ): Promise<[number, number, number, number]> {
    return [
      255 - r,
      255 - g,
      255 - b,
      a // Alpha unchanged
    ]
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyInvert(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      
      // Check mask if provided
      if (mask) {
        const maskAlpha = mask[index + 3]
        if (maskAlpha === 0) continue // Skip unselected pixels
      }
      
      // Invert color values
      result[index] = 255 - result[index]
      result[index + 1] = 255 - result[index + 1]
      result[index + 2] = 255 - result[index + 2]
      // Alpha remains unchanged
    }
  }
  
  return result
} 