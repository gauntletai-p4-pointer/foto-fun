import type { Canvas, FabricObject, Path } from 'fabric'

export interface SelectionBounds {
  x: number
  y: number
  width: number
  height: number
}

export type SelectionShape = 
  | { type: 'rectangle'; x: number; y: number; width: number; height: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'path'; pathData: string }

export interface PixelSelection {
  mask: ImageData
  bounds: SelectionBounds
  shape?: SelectionShape  // Optional for backward compatibility
}

export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect'

export type SelectionModification = 'expand' | 'contract' | 'feather' | 'invert'

/**
 * SelectionManager - Manages pixel-based selections in the canvas
 * 
 * This class handles the conversion of vector paths to pixel masks,
 * boolean operations on selections, and provides utilities for
 * working with selected regions.
 */
export class SelectionManager {
  private canvas: Canvas
  private selection: PixelSelection | null = null
  private selectionCanvas: HTMLCanvasElement
  private selectionContext: CanvasRenderingContext2D
  private marchingAntsAnimation: number | null = null
  
  constructor(canvas: Canvas) {
    this.canvas = canvas
    
    // Create off-screen canvas for selection operations
    this.selectionCanvas = document.createElement('canvas')
    this.selectionContext = this.selectionCanvas.getContext('2d', {
      willReadFrequently: true
    })!
    
    this.updateCanvasSize()
  }
  
  /**
   * Update the selection canvas size to match the main canvas
   */
  private updateCanvasSize(): void {
    const width = this.canvas.getWidth()
    const height = this.canvas.getHeight()
    
    this.selectionCanvas.width = width
    this.selectionCanvas.height = height
    
    // Clear any existing selection if canvas size changed
    if (this.selection && 
        (this.selection.mask.width !== width || 
         this.selection.mask.height !== height)) {
      this.clear()
    }
  }
  
  /**
   * Create a selection from a path object
   */
  createFromPath(path: Path | FabricObject, mode: SelectionMode = 'replace'): void {
    this.updateCanvasSize()
    
    const bounds = this.getObjectBounds(path)
    
    // Create a temporary canvas for rendering the path
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.selectionCanvas.width
    tempCanvas.height = this.selectionCanvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Render the path to get its pixels
    tempCtx.save()
    tempCtx.translate(path.left || 0, path.top || 0)
    if (path.angle) {
      tempCtx.rotate((path.angle * Math.PI) / 180)
    }
    tempCtx.scale(path.scaleX || 1, path.scaleY || 1)
    
    // Draw the path
    path.render(tempCtx as CanvasRenderingContext2D)
    tempCtx.restore()
    
    // Get the pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Get path data if it's a Path object
    let shape: SelectionShape | undefined
    if (path.type === 'path' && 'path' in path) {
      // For Fabric Path objects, use the actual path string
      // The path property can be either a string or an array of commands
      let pathData: string
      if (typeof path.path === 'string') {
        pathData = path.path
      } else if (Array.isArray(path.path)) {
        // Convert path commands array to SVG path string
        pathData = this.pathCommandsToString(path.path as Array<[string, ...number[]]>)
      } else {
        // Try to get from _element if it exists (for loaded SVG paths)
        const pathWithElement = path as Path & { _element?: SVGPathElement }
        const pathElement = pathWithElement._element
        if (pathElement && pathElement.getAttribute) {
          pathData = pathElement.getAttribute('d') || ''
        } else {
          pathData = ''
        }
      }
      
      if (pathData) {
        shape = { type: 'path', pathData }
      }
    }
    
    // Apply the selection mode
    this.applySelectionMode(imageData, bounds, mode, shape)
  }
  
  /**
   * Convert Fabric path commands array to SVG path string
   */
  private pathCommandsToString(pathCommands: Array<[string, ...number[]]>): string {
    if (!Array.isArray(pathCommands)) return ''
    
    return pathCommands.map(cmd => {
      if (!Array.isArray(cmd) || cmd.length === 0) return ''
      
      const command = cmd[0]
      const args = cmd.slice(1)
      
      // Handle different command types
      switch (command) {
        case 'M': // moveTo
        case 'L': // lineTo
        case 'C': // bezierCurveTo
        case 'Q': // quadraticCurveTo
        case 'A': // arc
        case 'Z': // closePath
          return `${command} ${args.join(' ')}`
        case 'H': // horizontal lineTo
        case 'V': // vertical lineTo
          return `${command} ${args[0]}`
        default:
          return ''
      }
    }).join(' ').trim()
  }
  
  /**
   * Create a rectangular selection
   */
  createRectangle(x: number, y: number, width: number, height: number, mode: SelectionMode = 'replace'): void {
    this.updateCanvasSize()
    
    const bounds: SelectionBounds = { x, y, width, height }
    
    // Create image data for the rectangle
    const imageData = this.selectionContext.createImageData(this.selectionCanvas.width, this.selectionCanvas.height)
    
    console.log('[SelectionManager - MASK CONSTRUCTION] Input selection:', { x, y, width, height })
    console.log('[SelectionManager - MASK CONSTRUCTION] Canvas bounds:', { 
      width: this.selectionCanvas.width, 
      height: this.selectionCanvas.height 
    })
    
    // Clip selection to canvas bounds for mask construction
    const clippedLeft = Math.max(0, Math.floor(x))
    const clippedTop = Math.max(0, Math.floor(y))
    const clippedRight = Math.min(imageData.width, Math.ceil(x + width))
    const clippedBottom = Math.min(imageData.height, Math.ceil(y + height))
    
    // Calculate clipped dimensions
    const clippedWidth = Math.max(0, clippedRight - clippedLeft)
    const clippedHeight = Math.max(0, clippedBottom - clippedTop)
    
    console.log('[SelectionManager - MASK CONSTRUCTION] Clipped to canvas:', { 
      left: clippedLeft, 
      top: clippedTop, 
      right: clippedRight, 
      bottom: clippedBottom,
      width: clippedWidth,
      height: clippedHeight
    })
    
    // Track how many pixels are being set
    let pixelsSet = 0
    
    // Fill the clipped rectangle area
    for (let py = clippedTop; py < clippedBottom; py++) {
      for (let px = clippedLeft; px < clippedRight; px++) {
        // Double check bounds (should always pass now)
        if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
          const index = (py * imageData.width + px) * 4
          imageData.data[index + 3] = 255 // Set alpha to fully selected
          pixelsSet++
        }
      }
    }
    
    console.log('[SelectionManager - MASK CONSTRUCTION] Pixels set in mask:', pixelsSet)
    console.log('[SelectionManager - MASK CONSTRUCTION] Expected pixels (clipped):', clippedWidth * clippedHeight)
    
    // Create shape information (keep original bounds for shape data)
    const shape: SelectionShape = { type: 'rectangle', x, y, width, height }
    
    this.applySelectionMode(imageData, bounds, mode, shape)
    
    const finalSelection = this.getSelection()
    if (finalSelection) {
      // Count non-zero pixels in final mask for verification
      let finalPixelsSet = 0
      for (let i = 3; i < finalSelection.mask.data.length; i += 4) {
        if (finalSelection.mask.data[i] > 0) {
          finalPixelsSet++
        }
      }
      console.log('[SelectionManager - MASK CONSTRUCTION] Final mask verification - pixels set:', finalPixelsSet)
    }
  }
  
  /**
   * Create an elliptical selection
   */
  createEllipse(cx: number, cy: number, rx: number, ry: number, mode: SelectionMode = 'replace'): void {
    this.updateCanvasSize()
    
    const bounds: SelectionBounds = {
      x: cx - rx,
      y: cy - ry,
      width: rx * 2,
      height: ry * 2
    }
    
    // Create image data for the ellipse
    const imageData = this.selectionContext.createImageData(this.selectionCanvas.width, this.selectionCanvas.height)
    
    // Fill the ellipse area using the ellipse equation
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        
        if (dx * dx + dy * dy <= 1) {
          const index = (y * imageData.width + x) * 4
          imageData.data[index + 3] = 255 // Set alpha to fully selected
        }
      }
    }
    
    // Create shape information
    const shape: SelectionShape = { type: 'ellipse', cx, cy, rx, ry }
    
    this.applySelectionMode(imageData, bounds, mode, shape)
  }
  
  /**
   * Apply selection mode (replace, add, subtract, intersect)
   */
  private applySelectionMode(newMask: ImageData, bounds: SelectionBounds, mode: SelectionMode, shape?: SelectionShape): void {
    if (mode === 'replace' || !this.selection) {
      this.selection = { mask: newMask, bounds, shape }
      return
    }
    
    const currentMask = this.selection.mask
    const resultMask = this.selectionContext.createImageData(currentMask.width, currentMask.height)
    
    // Apply boolean operations pixel by pixel
    for (let i = 3; i < currentMask.data.length; i += 4) {
      const current = currentMask.data[i]
      const new_ = newMask.data[i]
      
      switch (mode) {
        case 'add':
          resultMask.data[i] = Math.max(current, new_)
          break
        case 'subtract':
          resultMask.data[i] = Math.max(0, current - new_)
          break
        case 'intersect':
          resultMask.data[i] = Math.min(current, new_)
          break
      }
    }
    
    // Update bounds
    const newBounds = this.combineBoounds(this.selection.bounds, bounds, mode)
    this.selection = { mask: resultMask, bounds: newBounds, shape: this.selection.shape }
  }
  
  /**
   * Combine bounds based on selection mode
   */
  private combineBoounds(b1: SelectionBounds, b2: SelectionBounds, mode: SelectionMode): SelectionBounds {
    switch (mode) {
      case 'add':
        return {
          x: Math.min(b1.x, b2.x),
          y: Math.min(b1.y, b2.y),
          width: Math.max(b1.x + b1.width, b2.x + b2.width) - Math.min(b1.x, b2.x),
          height: Math.max(b1.y + b1.height, b2.y + b2.height) - Math.min(b1.y, b2.y)
        }
      case 'subtract':
        return b1 // Keep original bounds for subtract
      case 'intersect':
        const x = Math.max(b1.x, b2.x)
        const y = Math.max(b1.y, b2.y)
        return {
          x,
          y,
          width: Math.min(b1.x + b1.width, b2.x + b2.width) - x,
          height: Math.min(b1.y + b1.height, b2.y + b2.height) - y
        }
      default:
        return b2
    }
  }
  
  /**
   * Get bounds of a fabric object
   */
  private getObjectBounds(obj: FabricObject): SelectionBounds {
    const boundingRect = obj.getBoundingRect()
    return {
      x: boundingRect.left,
      y: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height
    }
  }
  
  /**
   * Transform selection operations
   */
  expand(pixels: number): void {
    if (!this.selection) return
    
    // Simple dilation operation
    const mask = this.selection.mask
    const newMask = this.selectionContext.createImageData(mask.width, mask.height)
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const index = (y * mask.width + x) * 4 + 3
        
        // Check if any pixel within radius is selected
        let selected = false
        for (let dy = -pixels; dy <= pixels; dy++) {
          for (let dx = -pixels; dx <= pixels; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < mask.width && ny >= 0 && ny < mask.height) {
              const nIndex = (ny * mask.width + nx) * 4 + 3
              if (mask.data[nIndex] > 0) {
                selected = true
                break
              }
            }
          }
          if (selected) break
        }
        
        newMask.data[index] = selected ? 255 : 0
      }
    }
    
    this.selection.mask = newMask
    this.selection.bounds = {
      x: Math.max(0, this.selection.bounds.x - pixels),
      y: Math.max(0, this.selection.bounds.y - pixels),
      width: Math.min(mask.width - this.selection.bounds.x + pixels, this.selection.bounds.width + pixels * 2),
      height: Math.min(mask.height - this.selection.bounds.y + pixels, this.selection.bounds.height + pixels * 2)
    }
  }
  
  /**
   * Contract selection by pixels
   */
  contract(pixels: number): void {
    if (!this.selection) return
    
    // Simple erosion operation
    const mask = this.selection.mask
    const newMask = this.selectionContext.createImageData(mask.width, mask.height)
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const index = (y * mask.width + x) * 4 + 3
        
        // Check if all pixels within radius are selected
        let allSelected = true
        for (let dy = -pixels; dy <= pixels; dy++) {
          for (let dx = -pixels; dx <= pixels; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < mask.width && ny >= 0 && ny < mask.height) {
              const nIndex = (ny * mask.width + nx) * 4 + 3
              if (mask.data[nIndex] === 0) {
                allSelected = false
                break
              }
            } else {
              allSelected = false
              break
            }
          }
          if (!allSelected) break
        }
        
        newMask.data[index] = allSelected ? 255 : 0
      }
    }
    
    this.selection.mask = newMask
    this.selection.bounds = {
      x: this.selection.bounds.x + pixels,
      y: this.selection.bounds.y + pixels,
      width: Math.max(0, this.selection.bounds.width - pixels * 2),
      height: Math.max(0, this.selection.bounds.height - pixels * 2)
    }
  }
  
  /**
   * Feather selection edges
   */
  feather(radius: number): void {
    if (!this.selection) return
    
    // Apply gaussian blur to the alpha channel
    // This is a simplified box blur for performance
    const mask = this.selection.mask
    const newMask = this.selectionContext.createImageData(mask.width, mask.height)
    
    const iterations = Math.ceil(radius)
    let tempData = new Uint8ClampedArray(mask.data)
    
    for (let iter = 0; iter < iterations; iter++) {
      const nextData = new Uint8ClampedArray(tempData.length)
      
      for (let y = 0; y < mask.height; y++) {
        for (let x = 0; x < mask.width; x++) {
          let sum = 0
          let count = 0
          
          // 3x3 box blur
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx
              const ny = y + dy
              
              if (nx >= 0 && nx < mask.width && ny >= 0 && ny < mask.height) {
                const nIndex = (ny * mask.width + nx) * 4 + 3
                sum += tempData[nIndex]
                count++
              }
            }
          }
          
          const index = (y * mask.width + x) * 4 + 3
          nextData[index] = Math.round(sum / count)
        }
      }
      
      tempData = nextData
    }
    
    // Copy back to mask
    for (let i = 3; i < newMask.data.length; i += 4) {
      newMask.data[i] = tempData[i]
    }
    
    this.selection.mask = newMask
  }
  
  /**
   * Invert the current selection
   */
  invert(): void {
    if (!this.selection) {
      // If no selection, select all
      this.selectAll()
      return
    }
    
    const mask = this.selection.mask
    
    for (let i = 3; i < mask.data.length; i += 4) {
      mask.data[i] = 255 - mask.data[i]
    }
    
    // Update bounds to full canvas
    this.selection.bounds = {
      x: 0,
      y: 0,
      width: mask.width,
      height: mask.height
    }
  }
  
  /**
   * Select all
   */
  selectAll(): void {
    this.updateCanvasSize()
    
    const width = this.selectionCanvas.width
    const height = this.selectionCanvas.height
    const imageData = this.selectionContext.createImageData(width, height)
    
    // Set all pixels to selected
    for (let i = 3; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255
    }
    
    // Create shape information for full canvas rectangle
    const shape: SelectionShape = { type: 'rectangle', x: 0, y: 0, width, height }
    
    this.selection = {
      mask: imageData,
      bounds: { x: 0, y: 0, width, height },
      shape
    }
  }
  
  /**
   * Check if a pixel is selected
   */
  isPixelSelected(x: number, y: number): boolean {
    if (!this.selection) return false
    
    const mask = this.selection.mask
    if (x < 0 || x >= mask.width || y < 0 || y >= mask.height) {
      return false
    }
    
    const index = (Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3
    return mask.data[index] > 128 // Consider > 50% alpha as selected
  }
  
  /**
   * Get the selected pixels as ImageData
   */
  getSelectedPixels(sourceImageData: ImageData): ImageData | null {
    if (!this.selection) return null
    
    const mask = this.selection.mask
    const bounds = this.selection.bounds
    
    // Create output image data for just the bounds
    const output = this.selectionContext.createImageData(
      Math.ceil(bounds.width),
      Math.ceil(bounds.height)
    )
    
    // Copy selected pixels
    for (let y = 0; y < output.height; y++) {
      for (let x = 0; x < output.width; x++) {
        const srcX = Math.floor(bounds.x + x)
        const srcY = Math.floor(bounds.y + y)
        
        if (srcX >= 0 && srcX < sourceImageData.width && 
            srcY >= 0 && srcY < sourceImageData.height) {
          const srcIndex = (srcY * sourceImageData.width + srcX) * 4
          const maskIndex = (srcY * mask.width + srcX) * 4 + 3
          const dstIndex = (y * output.width + x) * 4
          
          const alpha = mask.data[maskIndex] / 255
          
          output.data[dstIndex] = sourceImageData.data[srcIndex]
          output.data[dstIndex + 1] = sourceImageData.data[srcIndex + 1]
          output.data[dstIndex + 2] = sourceImageData.data[srcIndex + 2]
          output.data[dstIndex + 3] = sourceImageData.data[srcIndex + 3] * alpha
        }
      }
    }
    
    return output
  }
  
  /**
   * Restore selection from ImageData and bounds
   */
  restoreSelection(mask: ImageData, bounds: SelectionBounds, shape?: SelectionShape): void {
    this.selection = { mask, bounds, shape }
  }
  
  /**
   * Clear the selection
   */
  clear(): void {
    this.selection = null
    this.stopMarchingAnts()
  }
  
  /**
   * Check if there's an active selection
   */
  hasSelection(): boolean {
    return this.selection !== null
  }
  
  /**
   * Get the current selection
   */
  getSelection(): PixelSelection | null {
    return this.selection
  }
  
  /**
   * Get selection bounds
   */
  getBounds(): SelectionBounds | null {
    return this.selection?.bounds || null
  }
  
  /**
   * Start marching ants animation
   */
  startMarchingAnts(callback: () => void): void {
    this.stopMarchingAnts()
    
    let offset = 0
    const animate = () => {
      offset = (offset + 1) % 10
      callback()
      this.marchingAntsAnimation = requestAnimationFrame(animate)
    }
    
    this.marchingAntsAnimation = requestAnimationFrame(animate)
  }
  
  /**
   * Stop marching ants animation
   */
  stopMarchingAnts(): void {
    if (this.marchingAntsAnimation) {
      cancelAnimationFrame(this.marchingAntsAnimation)
      this.marchingAntsAnimation = null
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopMarchingAnts()
    this.selection = null
  }
} 