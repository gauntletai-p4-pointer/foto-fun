import { BaseTool } from './BaseTool'
import type { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import type { Point } from '@/lib/editor/canvas/types'

/**
 * Base class for selection tools
 * Uses dependency injection for store access
 */
export abstract class SelectionTool extends BaseTool {
  protected selectionStore: EventSelectionStore
  
  constructor(selectionStore: EventSelectionStore) {
    super()
    this.selectionStore = selectionStore
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