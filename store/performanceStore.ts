import { create } from 'zustand'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
}

interface PerformanceStore {
  metrics: PerformanceMetric[]
  slowOperationThreshold: number
  
  // Track a synchronous operation
  track: <T>(name: string, operation: () => T) => T
  
  // Track an async operation
  trackAsync: <T>(name: string, operation: () => Promise<T>) => Promise<T>
  
  // Get metrics for analysis
  getMetrics: (name?: string) => PerformanceMetric[]
  
  // Clear metrics
  clearMetrics: () => void
  
  // Get average duration for an operation
  getAverageDuration: (name: string) => number | null
  
  // Log slow operations
  logSlowOperations: () => void
}

export const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  metrics: [],
  slowOperationThreshold: 16, // 16ms for 60fps
  
  track: <T>(name: string, operation: () => T): T => {
    const start = performance.now()
    
    try {
      const result = operation()
      const duration = performance.now() - start
      
      set((state) => ({
        metrics: [
          ...state.metrics,
          {
            name,
            duration,
            timestamp: Date.now()
          }
        ].slice(-1000) // Keep last 1000 metrics
      }))
      
      // Warn if slow
      if (duration > get().slowOperationThreshold) {
        console.warn(`Slow operation "${name}": ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(`Operation "${name}" failed after ${duration.toFixed(2)}ms:`, error)
      throw error
    }
  },
  
  trackAsync: async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - start
      
      set((state) => ({
        metrics: [
          ...state.metrics,
          {
            name,
            duration,
            timestamp: Date.now()
          }
        ].slice(-1000) // Keep last 1000 metrics
      }))
      
      // Warn if slow
      if (duration > get().slowOperationThreshold) {
        console.warn(`Slow async operation "${name}": ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(`Async operation "${name}" failed after ${duration.toFixed(2)}ms:`, error)
      throw error
    }
  },
  
  getMetrics: (name?: string) => {
    const { metrics } = get()
    if (name) {
      return metrics.filter(m => m.name === name)
    }
    return metrics
  },
  
  clearMetrics: () => {
    set({ metrics: [] })
  },
  
  getAverageDuration: (name: string) => {
    const metrics = get().getMetrics(name)
    if (metrics.length === 0) return null
    
    const sum = metrics.reduce((acc, m) => acc + m.duration, 0)
    return sum / metrics.length
  },
  
  logSlowOperations: () => {
    const { metrics, slowOperationThreshold } = get()
    const slowOps = metrics.filter(m => m.duration > slowOperationThreshold)
    
    if (slowOps.length === 0) {
      console.log('No slow operations detected')
      return
    }
    
    console.group('Slow Operations Report')
    
    // Group by operation name
    const grouped = slowOps.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = []
      }
      acc[metric.name].push(metric)
      return acc
    }, {} as Record<string, PerformanceMetric[]>)
    
    // Log each group
    Object.entries(grouped).forEach(([name, metrics]) => {
      const avg = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
      const max = Math.max(...metrics.map(m => m.duration))
      const min = Math.min(...metrics.map(m => m.duration))
      
      console.log(`
Operation: ${name}
Count: ${metrics.length}
Average: ${avg.toFixed(2)}ms
Min: ${min.toFixed(2)}ms
Max: ${max.toFixed(2)}ms
      `)
    })
    
    console.groupEnd()
  }
})) 