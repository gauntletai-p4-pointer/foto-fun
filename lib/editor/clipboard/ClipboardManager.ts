import type { Canvas, FabricObject, Image as FabricImage } from 'fabric'
import { Image as FabricImageConstructor } from 'fabric'
import type { SelectionManager } from '../selection'

export interface ClipboardData {
  imageData: ImageData
  bounds: { x: number; y: number; width: number; height: number }
}

/**
 * ClipboardManager - Handles copy, cut, and paste operations
 * 
 * This class manages clipboard operations for selections and objects,
 * integrating with the SelectionManager for pixel-based operations.
 */
export class ClipboardManager {
  private canvas: Canvas
  private selectionManager: SelectionManager
  private clipboardData: ClipboardData | null = null
  
  constructor(canvas: Canvas, selectionManager: SelectionManager) {
    this.canvas = canvas
    this.selectionManager = selectionManager
  }
  
  /**
   * Copy the current selection or selected objects to clipboard
   */
  async copy(): Promise<boolean> {
    // Check if we have a pixel selection
    if (this.selectionManager.hasSelection()) {
      return this.copySelection()
    }
    
    // Otherwise, check for selected objects
    const activeObject = this.canvas.getActiveObject()
    if (activeObject) {
      return this.copyObject(activeObject)
    }
    
    return false
  }
  
  /**
   * Cut the current selection or selected objects
   */
  async cut(): Promise<boolean> {
    const copied = await this.copy()
    if (!copied) return false
    
    // If we have a selection, fill it with background color
    if (this.selectionManager.hasSelection()) {
      await this.deleteSelection()
    } else {
      // Otherwise, delete the selected object
      const activeObject = this.canvas.getActiveObject()
      if (activeObject) {
        this.canvas.remove(activeObject)
        this.canvas.discardActiveObject()
        this.canvas.renderAll()
      }
    }
    
    return true
  }
  
  /**
   * Paste from clipboard
   */
  async paste(): Promise<boolean> {
    if (!this.clipboardData) return false
    
    // Create a temporary canvas to hold the pasted image
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.clipboardData.bounds.width
    tempCanvas.height = this.clipboardData.bounds.height
    
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(this.clipboardData.imageData, 0, 0)
    
    // Convert to data URL
    const dataURL = tempCanvas.toDataURL()
    
    // Create Fabric image from data URL
    return new Promise((resolve) => {
      const img = FabricImageConstructor.fromURL(dataURL)
      
      img.then((fabricImg: FabricImage) => {
        if (!fabricImg) {
          resolve(false)
          return
        }
        
        // Position at the original location or center of viewport
        const zoom = this.canvas.getZoom()
        const vpt = this.canvas.viewportTransform
        
        if (vpt) {
          fabricImg.set({
            left: (this.clipboardData!.bounds.x - vpt[4]) / zoom,
            top: (this.clipboardData!.bounds.y - vpt[5]) / zoom,
          })
        } else {
          fabricImg.set({
            left: this.clipboardData!.bounds.x,
            top: this.clipboardData!.bounds.y,
          })
        }
        
        // Add to canvas
        this.canvas.add(fabricImg)
        this.canvas.setActiveObject(fabricImg)
        this.canvas.renderAll()
        
        resolve(true)
      }).catch(() => {
        resolve(false)
      })
    })
  }
  
  /**
   * Copy the current selection to clipboard
   */
  private async copySelection(): Promise<boolean> {
    const selection = this.selectionManager.getSelection()
    if (!selection) return false
    
    // Get the canvas image data
    const ctx = this.canvas.getContext()
    const canvasData = ctx.getImageData(0, 0, this.canvas.width!, this.canvas.height!)
    
    // Get selected pixels
    const selectedPixels = this.selectionManager.getSelectedPixels(canvasData)
    if (!selectedPixels) return false
    
    // Store in clipboard
    this.clipboardData = {
      imageData: selectedPixels,
      bounds: selection.bounds
    }
    
    // Also try to copy to system clipboard if available
    await this.copyToSystemClipboard(selectedPixels, selection.bounds)
    
    return true
  }
  
  /**
   * Copy an object to clipboard
   */
  private async copyObject(obj: FabricObject): Promise<boolean> {
    // Render object to image data
    const tempCanvas = document.createElement('canvas')
    const bounds = obj.getBoundingRect()
    
    tempCanvas.width = Math.ceil(bounds.width)
    tempCanvas.height = Math.ceil(bounds.height)
    
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Render the object
    tempCtx.save()
    tempCtx.translate(-bounds.left, -bounds.top)
    obj.render(tempCtx as CanvasRenderingContext2D)
    tempCtx.restore()
    
    // Get image data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Store in clipboard
    this.clipboardData = {
      imageData,
      bounds: {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      }
    }
    
    return true
  }
  
  /**
   * Delete the current selection (fill with background)
   */
  private async deleteSelection(): Promise<void> {
    const selection = this.selectionManager.getSelection()
    if (!selection) return
    
    // Get background color
    const bgColor = this.canvas.backgroundColor || '#ffffff'
    
    // TODO: Implement actual deletion by modifying canvas pixels
    // For now, just clear the selection
    this.selectionManager.clear()
    
    console.log('Delete selection - fill with background:', bgColor)
  }
  
  /**
   * Try to copy image data to system clipboard
   */
  private async copyToSystemClipboard(imageData: ImageData, bounds: { width: number; height: number }): Promise<void> {
    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard || !window.ClipboardItem) {
        return
      }
      
      // Create a temporary canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = bounds.width
      tempCanvas.height = bounds.height
      
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)
      
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        tempCanvas.toBlob(resolve, 'image/png')
      })
      
      if (blob) {
        // Copy to system clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
      }
    } catch (error) {
      // Clipboard API might not be available or might fail
      console.log('System clipboard copy failed:', error)
    }
  }
  
  /**
   * Check if clipboard has data
   */
  hasClipboardData(): boolean {
    return this.clipboardData !== null
  }
  
  /**
   * Clear clipboard data
   */
  clearClipboard(): void {
    this.clipboardData = null
  }
} 