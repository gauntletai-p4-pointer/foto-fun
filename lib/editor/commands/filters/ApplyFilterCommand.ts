import { Command } from '../base'
import { ModifyCommand } from '../canvas/ModifyCommand'
import { ApplyFilterToSelectionCommand } from './ApplyFilterToSelectionCommand'
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'
import type { FilterPipeline } from '../../filters/FilterPipeline'
import type { LayerAwareSelectionManager } from '../../selection/LayerAwareSelectionManager'

/**
 * Unified command for applying filters
 * Automatically detects selection state and routes to appropriate implementation
 */
export class ApplyFilterCommand extends Command {
  private canvas: Canvas
  private filterPipeline: FilterPipeline
  private selectionManager: LayerAwareSelectionManager
  private filterName: string
  private filterParams: any
  private targetImages?: FabricImage[]
  private actualCommand?: Command
  
  constructor(
    canvas: Canvas,
    filterPipeline: FilterPipeline,
    selectionManager: LayerAwareSelectionManager,
    filterName: string,
    filterParams: any,
    targetImages?: FabricImage[],
    description?: string
  ) {
    super(description || `Apply ${filterName} filter`)
    this.canvas = canvas
    this.filterPipeline = filterPipeline
    this.selectionManager = selectionManager
    this.filterName = filterName
    this.filterParams = filterParams
    this.targetImages = targetImages
  }
  
  async execute(): Promise<void> {
    // Get target images
    const images = this.targetImages || this.getTargetImages()
    if (images.length === 0) {
      throw new Error('No images found to apply filter')
    }
    
    // Check if we have an active selection
    const selection = this.getActiveSelection()
    
    if (selection) {
      // Use selection-aware command
      this.actualCommand = new ApplyFilterToSelectionCommand(
        this.canvas,
        this.filterPipeline,
        this.filterName,
        this.filterParams,
        images,
        selection,
        this.description
      )
    } else {
      // Use standard modify command for fabric.js filters
      // This will handle multiple images by creating a composite command if needed
      if (images.length === 1) {
        this.actualCommand = await this.createFabricFilterCommand(images[0])
      } else {
        // Create composite command for multiple images
        const { CompositeCommand } = await import('../base/CompositeCommand')
        const composite = new CompositeCommand(this.description)
        
        for (const image of images) {
          const cmd = await this.createFabricFilterCommand(image)
          composite.addCommand(cmd)
        }
        
        this.actualCommand = composite
      }
    }
    
    // Execute the actual command
    await this.actualCommand.execute()
  }
  
  async undo(): Promise<void> {
    if (this.actualCommand) {
      await this.actualCommand.undo()
    }
  }
  
  async redo(): Promise<void> {
    if (this.actualCommand) {
      await this.actualCommand.redo()
    }
  }
  
  /**
   * Create a fabric.js filter command for a single image
   */
  private async createFabricFilterCommand(image: FabricImage): Promise<Command> {
    // Get the fabric filter
    const fabricFilter = await this.createFabricFilter()
    
    if (!image.filters) {
      image.filters = []
    }
    
    // Calculate new filters array
    const existingFilters = image.filters.filter((f: any) => {
      return f.constructor.name !== fabricFilter.constructor.name
    })
    
    let newFilters: typeof image.filters
    if (this.shouldApplyFilter()) {
      newFilters = [...existingFilters, fabricFilter] as typeof image.filters
    } else {
      newFilters = existingFilters as typeof image.filters
    }
    
    // Create modify command
    return new ModifyCommand(
      this.canvas,
      image,
      { filters: newFilters },
      this.description
    )
  }
  
  /**
   * Create fabric.js filter instance
   */
  private async createFabricFilter(): Promise<any> {
    const { filters } = await import('fabric')
    
    switch (this.filterName.toLowerCase()) {
      case 'brightness':
        return new filters.Brightness({ brightness: this.filterParams.adjustment / 100 })
      
      case 'contrast':
        return new filters.Contrast({ contrast: this.filterParams.adjustment / 100 })
      
      case 'saturation':
        return new filters.Saturation({ saturation: this.filterParams.adjustment / 100 })
      
      case 'hue':
        return new filters.HueRotation({ rotation: (this.filterParams.rotation * Math.PI) / 180 })
      
      case 'grayscale':
        return new filters.Grayscale()
      
      case 'invert':
        return new filters.Invert()
      
      case 'sepia':
        return new filters.Sepia()
      
      case 'blur':
        return new filters.Blur({ blur: this.filterParams.radius / 100 })
      
      case 'sharpen':
        const intensity = 1 + (this.filterParams.strength / 25)
        return new filters.Convolute({
          matrix: [
            0, -1, 0,
            -1, intensity, -1,
            0, -1, 0
          ],
          opaque: false
        })
      
      default:
        throw new Error(`Unsupported filter: ${this.filterName}`)
    }
  }
  
  /**
   * Check if filter should be applied based on params
   */
  private shouldApplyFilter(): boolean {
    switch (this.filterName.toLowerCase()) {
      case 'brightness':
      case 'contrast':
      case 'saturation':
      case 'exposure':
        return this.filterParams.adjustment !== 0
      
      case 'hue':
        return this.filterParams.rotation !== 0
      
      case 'blur':
        return this.filterParams.radius > 0
      
      case 'sharpen':
        return this.filterParams.strength > 0
      
      case 'colortemperature':
        return this.filterParams.temperature !== 0
      
      case 'grayscale':
      case 'invert':
      case 'sepia':
        return true // Toggle filters are always applied when called
      
      default:
        return true
    }
  }
  
  /**
   * Get images to apply filter to
   */
  private getTargetImages(): FabricImage[] {
    const objects = this.canvas.getObjects()
    return objects.filter(obj => obj instanceof FabricImage) as FabricImage[]
  }
  
  /**
   * Get the active selection
   */
  private getActiveSelection() {
    // Check for object-specific selection first
    const selectionMode = this.selectionManager.getSelectionMode()
    if (selectionMode === 'object') {
      const activeObjectId = this.selectionManager.getActiveObjectId()
      if (activeObjectId) {
        const objectSelection = this.selectionManager.getObjectSelection(activeObjectId)
        if (objectSelection) {
          return objectSelection
        }
      }
    }
    
    // Fall back to global selection
    return this.selectionManager.getSelection()
  }
  
  /**
   * Check if this command can merge with another
   */
  canMergeWith(other: Command): boolean {
    // Delegate to actual command if it exists
    if (this.actualCommand && other instanceof ApplyFilterCommand && other.actualCommand) {
      return this.actualCommand.canMergeWith(other.actualCommand)
    }
    return false
  }
  
  /**
   * Merge with another command
   */
  mergeWith(other: Command): void {
    // Delegate to actual command if it exists
    if (this.actualCommand && other instanceof ApplyFilterCommand && other.actualCommand) {
      this.actualCommand.mergeWith(other.actualCommand)
    }
  }
} 