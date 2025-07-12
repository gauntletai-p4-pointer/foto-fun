import type { CanvasManager } from './CanvasManager'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CommandManager } from '../commands/CommandManager'
import { RemoveObjectCommand } from '../commands/object/RemoveObjectCommand'
import type { CommandContext } from '../commands/base/Command'

/**
 * KeyboardManager - Handles keyboard shortcuts for canvas operations
 * 
 * This class manages keyboard shortcuts for common canvas operations
 * like deleting objects, copying, pasting, undo/redo, etc.
 */
export class KeyboardManager {
  private canvasManager: CanvasManager
  private eventBus: TypedEventBus
  private commandManager: CommandManager
  private keydownHandler: (event: KeyboardEvent) => void
  private keyupHandler: (event: KeyboardEvent) => void

  constructor(
    canvasManager: CanvasManager,
    eventBus: TypedEventBus,
    commandManager: CommandManager
  ) {
    this.canvasManager = canvasManager
    this.eventBus = eventBus
    this.commandManager = commandManager
    
    // Bind event handlers
    this.keydownHandler = this.handleKeyDown.bind(this)
    this.keyupHandler = this.handleKeyUp.bind(this)
    
    // Add event listeners
    this.attachEventListeners()
  }

  /**
   * Attach keyboard event listeners
   */
  private attachEventListeners(): void {
    document.addEventListener('keydown', this.keydownHandler)
    document.addEventListener('keyup', this.keyupHandler)
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Only handle if canvas is focused or no input is focused
    if (this.shouldIgnoreKeyEvent(event)) {
      return
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const cmdKey = isMac ? event.metaKey : event.ctrlKey
    
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        this.handleDelete(event)
        break
        
      case 'z':
        if (cmdKey) {
          if (event.shiftKey) {
            this.handleRedo(event)
          } else {
            this.handleUndo(event)
          }
        }
        break
        
      case 'y':
        if (cmdKey) {
          this.handleRedo(event)
        }
        break
        
      case 'c':
        if (cmdKey) {
          this.handleCopy(event)
        }
        break
        
      case 'v':
        if (cmdKey) {
          this.handlePaste(event)
        }
        break
        
      case 'x':
        if (cmdKey) {
          this.handleCut(event)
        }
        break
        
      case 'a':
        if (cmdKey) {
          this.handleSelectAll(event)
        }
        break
        
      case 'Escape':
        this.handleEscape(event)
        break
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(_event: KeyboardEvent): void {
    // Currently no keyup handling needed
  }

  /**
   * Check if keyboard event should be ignored
   */
  private shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement
    
    // Ignore if typing in input fields
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true') {
      return true
    }
    
    // Ignore if modal or dialog is open
    if (document.querySelector('[role="dialog"]') || 
        document.querySelector('.modal-open')) {
      return true
    }
    
    return false
  }

  /**
   * Handle delete key - remove selected objects
   */
  private async handleDelete(event: KeyboardEvent): Promise<void> {
    event.preventDefault()
    
    const selectedObjects = this.canvasManager.getSelectedObjects()
    if (selectedObjects.length === 0) {
      return
    }
    
    // Create command context
    const context: CommandContext = {
      eventBus: this.eventBus,
      canvasManager: this.canvasManager,
      selectionManager: this.canvasManager.getSelectionManager(),
      executionId: 'delete-objects-' + Date.now(),
      timestamp: Date.now()
    }
    
    // Delete each selected object
    for (const object of selectedObjects) {
      const removeCommand = new RemoveObjectCommand(
        `Delete ${object.name}`,
        context,
        { objectId: object.id }
      )
      
      await this.commandManager.executeCommand(removeCommand)
    }
    
    // Clear selection
    this.canvasManager.clearSelection()
  }

  /**
   * Handle undo
   */
  private handleUndo(event: KeyboardEvent): void {
    event.preventDefault()
    // TODO: Implement undo through history manager
    console.log('Undo requested')
  }

  /**
   * Handle redo
   */
  private handleRedo(event: KeyboardEvent): void {
    event.preventDefault()
    // TODO: Implement redo through history manager
    console.log('Redo requested')
  }

  /**
   * Handle copy
   */
  private handleCopy(event: KeyboardEvent): void {
    event.preventDefault()
    // TODO: Implement copy functionality
    console.log('Copy requested')
  }

  /**
   * Handle paste
   */
  private handlePaste(event: KeyboardEvent): void {
    event.preventDefault()
    // TODO: Implement paste functionality
    console.log('Paste requested')
  }

  /**
   * Handle cut
   */
  private handleCut(event: KeyboardEvent): void {
    event.preventDefault()
    // TODO: Implement cut functionality (copy + delete)
    console.log('Cut requested')
  }

  /**
   * Handle select all
   */
  private handleSelectAll(event: KeyboardEvent): void {
    event.preventDefault()
    this.canvasManager.selectAll()
  }

  /**
   * Handle escape key
   */
  private handleEscape(event: KeyboardEvent): void {
    event.preventDefault()
    
    // Clear selection
    this.canvasManager.clearSelection()
    
    // TODO: Cancel any active tool operations
    console.log('Escape - clearing selection')
  }

  /**
   * Destroy the keyboard manager
   */
  destroy(): void {
    document.removeEventListener('keydown', this.keydownHandler)
    document.removeEventListener('keyup', this.keyupHandler)
  }
} 