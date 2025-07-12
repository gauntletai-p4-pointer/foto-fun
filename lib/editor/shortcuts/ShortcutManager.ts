import { EventProjectStore } from '@/lib/store/project/EventProjectStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface ShortcutAction {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void | Promise<void>
  description: string
  category: 'file' | 'edit' | 'view' | 'tools' | 'canvas'
}

/**
 * Manages keyboard shortcuts for the application
 */
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutAction> = new Map()
  private isEnabled = true

  constructor(
    private typedEventBus: TypedEventBus,
    private projectStore: EventProjectStore,
    private container: { getSync: (token: string) => unknown }
  ) {
    this.registerDefaultShortcuts()
    this.setupEventListeners()
  }

  private registerDefaultShortcuts(): void {
    // File operations
    this.register({
      key: 'n',
      ctrlKey: true,
      action: () => this.createNewProject(),
      description: 'Create new project',
      category: 'file'
    })

    this.register({
      key: 's',
      ctrlKey: true,
      action: () => this.saveProject(),
      description: 'Save project',
      category: 'file'
    })

    // Edit operations
    this.register({
      key: 'z',
      ctrlKey: true,
      action: () => this.undo(),
      description: 'Undo',
      category: 'edit'
    })

    this.register({
      key: 'y',
      ctrlKey: true,
      action: () => this.redo(),
      description: 'Redo',
      category: 'edit'
    })

    this.register({
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      action: () => this.redo(),
      description: 'Redo (alternative)',
      category: 'edit'
    })

    // Canvas operations
    this.register({
      key: '0',
      ctrlKey: true,
      action: () => this.resetZoom(),
      description: 'Reset zoom to 100%',
      category: 'canvas'
    })

    this.register({
      key: '=',
      ctrlKey: true,
      action: () => this.zoomIn(),
      description: 'Zoom in',
      category: 'canvas'
    })

    this.register({
      key: '-',
      ctrlKey: true,
      action: () => this.zoomOut(),
      description: 'Zoom out',
      category: 'canvas'
    })
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return

    // Don't trigger shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).contentEditable === 'true') {
      return
    }

    const shortcutKey = this.getShortcutKey(event)
    const shortcut = this.shortcuts.get(shortcutKey)

    if (shortcut) {
      event.preventDefault()
      event.stopPropagation()
      shortcut.action()
    }
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts = []
    if (event.ctrlKey || event.metaKey) parts.push('ctrl')
    if (event.shiftKey) parts.push('shift')
    if (event.altKey) parts.push('alt')
    parts.push(event.key.toLowerCase())
    return parts.join('+')
  }

  register(shortcut: ShortcutAction): void {
    const key = this.buildShortcutKey(shortcut)
    this.shortcuts.set(key, shortcut)
  }

  unregister(shortcut: Partial<ShortcutAction>): void {
    const key = this.buildShortcutKey(shortcut)
    this.shortcuts.delete(key)
  }

  private buildShortcutKey(shortcut: Partial<ShortcutAction>): string {
    const parts = []
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('ctrl')
    if (shortcut.shiftKey) parts.push('shift')
    if (shortcut.altKey) parts.push('alt')
    if (shortcut.key) parts.push(shortcut.key.toLowerCase())
    return parts.join('+')
  }

  enable(): void {
    this.isEnabled = true
  }

  disable(): void {
    this.isEnabled = false
  }

  getShortcuts(): ShortcutAction[] {
    return Array.from(this.shortcuts.values())
  }

  // Action implementations
  private createNewProject(): void {
    this.projectStore.createProject('Untitled Project')
  }

  private saveProject(): void {
    this.projectStore.saveProject()
  }

  private async undo(): Promise<void> {
    try {
      const historyStore = this.container.getSync('HistoryStore') as { undo: () => Promise<void> }
      await historyStore.undo()
    } catch (error) {
      console.error('[ShortcutManager] Undo failed:', error)
    }
  }

  private async redo(): Promise<void> {
    try {
      const historyStore = this.container.getSync('HistoryStore') as { redo: () => Promise<void> }
      await historyStore.redo()
    } catch (error) {
      console.error('[ShortcutManager] Redo failed:', error)
    }
  }

  private resetZoom(): void {
    this.typedEventBus.emit('canvas.zoom.reset', {})
  }

  private zoomIn(): void {
    this.typedEventBus.emit('canvas.zoom.in', {})
  }

  private zoomOut(): void {
    this.typedEventBus.emit('canvas.zoom.out', {})
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    this.shortcuts.clear()
  }
} 