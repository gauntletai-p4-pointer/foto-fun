import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { EventStore } from '@/lib/events/core/EventStore'

/**
 * Project Store State
 * Manages projects on infinite canvas - no boundaries, no background, just objects
 */
export interface ProjectStoreState {
  currentProject: {
    id: string
    name: string
    createdAt: number
    lastModified: number
  } | null
  recentProjects: Array<{
    id: string
    name: string
    path?: string
    lastOpened: Date
    thumbnail?: string
    size?: number
  }>
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
  lastSaved: Date | null
  autoSaveEnabled: boolean
  autoSaveInterval: number
}

/**
 * Project Store Configuration
 */
export interface ProjectStoreConfig {
  autoSave?: boolean
  versionControl?: boolean
  autoSaveInterval?: number
}

/**
 * Event-driven project store
 * Manages projects on infinite canvas - no boundaries, no frames, just objects
 * 
 * Uses dependency injection instead of singleton pattern.
 */
export class EventProjectStore extends BaseStore<ProjectStoreState> {
  private typedEventBus: TypedEventBus
  private config: ProjectStoreConfig
  private typedSubscriptions: Array<() => void> = []
  private autoSaveTimer: NodeJS.Timeout | null = null
  private storeDisposed = false

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus, config: ProjectStoreConfig = {}) {
    super(
      {
        currentProject: null,
        recentProjects: [],
        isDirty: false,
        isSaving: false,
        isLoading: false,
        lastSaved: null,
        autoSaveEnabled: config.autoSave ?? true,
        autoSaveInterval: config.autoSaveInterval ?? 30000
      },
      eventStore
    )
    
    this.typedEventBus = typedEventBus
    this.config = {
      autoSave: true,
      versionControl: true,
      autoSaveInterval: 30000,
      ...config
    }
    
    this.initializeTypedSubscriptions()
    this.loadRecentProjects()
    
    if (this.config.autoSave) {
      this.setupAutoSave()
    }
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.getState().isDirty && this.getState().currentProject) {
        this.performAutoSave()
      }
    }, this.config.autoSaveInterval)
  }
  
  private async performAutoSave(): Promise<void> {
    // Auto-save logic would go here
    console.log('[ProjectStore] Performing auto-save')
  }
  
  /**
   * Dispose of the store and clean up resources
   */
  dispose(): void {
    if (this.storeDisposed) return
    
    this.storeDisposed = true
    
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    
    // Unsubscribe from typed events
    this.typedSubscriptions.forEach(unsubscribe => unsubscribe())
    this.typedSubscriptions = []
    
    // Call parent dispose
    super.dispose()
    
    console.log('[ProjectStore] Disposed')
  }
  
  /**
   * Check if the store is disposed
   */
  isDisposed(): boolean {
    return this.storeDisposed
  }

  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // For now, return empty map as we're using TypedEventBus for UI events
    // Event sourcing events would be handled here if needed
    return new Map()
  }

  private initializeTypedSubscriptions(): void {
    if (this.storeDisposed) return
    
    // Subscribe to project events
    this.typedSubscriptions.push(
      this.typedEventBus.on('project.loaded', (data) => {
        this.setState(state => ({
          ...state,
          currentProject: data.project,
          isLoading: false,
          isDirty: false
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('project.saved', () => {
        this.setState(state => ({
          ...state,
          isDirty: false,
          isSaving: false,
          lastSaved: new Date()
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('project.created', (data) => {
        this.setState(state => ({
          ...state,
          currentProject: {
            id: data.projectId,
            name: data.name,
            createdAt: data.metadata.created.getTime(),
            lastModified: data.metadata.modified.getTime()
          },
          isDirty: false,
          isLoading: false
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.added', () => {
        this.setState(state => ({ ...state, isDirty: true }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.modified', () => {
        this.setState(state => ({ ...state, isDirty: true }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('canvas.object.removed', () => {
        this.setState(state => ({ ...state, isDirty: true }))
      })
    )
  }

  private loadRecentProjects(): void {
    // Load recent projects from localStorage or other persistence
    const stored = localStorage.getItem('recentProjects')
    if (stored) {
      try {
        const recentProjects = JSON.parse(stored)
        this.setState(state => ({ ...state, recentProjects }))
      } catch (error) {
        console.error('[ProjectStore] Failed to load recent projects:', error)
      }
    }
  }

  // Public methods
  createProject(name: string): void {
    if (this.storeDisposed) return
    
    const now = new Date()
    const project = {
      id: `project-${Date.now()}`,
      name,
      createdAt: now.getTime(),
      lastModified: now.getTime()
    }

    this.setState(state => ({
      ...state,
      currentProject: project,
      isDirty: false,
      isLoading: false
    }))

    this.typedEventBus.emit('project.created', {
      projectId: project.id,
      name: project.name,
      metadata: {
        id: project.id,
        name: project.name,
        created: now,
        modified: now
      }
    })
  }

  saveProject(): void {
    if (this.storeDisposed) return
    
    const { currentProject } = this.getState()
    if (!currentProject) return

    this.setState(state => ({ ...state, isSaving: true }))

    // Simulate save operation
    setTimeout(() => {
      this.typedEventBus.emit('project.saved', {
        projectId: currentProject.id
      })
    }, 1000)
  }

  addToRecentProjects(project: { id: string; name: string; path?: string; size?: number }): void {
    if (this.storeDisposed) return
    
    const { recentProjects } = this.getState()
    const updated = [
      { ...project, lastOpened: new Date() },
      ...recentProjects.filter(proj => proj.id !== project.id)
    ].slice(0, 10) // Keep only 10 recent projects

    this.setState(state => ({ ...state, recentProjects: updated }))

    // Persist to localStorage
    localStorage.setItem('recentProjects', JSON.stringify(updated))

    this.typedEventBus.emit('recentFiles.updated', { files: updated })
  }

  clearRecentProjects(): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({ ...state, recentProjects: [] }))
    localStorage.removeItem('recentProjects')
    this.typedEventBus.emit('recentFiles.cleared', {})
  }

  // API methods for current project
  getCurrentProject(): ProjectStoreState['currentProject'] {
    return this.getState().currentProject
  }

  hasUnsavedChanges(): boolean {
    return this.getState().isDirty
  }

  markAsSaved(): void {
    this.setState(state => ({
      ...state,
      isDirty: false,
      isSaving: false,
      lastSaved: new Date()
    }))
  }
} 