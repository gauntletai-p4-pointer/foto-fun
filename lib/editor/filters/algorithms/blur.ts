/* eslint-disable @typescript-eslint/no-unused-vars */
import { SelectionAwareFilter } from '../SelectionAwareFilter'
import type { FabricImage } from 'fabric'
import type { PixelSelection } from '@/types'

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
    
    console.log('[BlurFilter] applyFilter called with radius:', filterParams.radius, '→', radius)
    
    if (radius === 0) {
      console.log('[BlurFilter] Radius is 0, returning original image')
      // No blur needed
      return imageData
    }
    
    // Fabric.js blur uses a box blur approximation
    // We'll use the same approach for consistency
    const passes = 3 // Number of box blur passes to approximate Gaussian
    const boxRadius = Math.ceil(radius * 10) // Scale to pixel radius
    
    console.log('[BlurFilter] Applying box blur with radius:', boxRadius, 'passes:', passes)
    
    let result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Apply box blur multiple times
    for (let pass = 0; pass < passes; pass++) {
      console.log('[BlurFilter] Applying pass', pass + 1, 'of', passes)
      result = this.applyBoxBlur(result, boxRadius)
    }
    
    console.log('[BlurFilter] Blur complete')
    return result
  }
  
  /**
   * Apply blur filter only to selected pixels
   * Override the base implementation because blur needs neighborhood access
   */
  protected async applyToSelection(
    imageData: ImageData,
    selection: PixelSelection,
    filterParams: { radius: number },
    image?: FabricImage
  ): Promise<ImageData> {
    console.log('[BlurFilter] applyToSelection override - using mask-aware blur')
    
    const radius = Math.max(0, filterParams.radius || 0) / 100
    
    if (radius === 0) {
      console.log('[BlurFilter] Radius is 0, returning original image')
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
    // The selection mask is full canvas size, so we use absolute coordinates
    const { mask, bounds } = selection
    const startY = Math.max(0, Math.floor(bounds.y))
    const endY = Math.min(mask.height, Math.ceil(bounds.y + bounds.height))
    const startX = Math.max(0, Math.floor(bounds.x))
    const endX = Math.min(mask.width, Math.ceil(bounds.x + bounds.width))
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const maskIndex = (y * mask.width + x) * 4 + 3
        const alpha = mask.data[maskIndex]
        
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
    
    // Apply blur using the mask
    const result = applyBlur(
      imageData.data,
      imageData.width,
      imageData.height,
      filterParams.radius,
      imageMask
    )
    
    return new ImageData(result, imageData.width, imageData.height)
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
    // This method should not be called for blur
    // The parent class applyToSelection is overridden
    throw new Error('[BlurFilter] processPixel should not be called - use applyToSelection override')
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