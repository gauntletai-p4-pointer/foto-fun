import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { FrameObject } from '@/lib/editor/objects/types'
import { Square } from 'lucide-react'
import { nanoid } from 'nanoid'

/**
 * Frame Tool - Creates frame objects with preset support
 * Follows the established BaseTool architecture with dependency injection
 */
export class FrameTool extends ObjectTool {
  // Tool identification
  id = 'frame'
  name = 'Frame Tool'
  icon = Square
  cursor = 'crosshair'
  shortcut = 'F'

  // Tool requirements - frames can be created on empty canvas
  protected requirements = {
    needsDocument: false,
    needsSelection: false,
    needsLayers: false,
    canCreateDocument: true
  }

  constructor() {
    super()
  }

  // Drawing state
  private isCreating = false
  private startPoint: Point | null = null
  private previewFrame: string | null = null

  // Default options
  private defaultOptions = {
    preset: 'custom',
    fill: 'transparent',
    stroke: {
      color: '#999999',
      width: 1,
      style: 'dashed' as const
    },
    background: {
      color: '#ffffff',
      opacity: 0.1
    },
    export: {
      format: 'png' as const,
      quality: 1.0,
      dpi: 72
    }
  }

  /**
   * Tool setup
   */
  protected setupTool(): void {
    // Set default options
    Object.entries(this.defaultOptions).forEach(([key, value]) => {
      this.setOption(key, value)
    })
  }

  /**
   * Tool cleanup
   */
  protected cleanupTool(): void {
    this.cancelFrameCreation()
  }

  /**
   * Handle mouse down - start frame creation
   */
  onMouseDown(event: ToolEvent): void {
    if (!this.canvas) return

    const preset = this.options.preset as string
    
    if (preset === 'custom') {
      // Start custom frame creation
      this.startCustomFrameCreation(event.point)
    } else {
      // Create preset frame immediately
      this.createPresetFrame(event.point, preset)
    }
  }

  /**
   * Handle mouse move - update frame preview
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.canvas || !this.isCreating || !this.startPoint) return

    this.updateFramePreview(event.point)
  }

  /**
   * Handle mouse up - complete frame creation
   */
  onMouseUp(event: ToolEvent): void {
    if (!this.canvas || !this.isCreating) return

    this.completeFrameCreation(event.point)
  }

  /**
   * Start custom frame creation
   */
  private startCustomFrameCreation(point: Point): void {
    this.isCreating = true
    this.startPoint = point
    this.lastMousePosition = point
  }

  /**
   * Update frame preview during creation
   */
  private updateFramePreview(currentPoint: Point): void {
    if (!this.canvas || !this.startPoint) return

    const width = Math.abs(currentPoint.x - this.startPoint.x)
    const height = Math.abs(currentPoint.y - this.startPoint.y)
    
    // Skip tiny frames
    if (width < 10 || height < 10) return

    const x = Math.min(this.startPoint.x, currentPoint.x)
    const y = Math.min(this.startPoint.y, currentPoint.y)

    // Remove existing preview
    if (this.previewFrame) {
      this.canvas.removeObject(this.previewFrame)
      this.previewFrame = null
    }

    // Create preview frame
    this.createFramePreview(x, y, width, height)
  }

  /**
   * Complete frame creation
   */
  private async completeFrameCreation(endPoint: Point): Promise<void> {
    if (!this.canvas || !this.startPoint) return

    const width = Math.abs(endPoint.x - this.startPoint.x)
    const height = Math.abs(endPoint.y - this.startPoint.y)

    // Minimum frame size
    if (width < 20 || height < 20) {
      this.cancelFrameCreation()
      return
    }

    const x = Math.min(this.startPoint.x, endPoint.x)
    const y = Math.min(this.startPoint.y, endPoint.y)

    // Remove preview
    if (this.previewFrame) {
      await this.canvas.removeObject(this.previewFrame)
      this.previewFrame = null
    }

    // Create final frame
    await this.createFrame(x, y, width, height)

    // Reset state
    this.isCreating = false
    this.startPoint = null
  }

  /**
   * Create preset frame
   */
  private async createPresetFrame(position: Point, preset: string): Promise<void> {
    const presetData = this.getPresetData(preset)
    if (!presetData) return

    // Center frame on click point
    const x = position.x - presetData.width / 2
    const y = position.y - presetData.height / 2

    await this.createFrame(x, y, presetData.width, presetData.height, preset)
  }

  /**
   * Create frame preview
   */
  private async createFramePreview(x: number, y: number, width: number, height: number): Promise<void> {
    if (!this.canvas) return

    try {
      const previewId = await this.canvas.addObject({
        type: 'frame',
        name: 'Frame Preview',
        x,
        y,
        width,
        height,
        opacity: 0.7,
                 data: {
           type: 'frame',
           preset: 'custom',
           exportName: 'frame-preview',
           style: {
             fill: 'transparent',
             stroke: {
               color: '#0096ff',
               width: 2,
               style: 'dashed'
             }
           },
           export: this.defaultOptions.export,
           clipping: {
             enabled: false,
             showOverflow: true,
             exportClipped: true
           }
         }
      })

      this.previewFrame = previewId
    } catch (error) {
      console.error('Failed to create frame preview:', error)
    }
  }

  /**
   * Create final frame
   */
  private async createFrame(x: number, y: number, width: number, height: number, preset?: string): Promise<void> {
    if (!this.canvas) return

    const frameId = nanoid()
    const frameData = {
      x,
      y,
      width,
      height,
      preset,
      exportName: preset ? `${preset}-${frameId.slice(-6)}` : `frame-${frameId.slice(-6)}`,
      style: {
        fill: this.options.fill as string,
        stroke: this.options.stroke as { color: string; width: number; style: 'solid' | 'dashed' },
        background: this.options.background as { color: string; opacity: number }
      },
      export: this.options.export as { format: 'png' | 'jpeg' | 'webp'; quality: number; dpi: number }
    }

    // Create frame object directly
    const createdFrameId = await this.canvas.addObject({
      type: 'frame',
      name: frameData.exportName,
      x: frameData.x,
      y: frameData.y,
      width: frameData.width,
      height: frameData.height,
      data: {
        type: 'frame',
        preset: frameData.preset,
        exportName: frameData.exportName,
        style: frameData.style,
        export: frameData.export,
        clipping: {
          enabled: false,
          showOverflow: true,
          exportClipped: true
        }
      }
    })

    // Select the new frame
    this.canvas.selectObject(createdFrameId)
  }

  /**
   * Cancel frame creation
   */
  private cancelFrameCreation(): void {
    if (this.previewFrame && this.canvas) {
      this.canvas.removeObject(this.previewFrame)
      this.previewFrame = null
    }
    
    this.isCreating = false
    this.startPoint = null
  }

  /**
   * Get preset data
   */
  private getPresetData(preset: string): { width: number; height: number } | null {
    const presets: Record<string, { width: number; height: number }> = {
      'instagram-post': { width: 1080, height: 1080 },
      'instagram-story': { width: 1080, height: 1920 },
      'business-card': { width: 1050, height: 600 },
      'a4-portrait': { width: 2480, height: 3508 },
      'a4-landscape': { width: 3508, height: 2480 },
      'web-banner': { width: 1920, height: 600 },
      'twitter-post': { width: 1200, height: 675 },
      'facebook-post': { width: 1200, height: 630 },
      'youtube-thumbnail': { width: 1280, height: 720 },
      'linkedin-post': { width: 1200, height: 627 }
    }

    return presets[preset] || null
  }

  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    // Update current frame if one is selected
    const selectedObjects = this.canvas?.getSelectedObjects() || []
    const frameObject = selectedObjects.find(obj => obj.type === 'frame') as FrameObject | undefined

    if (frameObject) {
      this.updateSelectedFrame(frameObject, key, value)
    }
  }

  /**
   * Update selected frame with new options
   */
  private async updateSelectedFrame(frame: FrameObject, key: string, value: unknown): Promise<void> {
    if (!this.canvas) return

    const updates: Partial<FrameObject> = {}

    switch (key) {
      case 'fill':
        updates.data = {
          ...frame.data,
          style: {
            ...frame.data.style,
            fill: value as string
          }
        }
        break
      case 'stroke':
        updates.data = {
          ...frame.data,
          style: {
            ...frame.data.style,
            stroke: value as { color: string; width: number; style: 'solid' | 'dashed' }
          }
        }
        break
      case 'background':
        updates.data = {
          ...frame.data,
          style: {
            ...frame.data.style,
            background: value as { color: string; opacity: number }
          }
        }
        break
      case 'exportName':
        updates.data = {
          ...frame.data,
          exportName: value as string
        }
        break
    }

    if (Object.keys(updates).length > 0) {
      await this.canvas.updateObject(frame.id, updates)
    }
  }

  /**
   * Get available presets
   */
  getAvailablePresets(): Array<{ id: string; name: string; category: string; dimensions: { width: number; height: number } }> {
    return [
      { id: 'custom', name: 'Custom', category: 'basic', dimensions: { width: 0, height: 0 } },
      { id: 'instagram-post', name: 'Instagram Post', category: 'social', dimensions: { width: 1080, height: 1080 } },
      { id: 'instagram-story', name: 'Instagram Story', category: 'social', dimensions: { width: 1080, height: 1920 } },
      { id: 'twitter-post', name: 'Twitter Post', category: 'social', dimensions: { width: 1200, height: 675 } },
      { id: 'facebook-post', name: 'Facebook Post', category: 'social', dimensions: { width: 1200, height: 630 } },
      { id: 'youtube-thumbnail', name: 'YouTube Thumbnail', category: 'social', dimensions: { width: 1280, height: 720 } },
      { id: 'linkedin-post', name: 'LinkedIn Post', category: 'social', dimensions: { width: 1200, height: 627 } },
      { id: 'business-card', name: 'Business Card', category: 'print', dimensions: { width: 1050, height: 600 } },
      { id: 'a4-portrait', name: 'A4 Portrait', category: 'document', dimensions: { width: 2480, height: 3508 } },
      { id: 'a4-landscape', name: 'A4 Landscape', category: 'document', dimensions: { width: 3508, height: 2480 } },
      { id: 'web-banner', name: 'Web Banner', category: 'web', dimensions: { width: 1920, height: 600 } }
    ]
  }
} 