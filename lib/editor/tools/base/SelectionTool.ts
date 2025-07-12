import { BaseTool, type ToolDependencies, type ToolOptions, type ToolOptionDefinition } from './BaseTool'
import type { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import type { Point } from '@/lib/editor/canvas/types'

interface SelectionToolOptions extends ToolOptions {
  mode: ToolOptionDefinition<'replace' | 'add' | 'subtract' | 'intersect'>
}

/**
 * Base class for selection tools
 * Uses dependency injection for store access
 */
export abstract class SelectionTool extends BaseTool<SelectionToolOptions> {
  protected selectionStore: EventSelectionStore
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
    // Get selection store from dependencies
    this.selectionStore = dependencies.selectionManager as unknown as EventSelectionStore
  }
  
  protected getOptionDefinitions(): SelectionToolOptions {
    return {
      mode: {
        type: 'enum',
        default: 'replace',
        enum: ['replace', 'add', 'subtract', 'intersect'],
        description: 'Selection mode'
      }
    }
  }
  
  /**
   * Get current selection store
   */
  protected getSelectionStore(): EventSelectionStore {
    return this.selectionStore
  }
  
  /**
   * Handle selection area drag
   */
  protected abstract handleSelectionDrag(start: Point, end: Point): void
  
  /**
   * Complete selection
   */
  protected abstract completeSelection(): void
  
  /**
   * Clear current selection
   */
  protected clearSelection(): void {
    this.selectionStore.clearSelection()
  }
} 