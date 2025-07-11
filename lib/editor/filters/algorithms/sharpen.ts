/* eslint-disable @typescript-eslint/no-unused-vars */
import { SelectionAwareFilter } from '../SelectionAwareFilter'
import { applyBlur } from './blur'
import type { FabricImage } from 'fabric'
import type { PixelSelection } from '@/types'

/**
 * Sharpen filter algorithm
 * Uses unsharp mask approach: original + strength * (original - blurred)
 */
export class SharpenFilter extends SelectionAwareFilter {
  /**
   * Apply sharpen to entire image using unsharp mask
   */
  protected async applyFilter(imageData: ImageData, filterParams: { strength: number }): Promise<ImageData> {
    const strength = Math.max(0, filterParams.strength || 0) / 100 // Convert percentage to 0-1 range
    
    console.log('[SharpenFilter] applyFilter called with strength:', filterParams.strength, '→', strength)
    
    if (strength === 0) {
      console.log('[SharpenFilter] Strength is 0, returning original image')
      // No sharpening needed
      return imageData
    }
    
    // Unsharp mask algorithm:
    // 1. Create blurred version of the image
    // 2. Subtract blurred from original to get details
    // 3. Add scaled details back to original
    
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(data)
    
    console.log('[SharpenFilter] Creating blurred version for unsharp mask')
    
    // Create blurred version with a small radius
    // Typical unsharp mask uses radius 1-3 pixels
    const blurRadius = 20; // This will be scaled down in applyBlur (20/100 * 10 = 2 pixels)
    const blurred = applyBlur(data, width, height, blurRadius)
    
    console.log('[SharpenFilter] Applying unsharp mask formula')
    
    // Apply unsharp mask formula: output = original + strength * (original - blurred)
    for (let i = 0; i < data.length; i += 4) {
      // Calculate the detail (high frequency) component
      const detailR = data[i] - blurred[i]
      const detailG = data[i + 1] - blurred[i + 1]
      const detailB = data[i + 2] - blurred[i + 2]
      
      // Add scaled detail back to original
      // Use a scaling factor to control the amount of sharpening
      const scaleFactor = 1 + (strength * 2) // Scale strength to 1-3 range
      output[i] = this.clamp(data[i] + detailR * scaleFactor)
      output[i + 1] = this.clamp(data[i + 1] + detailG * scaleFactor)
      output[i + 2] = this.clamp(data[i + 2] + detailB * scaleFactor)
      output[i + 3] = data[i + 3] // Keep alpha unchanged
    }
    
    console.log('[SharpenFilter] Sharpen complete')
    return new ImageData(output, width, height)
  }
  
  /**
   * Apply sharpen filter only to selected pixels
   * Override the base implementation because sharpen needs neighborhood access
   */
  protected async applyToSelection(
    imageData: ImageData,
    selection: PixelSelection,
    filterParams: { strength: number },
    image?: FabricImage
  ): Promise<ImageData> {
    console.log('[SharpenFilter] applyToSelection override - using mask-aware sharpen')
    
    const strength = Math.max(0, filterParams.strength || 0) / 100
    
    if (strength === 0) {
      console.log('[SharpenFilter] Strength is 0, returning original image')
      return imageData
    }
    
    // Get transformation from canvas space to image space
    let scaleX = 1, scaleY = 1
    let imgLeft = 0, imgTop = 0
    
    if (image) {
      const imgBounds = image.getBoundingRect()
      const imgElement = image.getElement() as HTMLImageElement
      const naturalWidth = imgElement.naturalWidth || imgElement.width
      const naturalHeight = imgElement.naturalHeight || imgElement.height
      
      scaleX = naturalWidth / imgBounds.width
      scaleY = naturalHeight / imgBounds.height
      imgLeft = imgBounds.left
      imgTop = imgBounds.top
    }
    
    // Create a mask in image space
    const imageMask = new Uint8ClampedArray(imageData.width * imageData.height * 4)
    
    // Transform selection mask to image space
    for (let y = 0; y < selection.mask.height; y++) {
      for (let x = 0; x < selection.mask.width; x++) {
        const maskIndex = (y * selection.mask.width + x) * 4 + 3
        const alpha = selection.mask.data[maskIndex]
        
        if (alpha > 0) {
          const imageX = Math.round((x - imgLeft) * scaleX)
          const imageY = Math.round((y - imgTop) * scaleY)
          
          if (imageX >= 0 && imageX < imageData.width && 
              imageY >= 0 && imageY < imageData.height) {
            const imageIndex = (imageY * imageData.width + imageX) * 4 + 3
            imageMask[imageIndex] = alpha
          }
        }
      }
    }
    
    // Apply sharpen using the mask
    const result = applySharpen(
      imageData.data,
      imageData.width,
      imageData.height,
      filterParams.strength,
      imageMask
    )
    
    return new ImageData(result, imageData.width, imageData.height)
  }
  
  /**
   * Process a single pixel
   */
  protected async processPixel(
    r: number,
    g: number,
    b: number,
    a: number,
    _filterParams: { strength: number }
  ): Promise<[number, number, number, number]> {
    // This method should not be called for sharpen
    // The parent class applyToSelection is overridden
    throw new Error('[SharpenFilter] processPixel should not be called - use applyToSelection override')
  }
}

/**
 * Pure function version for use in workers or other contexts
 * Implements unsharp mask: output = original + strength * (original - blurred)
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
  
  // Create blurred version for unsharp mask
  const blurRadius = 20; // Will be scaled to ~2 pixels in applyBlur
  const blurred = applyBlur(pixelData, width, height, blurRadius, mask)
  
  // Apply unsharp mask formula
  const scaleFactor = 1 + ((strength / 100) * 2) // Scale to 1-3 range
  
  for (let i = 0; i < pixelData.length; i += 4) {
    // Check mask if provided
    if (mask && mask[i + 3] === 0) {
      // Skip unmasked pixels
      continue
    }
    
    // Calculate detail component (high frequencies)
    const detailR = pixelData[i] - blurred[i]
    const detailG = pixelData[i + 1] - blurred[i + 1]
    const detailB = pixelData[i + 2] - blurred[i + 2]
    
    // Add scaled detail back to original
    result[i] = Math.max(0, Math.min(255, Math.round(pixelData[i] + detailR * scaleFactor)))
    result[i + 1] = Math.max(0, Math.min(255, Math.round(pixelData[i + 1] + detailG * scaleFactor)))
    result[i + 2] = Math.max(0, Math.min(255, Math.round(pixelData[i + 2] + detailB * scaleFactor)))
    result[i + 3] = pixelData[i + 3] // Keep alpha unchanged
  }
  
  return result
}

/**
 * Alternative implementation using high-pass filter approach
 * This provides more control over the sharpening effect
 */
export function applySharpenHighPass(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  radius: number = 1.5,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  if (strength === 0) {
    return new Uint8ClampedArray(pixelData)
  }
  
  const result = new Uint8ClampedArray(pixelData)
  
  // Create Gaussian kernel for the specified radius
  const kernelSize = Math.ceil(radius * 2) * 2 + 1
  const kernel = createGaussianKernel(kernelSize, radius)
  
  // Apply Gaussian blur
  const blurred = applyGaussianBlur(pixelData, width, height, kernel, kernelSize, mask)
  
  // Apply unsharp mask with more precise control
  const amount = (strength / 100) * 1.5 // Scale to 0-1.5 range
  const threshold = 0 // Can be adjusted to prevent sharpening of noise
  
  for (let i = 0; i < pixelData.length; i += 4) {
    if (mask && mask[i + 3] === 0) {
      continue
    }
    
    // Calculate the difference (high-pass filter)
    const diffR = pixelData[i] - blurred[i]
    const diffG = pixelData[i + 1] - blurred[i + 1]
    const diffB = pixelData[i + 2] - blurred[i + 2]
    
    // Apply threshold to reduce noise amplification
    const applyR = Math.abs(diffR) > threshold ? diffR : 0
    const applyG = Math.abs(diffG) > threshold ? diffG : 0
    const applyB = Math.abs(diffB) > threshold ? diffB : 0
    
    // Add the sharpening
    result[i] = Math.max(0, Math.min(255, pixelData[i] + applyR * amount))
    result[i + 1] = Math.max(0, Math.min(255, pixelData[i + 1] + applyG * amount))
    result[i + 2] = Math.max(0, Math.min(255, pixelData[i + 2] + applyB * amount))
    result[i + 3] = pixelData[i + 3]
  }
  
  return result
}

/**
 * Create a Gaussian kernel for convolution
 */
function createGaussianKernel(size: number, sigma: number): Float32Array {
  const kernel = new Float32Array(size * size)
  const center = Math.floor(size / 2)
  let sum = 0
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma))
      kernel[y * size + x] = value
      sum += value
    }
  }
  
  // Normalize
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= sum
  }
  
  return kernel
}

/**
 * Apply Gaussian blur using a precomputed kernel
 */
function applyGaussianBlur(
  pixelData: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: Float32Array,
  kernelSize: number,
  mask?: Uint8ClampedArray
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(pixelData.length)
  const halfKernel = Math.floor(kernelSize / 2)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      
      if (mask && mask[idx + 3] === 0) {
        result[idx] = pixelData[idx]
        result[idx + 1] = pixelData[idx + 1]
        result[idx + 2] = pixelData[idx + 2]
        result[idx + 3] = pixelData[idx + 3]
        continue
      }
      
      let r = 0, g = 0, b = 0, a = 0
      let kernelSum = 0
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = x + kx - halfKernel
          const sy = y + ky - halfKernel
          
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const sidx = (sy * width + sx) * 4
            const kernelValue = kernel[ky * kernelSize + kx]
            
            if (!mask || mask[sidx + 3] > 0) {
              r += pixelData[sidx] * kernelValue
              g += pixelData[sidx + 1] * kernelValue
              b += pixelData[sidx + 2] * kernelValue
              a += pixelData[sidx + 3] * kernelValue
              kernelSum += kernelValue
            }
          }
        }
      }
      
      if (kernelSum > 0) {
        result[idx] = Math.round(r / kernelSum)
        result[idx + 1] = Math.round(g / kernelSum)
        result[idx + 2] = Math.round(b / kernelSum)
        result[idx + 3] = Math.round(a / kernelSum)
      } else {
        result[idx] = pixelData[idx]
        result[idx + 1] = pixelData[idx + 1]
        result[idx + 2] = pixelData[idx + 2]
        result[idx + 3] = pixelData[idx + 3]
      }
    }
  }
  
  return result
} 