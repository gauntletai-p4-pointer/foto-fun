import { Sparkles } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { Point, CanvasObject, ToolEvent } from '@/lib/editor/canvas/types'
import { ImageGeneratedEvent, GenerationFailedEvent } from '@/lib/events/canvas/ToolEvents'
import { ObjectAddedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Image Generation Tool - AI-powered image generation
 * Konva implementation with Replicate integration
 */
export class ImageGenerationTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.AI_IMAGE_GENERATION
  name = 'AI Image Generation'
  icon = Sparkles
  cursor = 'crosshair'
  shortcut = 'G'
  
  // Generation state
  private isGenerating = false
  private placeholderRect: Konva.Rect | null = null
  private loadingText: Konva.Text | null = null
  private generationGroup: Konva.Group | null = null
  
  protected setupTool(): void {
    // Set default generation options
    this.setOption('model', 'stable-diffusion')
    this.setOption('width', 512)
    this.setOption('height', 512)
    this.setOption('steps', 50)
    this.setOption('guidance', 7.5)
  }
  
  protected cleanupTool(): void {
    // Cancel any active generation
    if (this.isGenerating) {
      this.cancelGeneration()
    }
    
    // Clean up generation group
    if (this.generationGroup) {
      this.generationGroup.destroy()
      this.generationGroup = null
    }
    
    // Redraw overlay layer
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    if (overlayLayer) {
      overlayLayer.batchDraw()
    }
    
    // Reset state
    this.placeholderRect = null
    this.loadingText = null
  }
  
  /**
   * Generate image with prompt
   */
  async generateImage(
    prompt: string,
    position?: Point,
    options?: {
      width?: number
      height?: number
      model?: string
      steps?: number
      guidance?: number
      seed?: number
      negativePrompt?: string
    }
  ): Promise<CanvasObject | null> {
    if (this.isGenerating) {
      console.warn('Generation already in progress')
      return null
    }
    
    const canvas = this.getCanvas()
    this.isGenerating = true
    
    // Merge options with defaults
    const width = options?.width || (this.getOption('width') as number)
    const height = options?.height || (this.getOption('height') as number)
    const model = options?.model || (this.getOption('model') as string)
    const steps = options?.steps || (this.getOption('steps') as number)
    const guidance = options?.guidance || (this.getOption('guidance') as number)
    
    // Default position to center if not provided
    const pos = position || {
      x: ((canvas.state.documentBounds?.width || 0) - width) / 2,
      y: ((canvas.state.documentBounds?.height || 0) - height) / 2
    }
    
    try {
      // Create placeholder
      this.createPlaceholder(pos, width, height, prompt)
      
      // Call generation API
      const response = await fetch('/api/replicate/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          num_inference_steps: steps,
          guidance_scale: guidance,
          seed: options?.seed,
          negative_prompt: options?.negativePrompt,
          model
        })
      })
      
      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.output || data.output.length === 0) {
        throw new Error('No image generated')
      }
      
      // Load generated image
      const imageUrl = Array.isArray(data.output) ? data.output[0] : data.output
      const img = await this.loadImage(imageUrl)
      
      // Remove placeholder
      this.removePlaceholder()
      
      // Create Konva image
      const konvaImage = new Konva.Image({
        x: pos.x,
        y: pos.y,
        image: img,
        width: width,
        height: height,
        draggable: true
      })
      
      // Add to active layer
      const activeLayer = canvas.getActiveLayer()
      if (!activeLayer) {
        throw new Error('No active layer')
      }
      
      activeLayer.konvaLayer.add(konvaImage)
      
      // Create canvas object
      const canvasObject: CanvasObject = {
        id: `generated-${Date.now()}`,
        type: 'image',
        name: `AI: ${prompt.slice(0, 30)}...`,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          x: pos.x,
          y: pos.y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          skewX: 0,
          skewY: 0
        },
        node: konvaImage,
        layerId: activeLayer.id,
        data: img,
        metadata: {
          prompt,
          model,
          width,
          height,
          steps,
          guidance,
          seed: options?.seed,
          generatedAt: new Date().toISOString()
        }
      }
      
      // Add to layer objects
      activeLayer.objects.push(canvasObject)
      
      // Emit events
      if (this.executionContext) {
        // Image generated event
        await this.executionContext.emit(new ImageGeneratedEvent(
          'canvas',
          canvasObject.id,
          prompt,
          {
            model,
            width,
            height,
            steps,
            guidance,
            seed: options?.seed,
            negativePrompt: options?.negativePrompt
          },
          this.executionContext.getMetadata()
        ))
        
        // Object added event
        await this.executionContext.emit(new ObjectAddedEvent(
          'canvas',
          canvasObject,
          activeLayer.id,
          this.executionContext.getMetadata()
        ))
      }
      
      // Redraw
      activeLayer.konvaLayer.batchDraw()
      
      return canvasObject
      
    } catch (error) {
      console.error('Image generation failed:', error)
      
      // Remove placeholder
      this.removePlaceholder()
      
      // Emit failure event
      if (this.executionContext) {
        await this.executionContext.emit(new GenerationFailedEvent(
          'canvas',
          prompt,
          error instanceof Error ? error.message : 'Unknown error',
          this.executionContext.getMetadata()
        ))
      }
      
      return null
      
    } finally {
      this.isGenerating = false
    }
  }
  
  /**
   * Create loading placeholder
   */
  private createPlaceholder(pos: Point, width: number, height: number, prompt: string): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    if (!overlayLayer) return
    
    // Create generation group if needed
    if (!this.generationGroup) {
      this.generationGroup = new Konva.Group({ name: 'imageGeneration' })
      overlayLayer.add(this.generationGroup)
    }
    
    // Create placeholder rectangle
    this.placeholderRect = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: width,
      height: height,
      fill: '#f0f0f0',
      stroke: '#ccc',
      strokeWidth: 2,
      dash: [10, 5],
      cornerRadius: 8
    })
    
    // Create loading text
    this.loadingText = new Konva.Text({
      x: pos.x,
      y: pos.y + height / 2 - 30,
      width: width,
      text: `Generating...\n"${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: '#666',
      align: 'center',
      verticalAlign: 'middle',
      padding: 20
    })
    
    // Add to generation group
    this.generationGroup.add(this.placeholderRect)
    this.generationGroup.add(this.loadingText)
    
    // Add loading animation
    const anim = new Konva.Animation((frame) => {
      if (!this.placeholderRect || !frame) return
      
      const opacity = (Math.sin(frame.time * 0.002) + 1) / 2
      this.placeholderRect.opacity(0.5 + opacity * 0.5)
    }, overlayLayer)
    
    anim.start()
    
    // Store animation for cleanup
    this.placeholderRect.setAttr('loadingAnimation', anim)
    
    overlayLayer.batchDraw()
  }
  
  /**
   * Remove loading placeholder
   */
  private removePlaceholder(): void {
    if (this.placeholderRect) {
      // Stop animation
      const anim = this.placeholderRect.getAttr('loadingAnimation')
      if (anim) {
        anim.stop()
      }
      
      this.placeholderRect.destroy()
      this.placeholderRect = null
    }
    
    if (this.loadingText) {
      this.loadingText.destroy()
      this.loadingText = null
    }
    
    if (this.generationGroup) {
      const canvas = this.getCanvas()
      const stage = canvas.konvaStage
      const overlayLayer = stage.children[2] as Konva.Layer
      if (overlayLayer) {
        overlayLayer.batchDraw()
      }
    }
  }
  
  /**
   * Cancel active generation
   */
  private cancelGeneration(): void {
    this.removePlaceholder()
    this.isGenerating = false
  }
  
  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      
      img.src = url
    })
  }
  
  /**
   * Interactive generation mode
   */
  async onMouseDown(event: ToolEvent): Promise<void> {
    // In interactive mode, clicking would open a dialog
    // For now, we'll just log
    console.log('Interactive generation at:', event.point)
    
    // You could emit an event to open a generation dialog
    // or integrate with your UI components
  }
}

// Export singleton instance
export const imageGenerationTool = new ImageGenerationTool() 