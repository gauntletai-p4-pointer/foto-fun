import { z } from 'zod'
import { nanoid } from 'nanoid'
import { CanvasToolBridge, type CanvasContext } from '../tools/canvas-bridge'
import { adapterRegistry } from '../adapters/registry'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolStore } from '@/store/toolStore'
import { useHistoryStore } from '@/store/historyStore'
import type { ICommand } from '@/lib/editor/commands/base/Command'
import type { FabricObject } from 'fabric'
import { selectionContext } from './SelectionContext'
import { SelectionSnapshot, SelectionSnapshotFactory, SelectionValidator } from './SelectionSnapshot'
import { ActiveSelection } from 'fabric'

// Type for Fabric.js image objects  
type FabricImage = FabricObject & { type: 'image' }

// Schema for chain steps
export const ChainStepSchema = z.object({
  tool: z.string().describe('Tool name to execute'),
  params: z.unknown().describe('Parameters for the tool'),
  continueOnError: z.boolean().default(false).describe('Whether to continue if this step fails'),
  delayAfter: z.number().default(100).describe('Milliseconds to wait after this step')
})

export type ChainStep = z.infer<typeof ChainStepSchema>

// Result types
export interface StepResult {
  tool: string
  success: boolean
  result?: unknown
  error?: string
  duration: number
}

export interface ChainResult {
  id: string
  success: boolean
  results: StepResult[]
  totalTime: number
  context: {
    targetImages: number
    targetingMode: 'selection' | 'auto-single'
  }
}

// Schema for chain options
export interface ChainOptions {
  preserveToolState?: boolean // Whether to preserve tool state
  continueOnError?: boolean // Whether to continue on step errors
  captureCheckpoints?: boolean // Whether to capture undo checkpoints
  progressCallback?: (step: number, total: number, tool: string) => void
  selectionRequirements?: {
    minCount?: number
    maxCount?: number
    requiredTypes?: string[]
    allowEmpty?: boolean
  }
  preserveSelection?: boolean // Whether to preserve user selection after execution
}

/**
 * ToolChain - Executes multiple tools in sequence with consistent context
 * 
 * Key features:
 * - Locks target images at chain creation
 * - Preserves tool state across executions
 * - Handles errors with optional continuation
 * - Integrates with undo/redo system
 * - Provides progress feedback
 */
export class ToolChain implements ICommand {
  readonly id: string
  readonly timestamp: number
  description: string // Made mutable for fromSteps
  
  // Static flag to indicate chain execution context
  static isExecutingChain = false
  
  private steps: ChainStep[] = []
  private initialContext: CanvasContext
  private lockedTargetIds: string[] = []
  private executionResults: StepResult[] = []
  private options: ChainOptions
  
  // Selection management
  private selectionSnapshot: SelectionSnapshot | null = null
  private selectionScopeId: string | null = null
  
  // For undo/redo
  private canvasStateBeforeExecution: string | null = null
  private originalToolId: string | null = null
  
  // For selection preservation
  private originalSelection: FabricObject[] | null = null
  
  constructor(options: ChainOptions = {}) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.description = 'Tool Chain Execution'
    this.options = options
    
    // Capture initial context
    const context = CanvasToolBridge.getCanvasContext()
    if (!context) {
      throw new Error('Cannot create tool chain: no canvas context available')
    }
    
    this.initialContext = context
    
    // Debug: Log what's in the initial context
    console.log(`[ToolChain ${this.id}] Initial context:`, {
      targetImages: context.targetImages.length,
      targetingMode: context.targetingMode,
      hasCanvas: !!context.canvas
    })
    
    // Debug: Log current canvas selection
    const currentSelection = context.canvas.getActiveObjects()
    console.log(`[ToolChain ${this.id}] Current canvas selection:`, {
      count: currentSelection.length,
      types: currentSelection.map(obj => obj.type)
    })
    
    // Store original selection if preservation is enabled
    if (options.preserveSelection) {
      this.originalSelection = [...currentSelection]
      console.log(`[ToolChain ${this.id}] Stored original selection for preservation:`, this.originalSelection.length)
    }
    
    // Create selection snapshot immediately
    this.selectionSnapshot = SelectionSnapshotFactory.fromCanvas(context.canvas)
    
    console.log(`[ToolChain ${this.id}] Created with selection snapshot:`, {
      objectCount: this.selectionSnapshot.count,
      types: Array.from(this.selectionSnapshot.types),
      isEmpty: this.selectionSnapshot.isEmpty,
      imageCount: this.selectionSnapshot.getImages().length
    })
    
    // Validate selection if we have requirements
    if (options.selectionRequirements) {
      const validation = SelectionValidator.validate(
        this.selectionSnapshot,
        options.selectionRequirements
      )
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid selection')
      }
    }
    
    // Lock target images by generating stable IDs
    this.lockedTargetIds = this.initialContext.targetImages.map((img) => 
      this.getImageId(img)
    )
    
    // Create a selection scope for this chain
    this.selectionScopeId = selectionContext.createScope(
      this.initialContext.targetImages,
      'image',
      'tool-chain',
      300000 // 5 minute TTL for chains
    )
    
    console.log(`[ToolChain ${this.id}] Created with ${this.lockedTargetIds.length} locked targets, mode: ${this.initialContext.targetingMode}, scope: ${this.selectionScopeId}`)
  }
  
  /**
   * Create a tool chain from an array of steps
   */
  static fromSteps(steps: ChainStep[], options?: ChainOptions): ToolChain {
    const chain = new ToolChain(options)
    chain.steps = steps
    chain.description = `Execute ${steps.length} tools: ${steps.map(s => s.tool).join(', ')}`
    return chain
  }
  
  /**
   * Add a step to the chain
   */
  add(tool: string, params: unknown, options?: Partial<ChainStep>): this {
    this.steps.push({
      tool,
      params,
      continueOnError: options?.continueOnError ?? false,
      delayAfter: options?.delayAfter ?? 100
    })
    return this
  }
  
  /**
   * Execute the tool chain
   */
  async execute(): Promise<void> {
    const startTime = Date.now()
    this.executionResults = []
    
    console.log(`[ToolChain ${this.id}] Starting execution of ${this.steps.length} steps`)
    
    // Save current tool state if requested
    if (this.options.preserveToolState) {
      this.originalToolId = useToolStore.getState().activeTool || null
    }
    
    // Save canvas state for undo
    if (this.options.captureCheckpoints !== false) {
      const canvas = useCanvasStore.getState().fabricCanvas
      if (canvas) {
        this.canvasStateBeforeExecution = JSON.stringify(canvas.toJSON())
      }
    }
    
    // Set chain execution flag and activate selection scope
    ToolChain.isExecutingChain = true
    if (this.selectionScopeId) {
      selectionContext.setActiveScope(this.selectionScopeId)
    }
    
    try {
      // Execute each step
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        const stepStartTime = Date.now()
        
        console.log(`[ToolChain ${this.id}] Step ${i + 1}/${this.steps.length}: ${step.tool}`)
        
        // Notify progress
        this.options.progressCallback?.(i + 1, this.steps.length, step.tool)
        
        try {
          // Ensure proper selection before each step
          await this.ensureProperSelection(i)
          
          // Get fresh canvas reference but use locked targets
          const context = this.getLockedContext()
          if (!context) {
            throw new Error('Lost canvas context during execution')
          }
          
          // Get the adapter
          const adapter = adapterRegistry.get(step.tool)
          if (!adapter) {
            throw new Error(`Tool not found: ${step.tool}`)
          }
          
          // Log the context being passed to the adapter
          console.log(`[ToolChain ${this.id}] === EXECUTING STEP ${i + 1}: ${step.tool} ===`)
          console.log(`[ToolChain ${this.id}] Context targetImages:`, context.targetImages.length)
          console.log(`[ToolChain ${this.id}] Context targetingMode:`, context.targetingMode)
          console.log(`[ToolChain ${this.id}] Step params:`, step.params)
          
          // Log each target image
          context.targetImages.forEach((img, idx) => {
            const imgId = (img as FabricObject & { id?: string }).id
            console.log(`[ToolChain ${this.id}] Target image ${idx}: id=${imgId}, left=${img.left}, top=${img.top}`)
          })
          
          // Execute the tool
          const result = await adapter.execute(step.params, context)
          
          console.log(`[ToolChain ${this.id}] Step ${i + 1} result:`, result)
          
          // Record success
          this.executionResults.push({
            tool: step.tool,
            success: true,
            result,
            duration: Date.now() - stepStartTime
          })
          
          // Apply delay if specified
          if (step.delayAfter && i < this.steps.length - 1) {
            await new Promise(resolve => setTimeout(resolve, step.delayAfter))
          }
          
        } catch (error) {
          console.error(`[ToolChain ${this.id}] Step ${i + 1} failed:`, error)
          
          // Record failure
          const errorResult: StepResult = {
            tool: step.tool,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - stepStartTime
          }
          
          this.executionResults.push(errorResult)
          
          // Check if we should continue
          if (!step.continueOnError) {
            console.log(`[ToolChain ${this.id}] Stopping execution due to error`)
            break
          }
          
          console.log(`[ToolChain ${this.id}] Continuing despite error (continueOnError: true)`)
        }
      }
      
    } finally {
      // Clean up selection before clearing flags
      this.cleanupSelection()
      
      // Always clear the flag and scope
      ToolChain.isExecutingChain = false
      selectionContext.setActiveScope(null)
      
      // Clear the selection scope from context manager
      if (this.selectionScopeId) {
        selectionContext.clearScope(this.selectionScopeId)
        this.selectionScopeId = null
      }
      
      // Restore original tool if requested
      if (this.options.preserveToolState && this.originalToolId) {
        const toolStore = useToolStore.getState()
        const toolsArray = Array.from(toolStore.tools.values())
        const originalTool = toolsArray.find(t => t.id === this.originalToolId)
        if (originalTool) {
          toolStore.setActiveTool(originalTool.id)
        }
      }
    }
    
    const totalTime = Date.now() - startTime
    const success = this.executionResults.every(r => r.success)
    
    console.log(`[ToolChain ${this.id}] Completed in ${totalTime}ms, success: ${success}`)
    console.log(`[ToolChain ${this.id}] Results:`, this.executionResults)
  }
  
  /**
   * Clean up canvas selection after chain execution
   */
  private cleanupSelection(): void {
    const canvas = useCanvasStore.getState().fabricCanvas
    if (!canvas) return
    
    console.log(`[ToolChain ${this.id}] Cleaning up selection`)
    
    // If we should preserve selection and have original selection stored
    if (this.options.preserveSelection && this.originalSelection && this.originalSelection.length > 0) {
      console.log(`[ToolChain ${this.id}] Preserving original selection of ${this.originalSelection.length} objects`)
      
      // Validate that the objects still exist on canvas
      const canvasObjects = canvas.getObjects()
      const validObjects = this.originalSelection.filter(obj => canvasObjects.includes(obj))
      
      if (validObjects.length === 0) {
        console.warn(`[ToolChain ${this.id}] Original selection objects no longer exist on canvas`)
        canvas.discardActiveObject()
        canvas.requestRenderAll()
        return
      }
      
      if (validObjects.length !== this.originalSelection.length) {
        console.warn(`[ToolChain ${this.id}] Some original selection objects no longer exist (${validObjects.length}/${this.originalSelection.length})`)
      }
      
      // Clear current selection first
      canvas.discardActiveObject()
      
      // Restore the valid selection
      if (validObjects.length === 1) {
        canvas.setActiveObject(validObjects[0])
      } else {
        const selection = new ActiveSelection(validObjects, { canvas })
        canvas.setActiveObject(selection)
      }
      
      canvas.requestRenderAll()
      console.log(`[ToolChain ${this.id}] Original selection restored with ${validObjects.length} objects`)
    } else {
      // Default behavior: clear selection
      console.log(`[ToolChain ${this.id}] Clearing selection (preserveSelection: ${this.options.preserveSelection})`)
      
      // Clear any active selection
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      
      // Ensure no objects remain selected
      const activeObjects = canvas.getActiveObjects()
      if (activeObjects.length > 0) {
        console.warn(`[ToolChain ${this.id}] Warning: ${activeObjects.length} objects still selected after cleanup`)
        // Force clear by setting selection to empty
        canvas.setActiveObject(new ActiveSelection([], { canvas }))
        canvas.discardActiveObject()
      }
    }
  }
  
  /**
   * Ensure proper selection before each step
   */
  private async ensureProperSelection(stepIndex: number): Promise<void> {
    if (!this.selectionSnapshot || !this.initialContext.canvas) return
    
    const step = this.steps[stepIndex]
    
    // Determine what type of objects this step operates on
    const operatesOnImages = [
      'rotateImage', 'flipImage', 'adjustBrightness', 'adjustExposure',
      'adjustHue', 'adjustSaturation', 'blurImage', 'invertColors',
      'grayscaleImage', 'sepiaImage', 'sharpenImage', 'resizeImage'
    ].includes(step.tool)
    
    const operatesOnText = ['addText', 'editText'].includes(step.tool)
    
    // For image operations, ensure we have the snapshot images in scope
    if (operatesOnImages) {
      const images = this.selectionSnapshot.getImages()
      if (images.length > 0) {
        // Update scope with snapshot images
        if (this.selectionScopeId) {
          selectionContext.clearScope(this.selectionScopeId)
        }
        this.selectionScopeId = selectionContext.createScope(
          images,
          'image',
          'tool-chain'
        )
        selectionContext.setActiveScope(this.selectionScopeId)
      }
    }
    
    // For text operations, we might want different behavior
    if (operatesOnText) {
      // Clear selection scope for text operations
      if (this.selectionScopeId) {
        selectionContext.clearScope(this.selectionScopeId)
        this.selectionScopeId = null
      }
      selectionContext.setActiveScope(null)
    }
    
    // Don't modify canvas selection - let tools use their selection snapshot
  }
  
  /**
   * Determine operation type from tool name
   */
  private getOperationType(toolName: string): 'text' | 'image' | 'both' {
    const textTools = ['addText', 'editText', 'horizontalType', 'verticalType']
    const imageTools = [
      'rotateImage', 'flipImage', 'adjustBrightness', 'adjustContrast',
      'adjustSaturation', 'adjustExposure', 'adjustHue', 'adjustColorTemperature',
      'blurImage', 'sharpenImage', 'convertToGrayscale', 'invertColors',
      'applySepiaEffect', 'cropImage', 'resizeImage'
    ]
    
    if (textTools.includes(toolName)) return 'text'
    if (imageTools.includes(toolName)) return 'image'
    return 'both'
  }
  
  /**
   * Get the execution results
   */
  getResults(): ChainResult {
    return {
      id: this.id,
      success: this.executionResults.every(r => r.success),
      results: this.executionResults,
      totalTime: this.executionResults.reduce((sum, r) => sum + r.duration, 0),
      context: {
        targetImages: this.lockedTargetIds.length,
        targetingMode: 'selection' // Always 'selection' - no more 'all-images'
      }
    }
  }
  
  /**
   * Undo the entire chain execution
   */
  async undo(): Promise<void> {
    if (!this.canvasStateBeforeExecution) {
      console.warn(`[ToolChain ${this.id}] No checkpoint available for undo`)
      return
    }
    
    const canvas = useCanvasStore.getState().fabricCanvas
    if (!canvas) {
      throw new Error('No canvas available for undo')
    }
    
    console.log(`[ToolChain ${this.id}] Undoing chain execution`)
    
    // Clear any active selection before restoring
    canvas.discardActiveObject()
    
    // Restore canvas state
    await new Promise<void>((resolve) => {
      canvas.loadFromJSON(this.canvasStateBeforeExecution!, () => {
        canvas.renderAll()
        resolve()
      })
    })
    
    // Ensure selection is cleared after restore
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    
    // Restore tool state if needed
    if (this.options.preserveToolState && this.originalToolId) {
      const toolStore = useToolStore.getState()
      const toolsArray = Array.from(toolStore.tools.values())
      const originalTool = toolsArray.find(t => t.id === this.originalToolId)
      if (originalTool) {
        toolStore.setActiveTool(originalTool.id)
      }
    }
  }
  
  /**
   * Redo the chain execution
   */
  async redo(): Promise<void> {
    // Clear any active selection before re-executing
    const canvas = useCanvasStore.getState().fabricCanvas
    if (canvas) {
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }
    
    await this.execute()
  }
  
  /**
   * Check if the chain can be executed
   */
  canExecute(): boolean {
    return this.steps.length > 0 && !!useCanvasStore.getState().fabricCanvas
  }
  
  /**
   * Check if the chain can be undone
   */
  canUndo(): boolean {
    return !!this.canvasStateBeforeExecution
  }
  
  /**
   * Get a stable ID for an image object
   */
  private getImageId(img: FabricObject): string {
    // Try to use existing ID
    if (img && typeof img === 'object' && 'id' in img && typeof img.id === 'string') {
      return img.id
    }
    
    // Generate ID based on position and size (stable across re-renders)
    const left = Math.round(img.left || 0)
    const top = Math.round(img.top || 0)
    const width = Math.round(img.width || 0)
    const height = Math.round(img.height || 0)
    
    return `img-${left}-${top}-${width}-${height}`
  }
  
  /**
   * Get locked images from the canvas
   */
  private getLockedImages(): FabricImage[] {
    const canvas = useCanvasStore.getState().fabricCanvas
    if (!canvas) return []
    
    const allObjects = canvas.getObjects()
    return allObjects.filter(obj => 
      obj.type === 'image' && 
      this.lockedTargetIds.includes(this.getImageId(obj))
    ) as FabricImage[]
  }
  
  /**
   * Get context with locked selection
   */
  private getLockedContext(): CanvasContext | null {
    const currentContext = CanvasToolBridge.getCanvasContext()
    if (!currentContext || !this.selectionSnapshot) return null
    
    // Verify snapshot integrity
    if (!this.selectionSnapshot.verifyIntegrity(currentContext.canvas)) {
      console.warn(`[ToolChain ${this.id}] Selection snapshot integrity check failed`)
      return null
    }
    
    // Get images from snapshot
    const snapshotImages = this.selectionSnapshot.getImages()
    console.log(`[ToolChain ${this.id}] getLockedContext - Snapshot has ${snapshotImages.length} images`)
    
    // Debug: Log image details
    snapshotImages.forEach((img, index) => {
      const imgId = (img as FabricObject & { id?: string }).id
      console.log(`[ToolChain ${this.id}] Snapshot image ${index}: id=${imgId}, type=${img.type}`)
    })
    
    // Return context with snapshot objects
    return {
      ...currentContext,
      targetImages: snapshotImages as FabricImage[],
      targetingMode: 'selection' // Always 'selection' - no more 'all-images'
    }
  }
}

/**
 * Convenience function to execute a chain without managing instances
 */
export async function executeToolChain(
  steps: ChainStep[], 
  options?: ChainOptions
): Promise<ChainResult> {
  const chain = ToolChain.fromSteps(steps, options)
  
  // Execute through history store if undo/redo is needed
  if (options?.captureCheckpoints !== false) {
    await useHistoryStore.getState().executeCommand(chain)
  } else {
    await chain.execute()
  }
  
  return chain.getResults()
} 