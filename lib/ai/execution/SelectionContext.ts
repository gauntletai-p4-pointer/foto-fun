import type { FabricObject } from 'fabric'
import { nanoid } from 'nanoid'

/**
 * SelectionContext - Manages object selection state across tool executions
 * 
 * This system ensures that tools operate only on intended objects,
 * preventing the "selection drift" issue where operations affect
 * unintended objects after new objects are added to the canvas.
 */

export interface SelectionScope {
  id: string
  targetObjects: FabricObject[]
  targetType: 'image' | 'text' | 'shape' | 'mixed'
  createdAt: number
  expiresAt: number
  source: 'user-selection' | 'tool-chain' | 'adapter' | 'auto'
}

export class SelectionContextManager {
  private static instance: SelectionContextManager
  private activeScopes: Map<string, SelectionScope> = new Map()
  private currentScopeId: string | null = null
  
  // Singleton pattern
  static getInstance(): SelectionContextManager {
    if (!SelectionContextManager.instance) {
      SelectionContextManager.instance = new SelectionContextManager()
    }
    return SelectionContextManager.instance
  }
  
  /**
   * Create a new selection scope
   */
  createScope(
    targetObjects: FabricObject[],
    targetType: SelectionScope['targetType'],
    source: SelectionScope['source'],
    ttlMs: number = 30000 // 30 seconds default TTL
  ): string {
    const scopeId = nanoid()
    const now = Date.now()
    
    const scope: SelectionScope = {
      id: scopeId,
      targetObjects,
      targetType,
      createdAt: now,
      expiresAt: now + ttlMs,
      source
    }
    
    this.activeScopes.set(scopeId, scope)
    this.cleanExpiredScopes()
    
    console.log(`[SelectionContext] Created scope ${scopeId} with ${targetObjects.length} ${targetType} objects from ${source}`)
    
    return scopeId
  }
  
  /**
   * Set the current active scope
   */
  setActiveScope(scopeId: string | null): void {
    if (scopeId && !this.activeScopes.has(scopeId)) {
      console.warn(`[SelectionContext] Attempted to set invalid scope: ${scopeId}`)
      return
    }
    
    this.currentScopeId = scopeId
    console.log(`[SelectionContext] Active scope set to: ${scopeId}`)
  }
  
  /**
   * Get the current active scope
   */
  getActiveScope(): SelectionScope | null {
    if (!this.currentScopeId) return null
    
    const scope = this.activeScopes.get(this.currentScopeId)
    if (!scope) {
      this.currentScopeId = null
      return null
    }
    
    // Check if scope has expired
    if (Date.now() > scope.expiresAt) {
      this.activeScopes.delete(this.currentScopeId)
      this.currentScopeId = null
      return null
    }
    
    return scope
  }
  
  /**
   * Get objects from the active scope, filtered by type
   */
  getTargetObjects(filterType?: 'image' | 'text' | 'shape'): FabricObject[] {
    const scope = this.getActiveScope()
    if (!scope) return []
    
    if (!filterType || scope.targetType === filterType || scope.targetType === 'mixed') {
      return scope.targetObjects.filter(obj => {
        // Validate objects still exist and match type if specified
        if (!obj || !obj.canvas) return false
        if (filterType && obj.type !== filterType) return false
        return true
      })
    }
    
    return []
  }
  
  /**
   * Clear a specific scope
   */
  clearScope(scopeId: string): void {
    this.activeScopes.delete(scopeId)
    if (this.currentScopeId === scopeId) {
      this.currentScopeId = null
    }
    console.log(`[SelectionContext] Cleared scope: ${scopeId}`)
  }
  
  /**
   * Clear all scopes
   */
  clearAllScopes(): void {
    this.activeScopes.clear()
    this.currentScopeId = null
    console.log('[SelectionContext] Cleared all scopes')
  }
  
  /**
   * Clean up expired scopes
   */
  private cleanExpiredScopes(): void {
    const now = Date.now()
    const expiredScopes: string[] = []
    
    this.activeScopes.forEach((scope, id) => {
      if (now > scope.expiresAt) {
        expiredScopes.push(id)
      }
    })
    
    expiredScopes.forEach(id => {
      this.activeScopes.delete(id)
      if (this.currentScopeId === id) {
        this.currentScopeId = null
      }
    })
    
    if (expiredScopes.length > 0) {
      console.log(`[SelectionContext] Cleaned ${expiredScopes.length} expired scopes`)
    }
  }
}

// Export singleton instance
export const selectionContext = SelectionContextManager.getInstance() 