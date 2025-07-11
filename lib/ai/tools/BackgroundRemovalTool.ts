import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import { Eraser } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ReplicateService } from '../services/replicate'
import type { CanvasObject, ImageData } from '@/lib/editor/objects/types'
import type { ImageData as ReplicateImageData } from '../services/replicate'

/**
 * Background Removal Tool - AI-powered background removal
 * Uses Replicate's rembg model to remove backgrounds from images
 */
export class BackgroundRemovalTool extends ObjectTool {
  // Tool identification
  id = TOOL_IDS.BACKGROUND_REMOVAL || 'background-removal'
  name = 'Background Removal'
  icon = Eraser
  cursor = 'crosshair'
  shortcut = 'B'
  
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  
  protected setupTool(): void {
    // Initialize Replicate service
    const apiKey = process.env.NEXT_PUBLIC_REPLICATE_API_KEY
    if (apiKey) {
      this.replicateService = new ReplicateService(apiKey)
    } else {
      console.warn('[BackgroundRemovalTool] No Replicate API key found')
    }
    
    // Set default options
    this.setOption('autoApply', true)
    this.setOption('createNewObject', false)
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }
  
  async onActivate(): Promise<void> {
    // Check if we have a selected image object
    const target = this.getTargetObject()
    if (target && target.type === 'image') {
      await this.processObject(target)
    }
  }
  
  async onMouseDown(): Promise<void> {
    // Get clicked object
    const canvas = this.getCanvas()
    const clickedObject = canvas.getObjectAtPoint(this.lastMousePosition!)
    
    if (clickedObject && clickedObject.type === 'image' && !this.isProcessing) {
      // Select and process the object
      canvas.selectObject(clickedObject.id)
      await this.processObject(clickedObject)
    }
  }
  
  /**
   * Process an image object to remove its background
   */
  private async processObject(object: CanvasObject): Promise<void> {
    if (!this.replicateService || this.isProcessing) {
      console.warn('[BackgroundRemovalTool] Service not available or already processing')
      return
    }
    
    const imageData = object.data as ImageData
    if (!imageData.element) {
      console.warn('[BackgroundRemovalTool] No image element found')
      return
    }
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    
    try {
      // Show loading state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: true,
          processingMessage: 'Removing background...'
        }
      })
      
      // Convert to Replicate ImageData format
      const replicateImageData: ReplicateImageData = {
        element: imageData.element,
        naturalWidth: imageData.naturalWidth,
        naturalHeight: imageData.naturalHeight
      }
      
      // Process with Replicate
      const processedData = await this.replicateService.removeBackground(replicateImageData)
      
      // The processed data is already an image element
      const processedImage = processedData.element as HTMLImageElement
      
      await new Promise((resolve) => {
        processedImage.onload = resolve
      })
      
      // Update object or create new one
      const createNew = this.getOption('createNewObject') as boolean
      
      if (createNew) {
        // Create new object with transparent background
        const newObjectId = await canvas.addObject({
          type: 'image',
          name: `${object.name} (no bg)`,
          x: object.x + 20,
          y: object.y + 20,
          width: object.width,
          height: object.height,
          rotation: object.rotation,
          scaleX: object.scaleX,
          scaleY: object.scaleY,
          data: {
            element: processedImage,
            naturalWidth: processedData.width,
            naturalHeight: processedData.height
          },
          metadata: {
            source: 'background-removal',
            originalObjectId: object.id
          }
        })
        
        // Select the new object
        canvas.selectObject(newObjectId)
      } else {
        // Update existing object
        await canvas.updateObject(object.id, {
          data: {
            element: processedImage,
            naturalWidth: processedData.width,
            naturalHeight: processedData.height
          },
          metadata: {
            ...object.metadata,
            isProcessing: false,
            backgroundRemoved: true,
            processedAt: new Date().toISOString()
          }
        })
      }
      
    } catch (error) {
      console.error('[BackgroundRemovalTool] Processing failed:', error)
      
      // Clear processing state
      await canvas.updateObject(object.id, {
        metadata: {
          ...object.metadata,
          isProcessing: false,
          error: 'Background removal failed'
        }
      })
    } finally {
      this.isProcessing = false
    }
  }
  
  protected onOptionChange(key: string): void {
    // Handle option changes
    if (key === 'autoApply') {
      // Could trigger reprocessing if needed
    }
  }
}

// Export singleton instance
export const backgroundRemovalTool = new BackgroundRemovalTool() 