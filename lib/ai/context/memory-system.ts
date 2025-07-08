import { z } from 'zod'

// Memory schemas
export const OperationHistorySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  operation: z.string(),
  params: z.unknown(),
  result: z.unknown(),
  userFeedback: z.enum(['positive', 'negative', 'neutral']).optional()
})

export const WorkflowPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  frequency: z.number(),
  steps: z.array(z.string()),
  lastUsed: z.number(),
  userPreference: z.number() // 0-1 score
})

export const UserPreferenceSchema = z.object({
  id: z.string(),
  category: z.string(),
  preference: z.string(),
  confidence: z.number(),
  lastUpdated: z.number()
})

export type OperationHistory = z.infer<typeof OperationHistorySchema>
export type WorkflowPattern = z.infer<typeof WorkflowPatternSchema>
export type UserPreference = z.infer<typeof UserPreferenceSchema>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MemoryStore {
  // Short-term memory (current session)
  shortTermOperations: OperationHistory[]
  
  // Long-term memory (persisted)
  longTermPatterns: WorkflowPattern[]
  userPreferences: UserPreference[]
  
  // Episodic memory (specific editing sessions)
  episodes: Array<{
    id: string
    timestamp: number
    operations: OperationHistory[]
    outcome: 'success' | 'failure' | 'partial'
  }>
}

export class MemorySystem {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'fotofun-ai-memory'
  private readonly DB_VERSION = 1
  
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available, memory system will not persist')
      return
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains('operations')) {
          db.createObjectStore('operations', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('patterns')) {
          db.createObjectStore('patterns', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('episodes')) {
          db.createObjectStore('episodes', { keyPath: 'id' })
        }
      }
    })
  }
  
  async recordOperation(operation: Omit<OperationHistory, 'id' | 'timestamp'>): Promise<void> {
    const record: OperationHistory = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }
    
    if (this.db) {
      const transaction = this.db.transaction(['operations'], 'readwrite')
      const store = transaction.objectStore('operations')
      store.add(record)
    }
  }
  
  async detectPatterns(): Promise<WorkflowPattern[]> {
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly')
      const store = transaction.objectStore('operations')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const operations = request.result as OperationHistory[]
        const patterns = this.analyzePatterns(operations)
        
        // Store detected patterns
        const patternTransaction = this.db!.transaction(['patterns'], 'readwrite')
        const patternStore = patternTransaction.objectStore('patterns')
        patterns.forEach(pattern => patternStore.put(pattern))
        
        resolve(patterns)
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  private analyzePatterns(operations: OperationHistory[]): WorkflowPattern[] {
    // Simple pattern detection - look for sequences of operations that repeat
    const sequences = new Map<string, { count: number; operations: string[] }>()
    
    for (let i = 0; i < operations.length - 2; i++) {
      const sequence = [
        operations[i].operation,
        operations[i + 1].operation,
        operations[i + 2].operation
      ]
      const key = sequence.join('->')
      
      if (sequences.has(key)) {
        sequences.get(key)!.count++
      } else {
        sequences.set(key, { count: 1, operations: sequence })
      }
    }
    
    // Convert to workflow patterns
    const patterns: WorkflowPattern[] = []
    sequences.forEach((data, key) => {
      if (data.count >= 3) { // Pattern must occur at least 3 times
        patterns.push({
          id: crypto.randomUUID(),
          name: key,
          frequency: data.count,
          steps: data.operations,
          lastUsed: Date.now(),
          userPreference: data.count / operations.length // Simple preference score
        })
      }
    })
    
    return patterns
  }
  
  async getRelevantContext(currentOperation: string): Promise<{
    recentOperations: OperationHistory[]
    relevantPatterns: WorkflowPattern[]
    userPreferences: UserPreference[]
  }> {
    if (!this.db) {
      return {
        recentOperations: [],
        relevantPatterns: [],
        userPreferences: []
      }
    }
    
    const [operations, patterns, preferences] = await Promise.all([
      this.getRecentOperations(10),
      this.getRelevantPatterns(currentOperation),
      this.getUserPreferences()
    ])
    
    return {
      recentOperations: operations,
      relevantPatterns: patterns,
      userPreferences: preferences
    }
  }
  
  private async getRecentOperations(limit: number): Promise<OperationHistory[]> {
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly')
      const store = transaction.objectStore('operations')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const operations = request.result as OperationHistory[]
        operations.sort((a, b) => b.timestamp - a.timestamp)
        resolve(operations.slice(0, limit))
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  private async getRelevantPatterns(operation: string): Promise<WorkflowPattern[]> {
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['patterns'], 'readonly')
      const store = transaction.objectStore('patterns')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const patterns = request.result as WorkflowPattern[]
        // Filter patterns that include the current operation
        const relevant = patterns.filter(p => p.steps.includes(operation))
        resolve(relevant)
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  private async getUserPreferences(): Promise<UserPreference[]> {
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['preferences'], 'readonly')
      const store = transaction.objectStore('preferences')
      const request = store.getAll()
      
      request.onsuccess = () => {
        resolve(request.result as UserPreference[])
      }
      
      request.onerror = () => reject(request.error)
    })
  }
  
  async updateUserPreference(category: string, preference: string): Promise<void> {
    if (!this.db) return
    
    const pref: UserPreference = {
      id: `${category}-${preference}`,
      category,
      preference,
      confidence: 0.8,
      lastUpdated: Date.now()
    }
    
    const transaction = this.db.transaction(['preferences'], 'readwrite')
    const store = transaction.objectStore('preferences')
    store.put(pref)
  }
  
  async clear(): Promise<void> {
    if (!this.db) return
    
    const transaction = this.db.transaction(
      ['operations', 'patterns', 'preferences', 'episodes'],
      'readwrite'
    )
    
    transaction.objectStore('operations').clear()
    transaction.objectStore('patterns').clear()
    transaction.objectStore('preferences').clear()
    transaction.objectStore('episodes').clear()
  }
}

// Singleton instance
export const memorySystem = new MemorySystem() 