/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'
import type { LayerAwareSelectionManager } from '../selection/LayerAwareSelectionManager'
import type { PixelSelection } from '@/types'

export interface FilterProgress {
  current: number
  total: number
  message?: string
}

export type FilterProgressCallback = (progress: FilterProgress) => void

/**
 * SelectionAwareFilter - Base class for applying filters to selected regions
 * 
 * This class provides the infrastructure for applying image filters only to
 * pixels within a selection mask, preserving unselected areas.
 */
export abstract class SelectionAwareFilter {
  protected canvas: Canvas
  protected selectionManager: LayerAwareSelectionManager
  protected progressCallback?: FilterProgressCallback
  
  constructor(canvas: Canvas, selectionManager: LayerAwareSelectionManager) {
    this.canvas = canvas
    this.selectionManager = selectionManager
  }
  
  /**
   * Set progress callback for long operations
   */
  setProgressCallback(callback: FilterProgressCallback): void {
    this.progressCallback = callback
  }
  
  /**
   * Apply filter to image with optional selection mask
   */
  async applyToImage(
    image: FabricImage,
    filterParams: any,
    selection?: PixelSelection
  ): Promise<ImageData> {
    console.log('[SelectionAwareFilter] applyToImage called:', {
      filterType: this.constructor.name,
      filterParams,
      hasSelection: !!selection,
      selectionBounds: selection?.bounds
    })
    
    // Get the actual image element and its natural dimensions
    const imgElement = image.getElement() as HTMLImageElement
    const width = imgElement.naturalWidth || imgElement.width
    const height = imgElement.naturalHeight || imgElement.height
    
    console.log('[SelectionAwareFilter] Image dimensions:', { width, height })
    
    // Create canvas for processing at natural size
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const ctx = tempCanvas.getContext('2d')!
    
    // Draw the image at its natural size
    ctx.drawImage(imgElement, 0, 0, width, height)
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height)
    
    // Apply filter
    if (selection) {
      console.log('[SelectionAwareFilter] Applying filter to selection')
      // Apply filter only to selected pixels
      const filteredData = await this.applyToSelection(imageData, selection, filterParams, image)
      return filteredData
    } else {
      console.log('[SelectionAwareFilter] Applying filter to entire image')
      // Apply filter to entire image
      const filteredData = await this.applyFilter(imageData, filterParams)
      return filteredData
    }
  }
  
  /**
   * Apply filter only to selected pixels
   */
  protected async applyToSelection(
    imageData: ImageData,
    selection: PixelSelection,
    filterParams: any,
    image?: FabricImage
  ): Promise<ImageData> {
    console.log('[SelectionAwareFilter] applyToSelection called:', {
      filterType: this.constructor.name,
      maskSize: { width: selection.mask.width, height: selection.mask.height },
      selectionBounds: selection.bounds,
      imageBounds: image ? image.getBoundingRect() : 'no image'
    })
    
    // Create a copy of the image data
    const resultData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    )
    
    // Apply filter only to selected pixels
    const { mask, bounds } = selection
    
    // Get transformation from canvas space to image space
    let scaleX = 1, scaleY = 1
    let imgLeft = 0, imgTop = 0
    
    if (image) {
      // Get image transformation
      const imgBounds = image.getBoundingRect()
      const imgElement = image.getElement() as HTMLImageElement
      const naturalWidth = imgElement.naturalWidth || imgElement.width
      const naturalHeight = imgElement.naturalHeight || imgElement.height
      
      // Calculate scale factors
      scaleX = naturalWidth / imgBounds.width
      scaleY = naturalHeight / imgBounds.height
      
      // Store image position for coordinate transformation
      imgLeft = imgBounds.left
      imgTop = imgBounds.top
    }
    
    // Report progress
    this.reportProgress(0, bounds.height, 'Processing selected pixels...')
    
    // Safety check to prevent infinite loops
    let processedPixels = 0
    const maxPixels = bounds.width * bounds.height
    
    // Process only the area within the selection bounds
    // The mask is full canvas size, so we need to use absolute coordinates
    const startY = Math.max(0, Math.floor(bounds.y))
    const endY = Math.min(mask.height, Math.ceil(bounds.y + bounds.height))
    const startX = Math.max(0, Math.floor(bounds.x))
    const endX = Math.min(mask.width, Math.ceil(bounds.x + bounds.width))
    
    // Process row by row for efficiency and progress reporting
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const maskIndex = (y * mask.width + x) * 4 + 3 // Alpha channel
        const alpha = mask.data[maskIndex]
        
        if (alpha > 0) {
          // Safety check
          processedPixels++
          if (processedPixels > maxPixels * 2) {
            console.error('[SelectionAwareFilter] Too many pixels processed, possible infinite loop')
            throw new Error('Filter processing exceeded expected pixel count')
          }
          
          // This pixel is selected
          // x and y are already in canvas space (absolute coordinates)
          // Transform canvas coordinates to image coordinates
          const imageX = Math.round((x - imgLeft) * scaleX)
          const imageY = Math.round((y - imgTop) * scaleY)
          
          if (imageX >= 0 && imageX < imageData.width && 
              imageY >= 0 && imageY < imageData.height) {
            const imageIndex = (imageY * imageData.width + imageX) * 4
            
            // Apply filter to this pixel
            const filteredPixel = await this.processPixel(
              imageData.data[imageIndex],
              imageData.data[imageIndex + 1],
              imageData.data[imageIndex + 2],
              imageData.data[imageIndex + 3],
              filterParams
            )
            
            // Blend based on selection strength
            const blendFactor = alpha / 255
            resultData.data[imageIndex] = Math.round(
              imageData.data[imageIndex] * (1 - blendFactor) + 
              filteredPixel[0] * blendFactor
            )
            resultData.data[imageIndex + 1] = Math.round(
              imageData.data[imageIndex + 1] * (1 - blendFactor) + 
              filteredPixel[1] * blendFactor
            )
            resultData.data[imageIndex + 2] = Math.round(
              imageData.data[imageIndex + 2] * (1 - blendFactor) + 
              filteredPixel[2] * blendFactor
            )
            // Alpha channel remains unchanged
            resultData.data[imageIndex + 3] = imageData.data[imageIndex + 3]
          }
        }
      }
      
      // Report progress every 10 rows
      if ((y - startY) % 10 === 0) {
        this.reportProgress(y - startY, bounds.height, 'Processing selected pixels...')
      }
    }
    
    this.reportProgress(bounds.height, bounds.height, 'Complete')
    
    return resultData
  }
  
  /**
   * Apply filter to entire image data
   */
  protected abstract applyFilter(imageData: ImageData, filterParams: any): Promise<ImageData>
  
  /**
   * Process a single pixel - to be implemented by subclasses
   */
  protected abstract processPixel(
    r: number,
    g: number,
    b: number,
    a: number,
    filterParams: any
  ): Promise<[number, number, number, number]>
  
  /**
   * Report progress
   */
  protected reportProgress(current: number, total: number, message?: string): void {
    if (this.progressCallback) {
      this.progressCallback({ current, total, message })
    }
  }
  
  /**
   * Create a new image from filtered data
   */
  async createFilteredImage(
    originalImage: FabricImage,
    filteredData: ImageData
  ): Promise<FabricImage> {
    // Create a new canvas with the filtered data
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = filteredData.width
    tempCanvas.height = filteredData.height
    const ctx = tempCanvas.getContext('2d')!
    ctx.putImageData(filteredData, 0, 0)
    
    // Create a new fabric image from the canvas
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create blob from filtered image')
        }
        
        const url = URL.createObjectURL(blob)
        const img = new Image()
        
        img.onload = () => {
          const fabricImage = new FabricImage(img, {
            left: originalImage.left,
            top: originalImage.top,
            angle: originalImage.angle,
            scaleX: originalImage.scaleX,
            scaleY: originalImage.scaleY,
            flipX: originalImage.flipX,
            flipY: originalImage.flipY,
            opacity: originalImage.opacity,
            // Copy other properties as needed
          })
          
          // Copy custom properties
          const customProps = ['id', 'name'] as const
          customProps.forEach(prop => {
            if (originalImage.get(prop)) {
              fabricImage.set(prop, originalImage.get(prop))
            }
          })
          
          URL.revokeObjectURL(url)
          resolve(fabricImage)
        }
        
        img.src = url
      })
    })
  }
  
  /**
   * Utility method to clamp values between 0 and 255
   */
  protected clamp(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)))
  }
} 