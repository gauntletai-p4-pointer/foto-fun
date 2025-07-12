import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { CanvasManager } from '../canvas/CanvasManager'
import { ExportManager } from '../export/ExportManager'
import { DocumentSerializer } from '../persistence/DocumentSerializer'
import { EventBasedHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { TOOL_IDS } from '@/constants'

export interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  handler: () => void | Promise<void>
}

/**
 * Manages keyboard shortcuts for the application
 */
export class ShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map()
  private isEnabled = true
  
  constructor(
    private documentStore: EventDocumentStore,
    private toolStore: EventToolStore,
    private historyStore: EventBasedHistoryStore,
    private canvasManager: CanvasManager,
    private exportManager: ExportManager,
    private documentSerializer: DocumentSerializer
  ) {
    this.registerDefaultShortcuts()
    this.attachEventListeners()
  }

  /**
   * Register default shortcuts
   */
  private registerDefaultShortcuts(): void {
    // File operations
    this.register({
      key: 'n',
      meta: true,
      description: 'New document',
      handler: () => {
        // This would trigger the new document dialog
        // For now, just create a default document
        this.documentStore.createNewDocument('default', 1920, 1080, '#ffffff')
      }
    })
    
    this.register({
      key: 's',
      meta: true,
      description: 'Save document',
      handler: async () => {
        await this.documentSerializer.saveToFile()
      }
    })
    
    this.register({
      key: 's',
      meta: true,
      shift: true,
      description: 'Save as',
      handler: async () => {
        // This would trigger save as dialog
        await this.documentSerializer.saveToFile()
      }
    })
    
    this.register({
      key: 'e',
      meta: true,
      shift: true,
      description: 'Export',
      handler: () => {
        // This would trigger export dialog
        console.log('Export dialog should open')
      }
    })
    
    // Edit operations
    this.register({
      key: 'z',
      meta: true,
      description: 'Undo',
      handler: async () => {
        await this.historyStore.undo()
      }
    })
    
    this.register({
      key: 'z',
      meta: true,
      shift: true,
      description: 'Redo',
      handler: async () => {
        await this.historyStore.redo()
      }
    })
    
    this.register({
      key: 'y',
      meta: true,
      description: 'Redo (alternate)',
      handler: async () => {
        await this.historyStore.redo()
      }
    })
    
    this.register({
      key: 'a',
      meta: true,
      description: 'Select all',
      handler: () => {
        this.canvasManager?.selectAll()
      }
    })
    
    this.register({
      key: 'd',
      meta: true,
      description: 'Deselect',
      handler: () => {
        this.canvasManager?.deselectAll()
      }
    })
    
    // Tool shortcuts
    this.register({
      key: 'v',
      description: 'Move tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.MOVE)
      }
    })
    
    this.register({
      key: 'm',
      description: 'Marquee tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.MARQUEE_RECT)
      }
    })
    
    this.register({
      key: 'l',
      description: 'Lasso tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.LASSO)
      }
    })
    
    this.register({
      key: 'w',
      description: 'Magic wand tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.MAGIC_WAND)
      }
    })
    
    this.register({
      key: 'c',
      description: 'Crop tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.CROP)
      }
    })
    
    this.register({
      key: 'b',
      description: 'Brush tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.BRUSH)
      }
    })
    
    this.register({
      key: 'e',
      description: 'Eraser tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.ERASER)
      }
    })
    
    this.register({
      key: 't',
      description: 'Text tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.TYPE_HORIZONTAL)
      }
    })
    
    this.register({
      key: 'h',
      description: 'Hand tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.HAND)
      }
    })
    
    this.register({
      key: 'z',
      description: 'Zoom tool',
      handler: () => {
        this.toolStore.activateTool(TOOL_IDS.ZOOM)
      }
    })
    
    // View shortcuts
    this.register({
      key: '0',
      meta: true,
      description: 'Fit to screen',
      handler: () => {
        this.canvasManager?.fitToScreen()
      }
    })
    
    this.register({
      key: '1',
      meta: true,
      description: 'Actual size (100%)',
      handler: () => {
        this.canvasManager?.setZoom(1)
      }
    })
    
    this.register({
      key: '=',
      meta: true,
      description: 'Zoom in',
      handler: () => {
        if (!this.canvasManager) return
        const currentZoom = this.canvasManager.getCamera().zoom
        this.canvasManager.setZoom(Math.min(currentZoom * 1.25, 32))
      }
    })
    
    this.register({
      key: '-',
      meta: true,
      description: 'Zoom out',
      handler: () => {
        if (!this.canvasManager) return
        const currentZoom = this.canvasManager.getCamera().zoom
        this.canvasManager.setZoom(Math.max(currentZoom / 1.25, 0.01))
      }
    })
    
    // Spacebar for temporary hand tool
    this.register({
      key: ' ',
      description: 'Temporary hand tool',
      handler: () => {
        // This would be handled differently - need to track key down/up
        console.log('Space for hand tool needs special handling')
      }
    })
  }

  /**
   * Register a shortcut
   */
  register(shortcut: Shortcut): void {
    const key = this.getShortcutKey(shortcut)
    this.shortcuts.set(key, shortcut)
  }

  /**
   * Unregister a shortcut
   */
  unregister(shortcut: Partial<Shortcut>): void {
    const key = this.getShortcutKey(shortcut as Shortcut)
    this.shortcuts.delete(key)
  }

  /**
   * Enable/disable shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values())
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  /**
   * Handle keydown event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return
    
    // Skip if typing in an input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable) {
      return
    }
    
    const shortcut = this.findShortcut(event)
    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      
      try {
        const result = shortcut.handler()
        if (result instanceof Promise) {
          result.catch(error => {
            console.error('Shortcut handler error:', error)
          })
        }
      } catch (error) {
        console.error('Shortcut handler error:', error)
      }
    }
  }

  /**
   * Find matching shortcut
   */
  private findShortcut(event: KeyboardEvent): Shortcut | undefined {
    const key = this.getEventKey(event)
    return this.shortcuts.get(key)
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(shortcut: Shortcut): string {
    const parts: string[] = []
    
    if (shortcut.ctrl) parts.push('ctrl')
    if (shortcut.shift) parts.push('shift')
    if (shortcut.alt) parts.push('alt')
    if (shortcut.meta) parts.push('meta')
    parts.push(shortcut.key.toLowerCase())
    
    return parts.join('+')
  }

  /**
   * Get event key string
   */
  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = []
    
    // Use metaKey for Cmd on Mac, ctrlKey for Ctrl on Windows/Linux
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const metaPressed = isMac ? event.metaKey : event.ctrlKey
    
    if (!isMac && event.ctrlKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')
    if (metaPressed) parts.push('meta')
    
    // Normalize key name
    let key = event.key.toLowerCase()
    if (key === 'escape') key = 'esc'
    if (key === 'delete') key = 'del'
    if (key === 'arrowup') key = 'up'
    if (key === 'arrowdown') key = 'down'
    if (key === 'arrowleft') key = 'left'
    if (key === 'arrowright') key = 'right'
    
    parts.push(key)
    
    return parts.join('+')
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: Shortcut): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const parts: string[] = []
    
    if (shortcut.ctrl && !isMac) parts.push('Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push(isMac ? 'Option' : 'Alt')
    if (shortcut.meta) parts.push(isMac ? '⌘' : 'Ctrl')
    
    // Format key
    let key = shortcut.key
    if (key === ' ') key = 'Space'
    else if (key.length === 1) key = key.toUpperCase()
    
    parts.push(key)
    
    return parts.join(isMac ? '' : '+')
  }
} 