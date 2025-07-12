import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { EventProjectStore } from '@/lib/store/project/EventProjectStore'

/**
 * Auto-save manager for projects on infinite canvas
 * Handles automatic saving of project state
 */
export class AutoSaveManager {
  private isEnabled = true
  private saveInterval = 30000 // 30 seconds
  private saveTimer: NodeJS.Timeout | null = null
  private lastSaveTime = 0
  private minSaveInterval = 5000 // Minimum 5 seconds between saves

  constructor(
    private typedEventBus: TypedEventBus,
    private projectStore: EventProjectStore,
    config: {
      enabled?: boolean
      interval?: number
      minInterval?: number
    } = {}
  ) {
    this.isEnabled = config.enabled ?? true
    this.saveInterval = config.interval ?? 30000
    this.minSaveInterval = config.minInterval ?? 5000

    this.setupEventListeners()
    this.startAutoSave()
  }

  private setupEventListeners(): void {
    // Listen for project changes to trigger saves
    this.typedEventBus.on('canvas.object.added', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.object.modified', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.object.removed', () => this.scheduleAutoSave())
    this.typedEventBus.on('canvas.object.reordered', () => this.scheduleAutoSave())
  }

  private scheduleAutoSave(): void {
    if (!this.isEnabled) return

    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    // Don't save too frequently
    const timeSinceLastSave = Date.now() - this.lastSaveTime
    if (timeSinceLastSave < this.minSaveInterval) {
      const delay = this.minSaveInterval - timeSinceLastSave
      this.saveTimer = setTimeout(() => this.performAutoSave(), delay)
      return
    }

    // Schedule immediate save
    this.saveTimer = setTimeout(() => this.performAutoSave(), 1000)
  }

  private startAutoSave(): void {
    if (!this.isEnabled) return

    this.saveTimer = setInterval(() => {
      this.performAutoSave()
    }, this.saveInterval)
  }

  private performAutoSave(): void {
    const project = this.projectStore.getCurrentProject()
    if (!project || !this.projectStore.hasUnsavedChanges()) {
      return
    }

    try {
      this.projectStore.saveProject()
      this.lastSaveTime = Date.now()
      
      this.typedEventBus.emit('autosave.completed', {
        projectId: project.id,
        timestamp: this.lastSaveTime
      })
    } catch (error) {
      console.error('[AutoSaveManager] Auto-save failed:', error)
      
      this.typedEventBus.emit('autosave.failed', {
        projectId: project.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  enable(): void {
    if (this.isEnabled) return
    
    this.isEnabled = true
    this.startAutoSave()
  }

  disable(): void {
    if (!this.isEnabled) return
    
    this.isEnabled = false
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
  }

  setInterval(interval: number): void {
    this.saveInterval = interval
    
    if (this.isEnabled) {
      this.disable()
      this.enable()
    }
  }

  dispose(): void {
    this.disable()
  }
} 