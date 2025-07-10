import { SelectionAwareFilter } from '../SelectionAwareFilter'

/**
 * Sharpen filter algorithm
 * Uses unsharp mask approach
 */
export class SharpenFilter extends SelectionAwareFilter {
  /**
   * Apply sharpen to entire image
   */
  protected async applyFilter(imageData: ImageData, filterParams: { strength: number }): Promise<ImageData> {
    const strength = Math.max(0, filterParams.strength || 0) / 100 // Convert percentage to 0-1 range
    
    if (strength === 0) {
      // No sharpening needed
      return imageData
    }
    
    // Use convolution kernel for sharpening
    // The kernel is scaled by strength
    const intensity = 1 + (strength * 4) // Scale 0-100 to 1-5
    const kernel = [
      0, -1, 0,
      -1, intensity, -1,
      0, -1, 0
    ]
    
    return this.applyConvolution(imageData, kernel, false)
  }
  
  /**
   * Process a single pixel - sharpen requires neighborhood access
   */
  protected async processPixel(
    r: number,
    g: number,
    b: number,
    a: number,
    filterParams: { strength: number }
  ): Promise<[number, number, number, number]> {
    // Single pixel processing not applicable for sharpen
    // Return unchanged - actual sharpening is done in applyFilter
    return [r, g, b, a]
  }
  
  /**
   * Apply convolution kernel to image data
   */
  private applyConvolution(imageData: ImageData, kernel: number[], opaque: boolean): ImageData {
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(data)
    
    // Kernel is assumed to be 3x3
    const kernelSize = 3
    const halfKernel = Math.floor(kernelSize / 2)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0
        let kernelSum = 0
        
        // Apply kernel
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const sx = x + kx - halfKernel
            const sy = y + ky - halfKernel
            
            // Handle boundaries by clamping
            const clampedX = Math.max(0, Math.min(width - 1, sx))
            const clampedY = Math.max(0, Math.min(height - 1, sy))
            
            const idx = (clampedY * width + clampedX) * 4
            const kernelVal = kernel[ky * kernelSize + kx]
            
            r += data[idx] * kernelVal
            g += data[idx + 1] * kernelVal
            b += data[idx + 2] * kernelVal
            
            if (!opaque) {
              a += data[idx + 3] * kernelVal
            }
            
            kernelSum += kernelVal
          }
        }
        
        const idx = (y * width + x) * 4
        
        // Normalize by kernel sum if needed
        if (Math.abs(kernelSum) > 0.001) {
          output[idx] = this.clamp(r / kernelSum)
          output[idx + 1] = this.clamp(g / kernelSum)
          output[idx + 2] = this.clamp(b / kernelSum)
          output[idx + 3] = opaque ? data[idx + 3] : this.clamp(a / kernelSum)
        } else {
          // Direct clamping without normalization
          output[idx] = this.clamp(r)
          output[idx + 1] = this.clamp(g)
          output[idx + 2] = this.clamp(b)
          output[idx + 3] = opaque ? data[idx + 3] : this.clamp(a)
        }
      }
    }
    
    return new ImageData(output, width, height)
  }
}

/**
 * Pure function version for use in workers or other contexts
 */
export function applySharpen(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  if (strength === 0) {
    return new Uint8ClampedArray(pixelData)
  }
  
  const result = new Uint8ClampedArray(pixelData)
  const intensity = 1 + ((strength / 100) * 4)
  const kernel = [
    0, -1, 0,
    -1, intensity, -1,
    0, -1, 0
  ]
  
  const kernelSize = 3
  const halfKernel = Math.floor(kernelSize / 2)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      
      // Check mask if provided
      if (mask && mask[idx + 3] === 0) {
        // Skip unmasked pixels
        continue
      }
      
      let r = 0, g = 0, b = 0, a = 0
      let kernelSum = 0
      
      // Apply kernel
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = x + kx - halfKernel
          const sy = y + ky - halfKernel
          
          // Handle boundaries
          const clampedX = Math.max(0, Math.min(width - 1, sx))
          const clampedY = Math.max(0, Math.min(height - 1, sy))
          
          const sidx = (clampedY * width + clampedX) * 4
          const kernelVal = kernel[ky * kernelSize + kx]
          
          // Only sample if within mask (or no mask)
          if (!mask || mask[sidx + 3] > 0) {
            r += pixelData[sidx] * kernelVal
            g += pixelData[sidx + 1] * kernelVal
            b += pixelData[sidx + 2] * kernelVal
            a += pixelData[sidx + 3] * kernelVal
            kernelSum += kernelVal
          }
        }
      }
      
      // Apply result
      if (Math.abs(kernelSum) > 0.001) {
        result[idx] = Math.max(0, Math.min(255, Math.round(r / kernelSum)))
        result[idx + 1] = Math.max(0, Math.min(255, Math.round(g / kernelSum)))
        result[idx + 2] = Math.max(0, Math.min(255, Math.round(b / kernelSum)))
        result[idx + 3] = Math.max(0, Math.min(255, Math.round(a / kernelSum)))
      } else {
        result[idx] = Math.max(0, Math.min(255, Math.round(r)))
        result[idx + 1] = Math.max(0, Math.min(255, Math.round(g)))
        result[idx + 2] = Math.max(0, Math.min(255, Math.round(b)))
        result[idx + 3] = Math.max(0, Math.min(255, Math.round(a)))
      }
    }
  }
  
  return result
} 