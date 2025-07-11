import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface RecentFile {
  id: string
  name: string
  path?: string
  lastOpened: Date
  thumbnail?: string
  size?: number
}

/**
 * Manages recently opened files
 */
export class RecentFilesManager {
  private static readonly MAX_RECENT_FILES = 20
  private static readonly STORAGE_KEY = 'fotofun-recent-files'
  
  private recentFiles: RecentFile[] = []
  
  constructor(private typedEventBus: TypedEventBus) {
    this.loadRecentFiles()
    this.subscribeToEvents()
  }

  /**
   * Get recent files
   */
  getRecentFiles(limit?: number): RecentFile[] {
    const max = limit || RecentFilesManager.MAX_RECENT_FILES
    return this.recentFiles.slice(0, max)
  }

  /**
   * Add a file to recent files
   */
  addRecentFile(file: Omit<RecentFile, 'lastOpened'>): void {
    const recentFile: RecentFile = {
      ...file,
      lastOpened: new Date()
    }
    
    // Remove existing entry if present
    this.recentFiles = this.recentFiles.filter(f => f.id !== file.id)
    
    // Add to beginning
    this.recentFiles.unshift(recentFile)
    
    // Trim to max
    if (this.recentFiles.length > RecentFilesManager.MAX_RECENT_FILES) {
      this.recentFiles = this.recentFiles.slice(0, RecentFilesManager.MAX_RECENT_FILES)
    }
    
    this.saveRecentFiles()
    
    // Emit event
    this.typedEventBus.emit('recentFiles.updated', {
      files: this.getRecentFiles()
    })
  }

  /**
   * Remove a file from recent files
   */
  removeRecentFile(fileId: string): void {
    this.recentFiles = this.recentFiles.filter(f => f.id !== fileId)
    this.saveRecentFiles()
    
    // Emit event
    this.typedEventBus.emit('recentFiles.updated', {
      files: this.getRecentFiles()
    })
  }

  /**
   * Clear all recent files
   */
  clearRecentFiles(): void {
    this.recentFiles = []
    this.saveRecentFiles()
    
    // Emit event
    this.typedEventBus.emit('recentFiles.cleared', {})
  }

  /**
   * Update thumbnail for a recent file
   */
  updateThumbnail(fileId: string, thumbnail: string): void {
    const file = this.recentFiles.find(f => f.id === fileId)
    if (file) {
      file.thumbnail = thumbnail
      this.saveRecentFiles()
    }
  }

  /**
   * Check if a file exists in recent files
   */
  hasRecentFile(fileId: string): boolean {
    return this.recentFiles.some(f => f.id === fileId)
  }

  /**
   * Subscribe to document events
   */
  private subscribeToEvents(): void {
    // Add to recent when document is opened
    this.typedEventBus.on('document.opened', (data) => {
      if (data && data.document) {
        this.addRecentFile({
          id: data.document.id,
          name: data.document.name,
          path: data.document.path,
          size: data.document.size
        })
      }
    })
    
    // Add to recent when document is saved
    this.typedEventBus.on('document.saved', (data) => {
      if (data && data.documentId) {
        // Update last opened time for saved document
        const file = this.recentFiles.find(f => f.id === data.documentId)
        if (file) {
          file.lastOpened = new Date()
          this.saveRecentFiles()
        }
      }
    })
  }

  /**
   * Load recent files from storage
   */
  private loadRecentFiles(): void {
    try {
      const stored = localStorage.getItem(RecentFilesManager.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentFile[]
        this.recentFiles = parsed.map(file => ({
          ...file,
          lastOpened: new Date(file.lastOpened)
        }))
      }
    } catch (error) {
      console.error('Failed to load recent files:', error)
      this.recentFiles = []
    }
  }

  /**
   * Save recent files to storage
   */
  private saveRecentFiles(): void {
    try {
      localStorage.setItem(
        RecentFilesManager.STORAGE_KEY,
        JSON.stringify(this.recentFiles)
      )
    } catch (error) {
      console.error('Failed to save recent files:', error)
    }
  }

  /**
   * Generate a thumbnail for the current canvas
   */
  async generateThumbnail(canvasElement: HTMLCanvasElement, maxSize = 200): Promise<string> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    
    // Calculate thumbnail dimensions
    const aspectRatio = canvasElement.width / canvasElement.height
    let width = maxSize
    let height = maxSize
    
    if (aspectRatio > 1) {
      height = maxSize / aspectRatio
    } else {
      width = maxSize * aspectRatio
    }
    
    canvas.width = width
    canvas.height = height
    
    // Draw scaled down version
    ctx.drawImage(canvasElement, 0, 0, width, height)
    
    // Convert to data URL
    return canvas.toDataURL('image/jpeg', 0.8)
  }
} 