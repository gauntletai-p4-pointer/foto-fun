import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'
import { Selection, Rect, CanvasObject } from '@/lib/editor/canvas/types'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Selection store state
 */
export interface SelectionStoreState {
  // Current selection
  selection: Selection | null
  previousSelection: Selection | null
  
  // Selection properties
  selectionBounds: Rect | null
  selectedObjectIds: Set<string>
  
  // Selection mode
  selectionMode: 'new' | 'add' | 'subtract' | 'intersect'
  
  // UI state
  isSelecting: boolean
  selectionTool: string | null
}

/**
 * Event-driven selection store
 */
export class EventSelectionStore extends BaseStore<SelectionStoreState> {
  private typedEventBus: TypedEventBus
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        selection: null,
        previousSelection: null,
        selectionBounds: null,
        selectedObjectIds: new Set(),
        selectionMode: 'new',
        isSelecting: false,
        selectionTool: null
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We'll use TypedEventBus subscriptions
    return new Map()
  }
  
  /**
   * Initialize subscriptions to typed events
   */
  initialize(): void {
    // Subscribe to selection events
    this.typedEventBus.on('selection.changed', (data) => {
      this.setState(state => {
        const selectedObjectIds = new Set<string>()
        let selectionBounds: Rect | null = null
        
        if (data.selection) {
          if (data.selection.type === 'objects') {
            data.selection.objectIds.forEach(id => selectedObjectIds.add(id))
          } else if ('bounds' in data.selection) {
            selectionBounds = data.selection.bounds
          }
        }
        
        return {
          ...state,
          selection: data.selection,
          previousSelection: data.previousSelection,
          selectedObjectIds,
          selectionBounds
        }
      })
    })
    
    this.typedEventBus.on('selection.cleared', (data) => {
      this.setState(state => ({
        ...state,
        selection: null,
        previousSelection: data.previousSelection,
        selectedObjectIds: new Set(),
        selectionBounds: null
      }))
    })
  }
  
  // Public methods
  
  /**
   * Get current selection
   */
  getSelection(): Selection | null {
    return this.getState().selection
  }
  
  /**
   * Check if anything is selected
   */
  hasSelection(): boolean {
    return this.getState().selection !== null
  }
  
  /**
   * Check if a specific object is selected
   */
  isObjectSelected(objectId: string): boolean {
    return this.getState().selectedObjectIds.has(objectId)
  }
  
  /**
   * Get selected object IDs
   */
  getSelectedObjectIds(): string[] {
    return Array.from(this.getState().selectedObjectIds)
  }
  
  /**
   * Get selection bounds
   */
  getSelectionBounds(): Rect | null {
    return this.getState().selectionBounds
  }
  
  /**
   * Set selection mode
   */
  setSelectionMode(mode: SelectionStoreState['selectionMode']): void {
    this.setState(state => ({
      ...state,
      selectionMode: mode
    }))
  }
  
  /**
   * Set selecting state
   */
  setSelecting(isSelecting: boolean, tool?: string): void {
    this.setState(state => ({
      ...state,
      isSelecting,
      selectionTool: isSelecting ? (tool || state.selectionTool) : null
    }))
  }
  
  /**
   * Create selection from objects
   */
  selectObjects(objectIds: string[]): void {
    const selection: Selection = {
      type: 'objects',
      objectIds
    }
    
    this.typedEventBus.emit('selection.changed', {
      selection,
      previousSelection: this.getState().selection
    })
  }
  
  /**
   * Clear selection
   */
  clearSelection(): void {
    const previousSelection = this.getState().selection
    if (previousSelection) {
      this.typedEventBus.emit('selection.cleared', {
        previousSelection
      })
    }
  }
  
  /**
   * Add objects to selection
   */
  addToSelection(objectIds: string[]): void {
    const currentSelection = this.getState().selection
    
    if (currentSelection?.type === 'objects') {
      const newIds = new Set(currentSelection.objectIds)
      objectIds.forEach(id => newIds.add(id))
      
      this.selectObjects(Array.from(newIds))
    } else {
      this.selectObjects(objectIds)
    }
  }
  
  /**
   * Remove objects from selection
   */
  removeFromSelection(objectIds: string[]): void {
    const currentSelection = this.getState().selection
    
    if (currentSelection?.type === 'objects') {
      const newIds = new Set(currentSelection.objectIds)
      objectIds.forEach(id => newIds.delete(id))
      
      if (newIds.size > 0) {
        this.selectObjects(Array.from(newIds))
      } else {
        this.clearSelection()
      }
    }
  }
  
  /**
   * Toggle object selection
   */
  toggleObjectSelection(objectId: string): void {
    if (this.isObjectSelected(objectId)) {
      this.removeFromSelection([objectId])
    } else {
      this.addToSelection([objectId])
    }
  }
} 