/* eslint-disable @typescript-eslint/no-unused-vars */
import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Blur filter algorithm
 * Implements Gaussian blur
 */
export class BlurFilter extends SelectionAwareFilter {
  /**
   * Apply blur to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { radius: number }): Promise<ImageData> {
    const radius = Math.max(0, filterParams.radius || 0) / 100 // Convert percentage to 0-1 range
    
    if (radius === 0) {
      // No blur needed
      return imageData
    }
    
    // Fabric.js blur uses a box blur approximation
    // We'll use the same approach for consistency
    const passes = 3 // Number of box blur passes to approximate Gaussian
    const boxRadius = Math.ceil(radius * 10) // Scale to pixel radius
    
    let result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Apply box blur multiple times
    for (let pass = 0; pass < passes; pass++) {
      result = this.applyBoxBlur(result, boxRadius)
    }
    
    return result
  }
  
  /**
   * Process a single pixel - blur requires neighborhood access
   */
  protected async processPixel(
    r: number,
    g: number,
    b: number,
    a: number,
    _filterParams: { radius: number }
  ): Promise<[number, number, number, number]> {
    // Single pixel processing not applicable for blur
    // Return unchanged - actual blur is done in applyFilter
    return [r, g, b, a]
  }
  
  /**
   * Apply box blur to image data
   */
  private applyBoxBlur(imageData: ImageData, radius: number): ImageData {
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(data)
    
    // Horizontal pass
    const temp = new Uint8ClampedArray(data.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0
        let count = 0
        
        // Sample neighboring pixels
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.max(0, Math.min(width - 1, x + dx))
          const idx = (y * width + sx) * 4
          
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          a += data[idx + 3]
          count++
        }
        
        const idx = (y * width + x) * 4
        temp[idx] = Math.round(r / count)
        temp[idx + 1] = Math.round(g / count)
        temp[idx + 2] = Math.round(b / count)
        temp[idx + 3] = Math.round(a / count)
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0
        let count = 0
        
        // Sample neighboring pixels
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = Math.max(0, Math.min(height - 1, y + dy))
          const idx = (sy * width + x) * 4
          
          r += temp[idx]
          g += temp[idx + 1]
          b += temp[idx + 2]
          a += temp[idx + 3]
          count++
        }
        
        const idx = (y * width + x) * 4
        output[idx] = Math.round(r / count)
        output[idx + 1] = Math.round(g / count)
        output[idx + 2] = Math.round(b / count)
        output[idx + 3] = Math.round(a / count)
      }
    }
    
    return new ImageData(output, width, height)
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applyBlur(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  if (radius === 0) {
    return new Uint8ClampedArray(pixelData)
  }
  
  const result = new Uint8ClampedArray(pixelData)
  const boxRadius = Math.ceil((radius / 100) * 10)
  const passes = 3
  
  // Create temporary buffer for blur operations
  const temp = new Uint8ClampedArray(pixelData.length)
  const current = result
  
  for (let pass = 0; pass < passes; pass++) {
    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        // Check mask if provided
        if (mask && mask[idx + 3] === 0) {
          // Copy unmasked pixel unchanged
          temp[idx] = current[idx]
          temp[idx + 1] = current[idx + 1]
          temp[idx + 2] = current[idx + 2]
          temp[idx + 3] = current[idx + 3]
          continue
        }
        
        let r = 0, g = 0, b = 0, a = 0
        let count = 0
        
        for (let dx = -boxRadius; dx <= boxRadius; dx++) {
          const sx = Math.max(0, Math.min(width - 1, x + dx))
          const sidx = (y * width + sx) * 4
          
          // Only sample if within mask
          if (!mask || mask[sidx + 3] > 0) {
            r += current[sidx]
            g += current[sidx + 1]
            b += current[sidx + 2]
            a += current[sidx + 3]
            count++
          }
        }
        
        if (count > 0) {
          temp[idx] = Math.round(r / count)
          temp[idx + 1] = Math.round(g / count)
          temp[idx + 2] = Math.round(b / count)
          temp[idx + 3] = Math.round(a / count)
        }
      }
    }
    
    // Vertical pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        // Check mask if provided
        if (mask && mask[idx + 3] === 0) {
          // Copy unmasked pixel unchanged
          current[idx] = pixelData[idx]
          current[idx + 1] = pixelData[idx + 1]
          current[idx + 2] = pixelData[idx + 2]
          current[idx + 3] = pixelData[idx + 3]
          continue
        }
        
        let r = 0, g = 0, b = 0, a = 0
        let count = 0
        
        for (let dy = -boxRadius; dy <= boxRadius; dy++) {
          const sy = Math.max(0, Math.min(height - 1, y + dy))
          const sidx = (sy * width + x) * 4
          
          // Only sample if within mask
          if (!mask || mask[sidx + 3] > 0) {
            r += temp[sidx]
            g += temp[sidx + 1]
            b += temp[sidx + 2]
            a += temp[sidx + 3]
            count++
          }
        }
        
        if (count > 0) {
          current[idx] = Math.round(r / count)
          current[idx + 1] = Math.round(g / count)
          current[idx + 2] = Math.round(b / count)
          current[idx + 3] = Math.round(a / count)
        }
      }
    }
  }
  
  return current
} 