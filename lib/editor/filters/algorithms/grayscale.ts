/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Grayscale filter algorithm
 * Converts color images to grayscale
 */
export class GrayscaleFilter extends SelectionAwareFilter {
  /**
   * Apply grayscale conversion to entire image
   */
  protected async applyFilter(imageData: ImageData, _filterParams: any): Promise<ImageData> {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Process all pixels
    for (let i = 0; i < result.data.length; i += 4) {
      const gray = this.toGrayscale(
        result.data[i],
        result.data[i + 1],
        result.data[i + 2]
      )
      
      result.data[i] = gray
      result.data[i + 1] = gray
      result.data[i + 2] = gray
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
    const gray = this.toGrayscale(r, g, b)
    return [gray, gray, gray, a]
  }
  
  /**
   * Convert RGB to grayscale using luminance weights
   */
  private toGrayscale(r: number, g: number, b: number): number {
    // Use standard luminance weights
    return this.clamp(0.2126 * r + 0.7152 * g + 0.0722 * b)
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyGrayscale(
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
      
      // Calculate grayscale value using luminance weights
      const gray = Math.round(
        0.2126 * result[index] + 
        0.7152 * result[index + 1] + 
        0.0722 * result[index + 2]
      )
      
      result[index] = gray
      result[index + 1] = gray
      result[index + 2] = gray
      // Alpha remains unchanged
    }
  }
  
  return result
} 