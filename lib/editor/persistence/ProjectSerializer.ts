import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { EventProjectStore } from '@/lib/store/project/EventProjectStore'

/**
 * Project serializer for infinite canvas projects
 * Handles saving/loading project data with objects
 */
export class ProjectSerializer {
  constructor(
    private typedEventBus: TypedEventBus,
    private projectStore: EventProjectStore
  ) {}

  /**
   * Save current project to file
   */
  async saveToFile(filename?: string): Promise<void> {
    const project = this.projectStore.getCurrentProject()
    if (!project) {
      throw new Error('No project to save')
    }

    try {
      // Get all canvas objects (this would come from canvas manager)
      const projectData = {
        project: {
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          lastModified: Date.now()
        },
        objects: [], // Canvas objects would be serialized here
        metadata: {
          version: '1.0.0',
          exportedAt: Date.now()
        }
      }

      const json = JSON.stringify(projectData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      
      const finalFilename = filename || `${project.name}.fotofun`
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = finalFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.projectStore.markAsSaved()
      
      this.typedEventBus.emit('project.exported', {
        projectId: project.id,
        filename: finalFilename
      })
    } catch (error) {
      console.error('[ProjectSerializer] Save failed:', error)
      throw error
    }
  }

  /**
   * Load project from file
   */
  async loadFromFile(file: File): Promise<void> {
    try {
      const text = await file.text()
      const projectData = JSON.parse(text)

      if (!this.validateProjectData(projectData)) {
        throw new Error('Invalid project file format')
      }

      // Create new project from loaded data
      this.projectStore.createProject(projectData.project.name)
      
      // Load objects would happen here via canvas manager
      
      this.typedEventBus.emit('project.imported', {
        projectId: projectData.project.id,
        filename: file.name
      })
    } catch (error) {
      console.error('[ProjectSerializer] Load failed:', error)
      throw error
    }
  }

  /**
   * Save to browser storage
   */
  async saveToStorage(key: string): Promise<void> {
    const project = this.projectStore.getCurrentProject()
    if (!project) return

    const projectData = {
      project,
      objects: [], // Canvas objects would be serialized here
      savedAt: Date.now()
    }

    localStorage.setItem(key, JSON.stringify(projectData))
  }

  /**
   * Load from browser storage
   */
  async loadFromStorage(key: string): Promise<unknown> {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    return JSON.parse(stored)
  }

  /**
   * Delete from browser storage
   */
  async deleteFromStorage(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  /**
   * Validate project data structure
   */
  private validateProjectData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false
    
    const projectData = data as Record<string, unknown>
    
    return (
      projectData.project &&
      typeof projectData.project === 'object' &&
      Array.isArray(projectData.objects)
    )
  }
} 