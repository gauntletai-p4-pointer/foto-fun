import { PixelSelection, SelectionMode } from '@/types'

/**
 * SelectionOperations - Handles all selection modifications
 * 
 * This class provides pure functions for selection operations like
 * expand, contract, feather, and boolean operations.
 */
export class SelectionOperations {
  /**
   * Find bounds of non-transparent pixels in mask
   */
  findBounds(mask: ImageData): { x: number; y: number; width: number; height: number } {
    let minX = mask.width
    let minY = mask.height
    let maxX = 0
    let maxY = 0
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const alpha = mask.data[(y * mask.width + x) * 4 + 3]
        if (alpha > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    if (minX > maxX || minY > maxY) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  }
  
  /**
   * Combine two selections based on mode
   */
  combine(
    existing: PixelSelection,
    newSelection: PixelSelection,
    mode: SelectionMode
  ): PixelSelection {
    // Calculate combined bounds
    const bounds = this.combineBounds(existing.bounds, newSelection.bounds, mode)
    const mask = new ImageData(bounds.width, bounds.height)
    
    // Copy existing selection to new mask
    this.copyToMask(existing, mask, bounds)
    
    // Apply new selection based on mode
    switch (mode) {
      case 'add':
        this.addToMask(newSelection, mask, bounds)
        break
      case 'subtract':
        this.subtractFromMask(newSelection, mask, bounds)
        break
      case 'intersect':
        this.intersectWithMask(newSelection, mask, bounds)
        break
    }
    
    return { type: 'pixel', mask, bounds }
  }
  
  /**
   * Invert selection
   */
  invert(
    selection: PixelSelection | null,
    canvasSize: { width: number; height: number }
  ): PixelSelection {
    const mask = new ImageData(canvasSize.width, canvasSize.height)
    
    // Fill with white (fully selected)
    for (let i = 3; i < mask.data.length; i += 4) {
      mask.data[i] = 255
    }
    
    // Subtract existing selection
    if (selection) {
      const { bounds } = selection
      for (let y = 0; y < selection.mask.height; y++) {
        for (let x = 0; x < selection.mask.width; x++) {
          const srcIndex = (y * selection.mask.width + x) * 4 + 3
          const dstX = x + bounds.x
          const dstY = y + bounds.y
          
          if (dstX >= 0 && dstX < mask.width && dstY >= 0 && dstY < mask.height) {
            const dstIndex = (dstY * mask.width + dstX) * 4 + 3
            mask.data[dstIndex] = 255 - selection.mask.data[srcIndex]
          }
        }
      }
    }
    
    return {
      type: 'pixel',
      mask,
      bounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height }
    }
  }
  
  /**
   * Expand selection by dilating the mask
   */
  expand(selection: PixelSelection, pixels: number): PixelSelection {
    const radius = Math.round(pixels)
    const { mask, bounds } = selection
    
    // Create expanded bounds
    const newBounds = {
      x: Math.max(0, bounds.x - radius),
      y: Math.max(0, bounds.y - radius),
      width: bounds.width + radius * 2,
      height: bounds.height + radius * 2
    }
    
    const newMask = new ImageData(newBounds.width, newBounds.height)
    
    // Morphological dilation
    for (let y = 0; y < newMask.height; y++) {
      for (let x = 0; x < newMask.width; x++) {
        let maxAlpha = 0
        
        // Check neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const srcX = x + dx - radius
            const srcY = y + dy - radius
            
            if (srcX >= 0 && srcX < mask.width && srcY >= 0 && srcY < mask.height) {
              const srcIndex = (srcY * mask.width + srcX) * 4 + 3
              maxAlpha = Math.max(maxAlpha, mask.data[srcIndex])
            }
          }
        }
        
        const dstIndex = (y * newMask.width + x) * 4 + 3
        newMask.data[dstIndex] = maxAlpha
      }
    }
    
    return { type: 'pixel', mask: newMask, bounds: newBounds }
  }
  
  /**
   * Contract selection by eroding the mask
   */
  contract(selection: PixelSelection, pixels: number): PixelSelection {
    const radius = Math.round(pixels)
    const { mask } = selection
    
    // Create contracted mask (same size for now)
    const newMask = new ImageData(mask.width, mask.height)
    
    // Morphological erosion
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        let minAlpha = 255
        
        // Check neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const srcX = x + dx
            const srcY = y + dy
            
            if (srcX >= 0 && srcX < mask.width && srcY >= 0 && srcY < mask.height) {
              const srcIndex = (srcY * mask.width + srcX) * 4 + 3
              minAlpha = Math.min(minAlpha, mask.data[srcIndex])
            } else {
              minAlpha = 0 // Outside bounds = not selected
            }
          }
        }
        
        const dstIndex = (y * mask.width + x) * 4 + 3
        newMask.data[dstIndex] = minAlpha
      }
    }
    
    // Recalculate bounds
    const newBounds = this.findBounds(newMask)
    
    return { type: 'pixel', mask: newMask, bounds: newBounds }
  }
  
  /**
   * Feather selection edges with Gaussian blur
   */
  feather(selection: PixelSelection, radius: number): PixelSelection {
    if (radius <= 0) return selection
    
    const { mask } = selection
    const newMask = this.gaussianBlur(mask, radius)
    
    return { type: 'pixel', mask: newMask, bounds: selection.bounds }
  }
  
  /**
   * Smooth selection edges
   */
  smooth(selection: PixelSelection, radius: number): PixelSelection {
    const { mask, bounds } = selection
    
    // Apply median filter for smoothing
    const smoothed = this.medianFilter(mask, radius)
    
    return { type: 'pixel', mask: smoothed, bounds }
  }
  
  /**
   * Transform selection with matrix
   */
  transform(selection: PixelSelection, matrix: DOMMatrix): PixelSelection {
    const { mask, bounds } = selection
    
    // Calculate new bounds after transformation
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    ]
    
    const transformedCorners = corners.map(p => {
      const pt = matrix.transformPoint(new DOMPoint(p.x, p.y))
      return { x: pt.x, y: pt.y }
    })
    
    const minX = Math.min(...transformedCorners.map(p => p.x))
    const minY = Math.min(...transformedCorners.map(p => p.y))
    const maxX = Math.max(...transformedCorners.map(p => p.x))
    const maxY = Math.max(...transformedCorners.map(p => p.y))
    
    const newBounds = {
      x: Math.floor(minX),
      y: Math.floor(minY),
      width: Math.ceil(maxX - minX),
      height: Math.ceil(maxY - minY)
    }
    
    // Create transformed mask
    const newMask = new ImageData(newBounds.width, newBounds.height)
    const inverseMatrix = matrix.inverse()
    
    // Sample from original mask using inverse transformation
    for (let y = 0; y < newBounds.height; y++) {
      for (let x = 0; x < newBounds.width; x++) {
        const worldX = x + newBounds.x
        const worldY = y + newBounds.y
        
        const srcPt = inverseMatrix.transformPoint(new DOMPoint(worldX, worldY))
        const srcX = srcPt.x - bounds.x
        const srcY = srcPt.y - bounds.y
        
        if (srcX >= 0 && srcX < mask.width && srcY >= 0 && srcY < mask.height) {
          // Bilinear interpolation
          const alpha = this.bilinearSample(mask, srcX, srcY)
          const dstIndex = (y * newMask.width + x) * 4 + 3
          newMask.data[dstIndex] = alpha
        }
      }
    }
    
    return { type: 'pixel', mask: newMask, bounds: newBounds }
  }
  
  // Helper methods
  
  private combineBounds(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, mode: SelectionMode): { x: number; y: number; width: number; height: number } {
    if (mode === 'intersect') {
      const x = Math.max(a.x, b.x)
      const y = Math.max(a.y, b.y)
      const x2 = Math.min(a.x + a.width, b.x + b.width)
      const y2 = Math.min(a.y + a.height, b.y + b.height)
      
      if (x2 < x || y2 < y) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
      
      return {
        x,
        y,
        width: x2 - x,
        height: y2 - y
      }
    }
    
    // For add, subtract, use union of bounds
    const minX = Math.min(a.x, b.x)
    const minY = Math.min(a.y, b.y)
    const maxX = Math.max(a.x + a.width, b.x + b.width)
    const maxY = Math.max(a.y + a.height, b.y + b.height)
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  private copyToMask(source: PixelSelection, dest: ImageData, destBounds: { x: number; y: number; width: number; height: number }): void {
    const { mask, bounds } = source
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const srcIndex = (y * mask.width + x) * 4 + 3
        const worldX = x + bounds.x
        const worldY = y + bounds.y
        const destX = worldX - destBounds.x
        const destY = worldY - destBounds.y
        
        if (destX >= 0 && destX < dest.width && destY >= 0 && destY < dest.height) {
          const destIndex = (destY * dest.width + destX) * 4 + 3
          dest.data[destIndex] = mask.data[srcIndex]
        }
      }
    }
  }
  
  private addToMask(source: PixelSelection, dest: ImageData, destBounds: { x: number; y: number; width: number; height: number }): void {
    const { mask, bounds } = source
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const srcIndex = (y * mask.width + x) * 4 + 3
        const worldX = x + bounds.x
        const worldY = y + bounds.y
        const destX = worldX - destBounds.x
        const destY = worldY - destBounds.y
        
        if (destX >= 0 && destX < dest.width && destY >= 0 && destY < dest.height) {
          const destIndex = (destY * dest.width + destX) * 4 + 3
          dest.data[destIndex] = Math.max(dest.data[destIndex], mask.data[srcIndex])
        }
      }
    }
  }
  
  private subtractFromMask(source: PixelSelection, dest: ImageData, destBounds: { x: number; y: number; width: number; height: number }): void {
    const { mask, bounds } = source
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const srcIndex = (y * mask.width + x) * 4 + 3
        const worldX = x + bounds.x
        const worldY = y + bounds.y
        const destX = worldX - destBounds.x
        const destY = worldY - destBounds.y
        
        if (destX >= 0 && destX < dest.width && destY >= 0 && destY < dest.height) {
          const destIndex = (destY * dest.width + destX) * 4 + 3
          dest.data[destIndex] = Math.max(0, dest.data[destIndex] - mask.data[srcIndex])
        }
      }
    }
  }
  
  private intersectWithMask(source: PixelSelection, dest: ImageData, destBounds: { x: number; y: number; width: number; height: number }): void {
    // First, create a temporary mask to hold the intersection
    const temp = new ImageData(dest.width, dest.height)
    
    const { mask, bounds } = source
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const srcIndex = (y * mask.width + x) * 4 + 3
        const worldX = x + bounds.x
        const worldY = y + bounds.y
        const destX = worldX - destBounds.x
        const destY = worldY - destBounds.y
        
        if (destX >= 0 && destX < dest.width && destY >= 0 && destY < dest.height) {
          const destIndex = (destY * dest.width + destX) * 4 + 3
          temp.data[destIndex] = Math.min(dest.data[destIndex], mask.data[srcIndex])
        }
      }
    }
    
    // Copy temp back to dest
    dest.data.set(temp.data)
  }
  
  private gaussianBlur(imageData: ImageData, radius: number): ImageData {
    const output = new ImageData(imageData.width, imageData.height)
    const kernel = this.createGaussianKernel(radius)
    const kernelSize = Math.floor(Math.sqrt(kernel.length))
    const halfKernel = Math.floor(kernelSize / 2)
    
    // Apply convolution
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let sum = 0
        let kernelSum = 0
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const sx = x + kx - halfKernel
            const sy = y + ky - halfKernel
            
            if (sx >= 0 && sx < imageData.width && sy >= 0 && sy < imageData.height) {
              const srcIndex = (sy * imageData.width + sx) * 4 + 3
              const kernelIndex = ky * kernelSize + kx
              sum += imageData.data[srcIndex] * kernel[kernelIndex]
              kernelSum += kernel[kernelIndex]
            }
          }
        }
        
        const dstIndex = (y * imageData.width + x) * 4 + 3
        output.data[dstIndex] = Math.round(sum / kernelSum)
      }
    }
    
    return output
  }
  
  private medianFilter(imageData: ImageData, radius: number): ImageData {
    const output = new ImageData(imageData.width, imageData.height)
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const values: number[] = []
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sx = x + dx
            const sy = y + dy
            
            if (sx >= 0 && sx < imageData.width && sy >= 0 && sy < imageData.height) {
              const srcIndex = (sy * imageData.width + sx) * 4 + 3
              values.push(imageData.data[srcIndex])
            }
          }
        }
        
        values.sort((a, b) => a - b)
        const median = values[Math.floor(values.length / 2)]
        
        const dstIndex = (y * imageData.width + x) * 4 + 3
        output.data[dstIndex] = median
      }
    }
    
    return output
  }
  
  private createGaussianKernel(radius: number): number[] {
    const size = radius * 2 + 1
    const kernel = new Array(size * size)
    const sigma = radius / 3
    const twoSigmaSquare = 2 * sigma * sigma
    let sum = 0
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius
        const dy = y - radius
        const distance = dx * dx + dy * dy
        const value = Math.exp(-distance / twoSigmaSquare)
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
  
  private bilinearSample(imageData: ImageData, x: number, y: number): number {
    const x0 = Math.floor(x)
    const x1 = Math.ceil(x)
    const y0 = Math.floor(y)
    const y1 = Math.ceil(y)
    
    const fx = x - x0
    const fy = y - y0
    
    // Get values at corners
    const v00 = this.getPixelAlpha(imageData, x0, y0)
    const v10 = this.getPixelAlpha(imageData, x1, y0)
    const v01 = this.getPixelAlpha(imageData, x0, y1)
    const v11 = this.getPixelAlpha(imageData, x1, y1)
    
    // Bilinear interpolation
    const v0 = v00 * (1 - fx) + v10 * fx
    const v1 = v01 * (1 - fx) + v11 * fx
    
    return v0 * (1 - fy) + v1 * fy
  }
  
  private getPixelAlpha(imageData: ImageData, x: number, y: number): number {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
      return 0
    }
    
    const index = (y * imageData.width + x) * 4 + 3
    return imageData.data[index]
  }
} 