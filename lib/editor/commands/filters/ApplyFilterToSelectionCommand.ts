import { Command } from '../base'
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'
import type { FilterPipeline } from '../../filters/FilterPipeline'
import type { PixelSelection } from '@/types'

export interface FilterState {
  imageId: string
  originalData: ImageData
  filteredData: ImageData
  selectionBounds: { x: number; y: number; width: number; height: number }
}

/**
 * Command to apply a filter to selected regions of images
 * Stores pixel-level data for undo/redo
 */
export class ApplyFilterToSelectionCommand extends Command {
  private canvas: Canvas
  private filterPipeline: FilterPipeline
  private filterName: string
  private filterParams: any
  private targetImages: FabricImage[]
  private selection: PixelSelection
  private filterStates: FilterState[] = []
  
  constructor(
    canvas: Canvas,
    filterPipeline: FilterPipeline,
    filterName: string,
    filterParams: any,
    targetImages: FabricImage[],
    selection: PixelSelection,
    description?: string
  ) {
    super(description || `Apply ${filterName} filter to selection`)
    this.canvas = canvas
    this.filterPipeline = filterPipeline
    this.filterName = filterName
    this.filterParams = filterParams
    this.targetImages = targetImages
    this.selection = selection
  }
  
  async execute(): Promise<void> {
    // Clear previous states for redo
    this.filterStates = []
    
    // Apply filter to each image
    for (const image of this.targetImages) {
      // Get image bounds
      const bounds = image.getBoundingRect()
      
      // Create temporary canvas to get image data
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = bounds.width
      tempCanvas.height = bounds.height
      const ctx = tempCanvas.getContext('2d')!
      
      // Draw image to temp canvas
      ctx.save()
      const matrix = image.calcTransformMatrix()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      
      // Draw the image element
      const imgElement = image.getElement() as HTMLImageElement
      ctx.drawImage(
        imgElement,
        0, 0, imgElement.width, imgElement.height,
        0, 0, bounds.width, bounds.height
      )
      ctx.restore()
      
      // Get original image data
      const originalData = ctx.getImageData(0, 0, bounds.width, bounds.height)
      
      // Clone original data for filtering
      const dataToFilter = new ImageData(
        new Uint8ClampedArray(originalData.data),
        originalData.width,
        originalData.height
      )
      
      // Apply filter using the pipeline
      await this.filterPipeline.applyFilter(this.filterName, this.filterParams, [image])
      
      // Get filtered result
      ctx.clearRect(0, 0, bounds.width, bounds.height)
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const newImgElement = image.getElement() as HTMLImageElement
      ctx.drawImage(
        newImgElement,
        0, 0, newImgElement.width, newImgElement.height,
        0, 0, bounds.width, bounds.height
      )
      ctx.restore()
      
      const filteredData = ctx.getImageData(0, 0, bounds.width, bounds.height)
      
      // Store state for undo
      this.filterStates.push({
        imageId: image.get('id') as string || image.toString(),
        originalData,
        filteredData,
        selectionBounds: this.selection.bounds
      })
    }
    
    // Render canvas
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    // Restore original image data
    for (const state of this.filterStates) {
      const image = this.targetImages.find(img => 
        (img.get('id') as string || img.toString()) === state.imageId
      )
      
      if (image) {
        // Create new image from original data
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = state.originalData.width
        tempCanvas.height = state.originalData.height
        const ctx = tempCanvas.getContext('2d')!
        ctx.putImageData(state.originalData, 0, 0)
        
        // Create blob and update image
        const blob = await new Promise<Blob>((resolve) => {
          tempCanvas.toBlob((blob) => {
            resolve(blob!)
          })
        })
        
        const url = URL.createObjectURL(blob)
        const img = new Image()
        
        await new Promise((resolve) => {
          img.onload = () => {
            image.setElement(img)
            image.dirty = true
            URL.revokeObjectURL(url)
            resolve(void 0)
          }
          img.src = url
        })
      }
    }
    
    // Render canvas
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    // Restore filtered image data
    for (const state of this.filterStates) {
      const image = this.targetImages.find(img => 
        (img.get('id') as string || img.toString()) === state.imageId
      )
      
      if (image) {
        // Create new image from filtered data
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = state.filteredData.width
        tempCanvas.height = state.filteredData.height
        const ctx = tempCanvas.getContext('2d')!
        ctx.putImageData(state.filteredData, 0, 0)
        
        // Create blob and update image
        const blob = await new Promise<Blob>((resolve) => {
          tempCanvas.toBlob((blob) => {
            resolve(blob!)
          })
        })
        
        const url = URL.createObjectURL(blob)
        const img = new Image()
        
        await new Promise((resolve) => {
          img.onload = () => {
            image.setElement(img)
            image.dirty = true
            URL.revokeObjectURL(url)
            resolve(void 0)
          }
          img.src = url
        })
      }
    }
    
    // Render canvas
    this.canvas.renderAll()
  }
  
  /**
   * Check if this command can merge with another
   * Allows rapid filter adjustments to be combined
   */
  canMergeWith(other: Command): boolean {
    if (!(other instanceof ApplyFilterToSelectionCommand)) {
      return false
    }
    
    // Can merge if:
    // 1. Same filter name
    // 2. Same target images
    // 3. Same selection bounds
    // 4. Within 2 seconds
    return (
      other.filterName === this.filterName &&
      other.targetImages.length === this.targetImages.length &&
      other.targetImages.every(img => this.targetImages.includes(img)) &&
      other.selection.bounds.x === this.selection.bounds.x &&
      other.selection.bounds.y === this.selection.bounds.y &&
      other.selection.bounds.width === this.selection.bounds.width &&
      other.selection.bounds.height === this.selection.bounds.height &&
      Math.abs(other.timestamp - this.timestamp) < 2000
    )
  }
  
  /**
   * Merge with another command
   */
  mergeWith(other: Command): void {
    if (other instanceof ApplyFilterToSelectionCommand) {
      // Update filter params to the latest values
      this.filterParams = other.filterParams
      // Update filter states to the latest
      this.filterStates = other.filterStates
    }
  }
} 