/* eslint-disable @typescript-eslint/no-explicit-any */
import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * ColorTemperatureFilter - Applies color temperature adjustments to selected regions
 */
export class ColortemperatureFilter extends SelectionAwareFilter {
  
  /**
   * Apply color temperature filter to entire image
   */
  async applyFilter(imageData: ImageData, filterParams: any): Promise<ImageData> {
    const { temperature = 0 } = filterParams
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Apply color temperature adjustment
    this.applyColorTemperatureTransform(result.data, temperature)
    
    return result
  }
  
  /**
   * Apply color temperature filter to individual pixels
   */
  async processPixel(r: number, g: number, b: number, a: number, filterParams: any): Promise<[number, number, number, number]> {
    const { temperature = 0 } = filterParams
    
    // Apply color temperature matrix transformation
    const tempAdjust = temperature / 100
    
    // Create color matrix for temperature adjustment
    // Warmer: increase red, decrease blue
    // Cooler: decrease red, increase blue
    const matrix = [
      1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
      0, 1, 0, 0, 0,                       // Green channel (unchanged)
      0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
      0, 0, 0, 1, 0                        // Alpha channel
    ]
    
    // Apply matrix transformation
    const newR = Math.round(
      r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + matrix[4]
    )
    const newG = Math.round(
      r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + matrix[9]
    )
    const newB = Math.round(
      r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14]
    )
    const newA = Math.round(
      r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19]
    )
    
    return [
      Math.max(0, Math.min(255, newR)),
      Math.max(0, Math.min(255, newG)),
      Math.max(0, Math.min(255, newB)),
      Math.max(0, Math.min(255, newA))
    ]
  }
  
  /**
   * Apply color temperature transformation to pixel data
   */
  private applyColorTemperatureTransform(pixelData: Uint8ClampedArray, temperature: number): void {
    const tempAdjust = temperature / 100
    
    // Create color matrix for temperature adjustment
    const matrix = [
      1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
      0, 1, 0, 0, 0,                       // Green channel (unchanged)
      0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
      0, 0, 0, 1, 0                        // Alpha channel
    ]
    
    // Apply matrix transformation to each pixel
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i]
      const g = pixelData[i + 1]
      const b = pixelData[i + 2]
      const a = pixelData[i + 3]
      
      // Apply matrix transformation
      const newR = Math.round(
        r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + matrix[4]
      )
      const newG = Math.round(
        r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + matrix[9]
      )
      const newB = Math.round(
        r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14]
      )
      const newA = Math.round(
        r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19]
      )
      
      pixelData[i] = Math.max(0, Math.min(255, newR))
      pixelData[i + 1] = Math.max(0, Math.min(255, newG))
      pixelData[i + 2] = Math.max(0, Math.min(255, newB))
      pixelData[i + 3] = Math.max(0, Math.min(255, newA))
    }
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyColorTemperature(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  temperature: number = 0,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData)
  const tempAdjust = temperature / 100
  
  // Create color matrix for temperature adjustment
  const matrix = [
    1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
    0, 1, 0, 0, 0,                       // Green channel (unchanged)
    0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
    0, 0, 0, 1, 0                        // Alpha channel
  ]
  
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
      const a = result[index + 3]
      
      // Apply matrix transformation
      const newR = Math.round(
        r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + matrix[4]
      )
      const newG = Math.round(
        r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + matrix[9]
      )
      const newB = Math.round(
        r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + matrix[14]
      )
      const newA = Math.round(
        r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + matrix[19]
      )
      
      result[index] = Math.max(0, Math.min(255, newR))
      result[index + 1] = Math.max(0, Math.min(255, newG))
      result[index + 2] = Math.max(0, Math.min(255, newB))
      result[index + 3] = Math.max(0, Math.min(255, newA))
    }
  }
  
  return result
} 