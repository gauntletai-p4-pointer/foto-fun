import type { CanvasManager, CanvasObject, Layer } from '../types'

export interface RenderPlan {
  layers: Set<string>
  objects: Set<string>
  fullRedraw: boolean
  dirtyRegions: DirtyRegion[]
}

export interface DirtyRegion {
  x: number
  y: number
  width: number
  height: number
  layerId: string
}

export interface RenderRequest {
  type: string
  target: unknown
}

export interface RenderResult {
  success: boolean
  renderedLayers: number
  renderedObjects: number
  renderTime: number
  errors: string[]
}

export interface RenderDebugInfo {
  lastRenderTime: number
  renderCount: number
  averageRenderTime: number
  dirtyRegions: DirtyRegion[]
  pendingRenders: number
}

/**
 * Optimized rendering pipeline for canvas operations
 */
export class RenderPipeline {
  private canvas: CanvasManager
  private renderQueue: RenderPlan[] = []
  private isRendering = false
  private renderStats = {
    count: 0,
    totalTime: 0,
    lastTime: 0
  }
  
  // Dirty region tracking
  private dirtyRegions = new Map<string, DirtyRegion[]>()
  private frameRequest: number | null = null
  
  constructor(canvas: CanvasManager) {
    this.canvas = canvas
  }
  
  /**
   * Render a single object efficiently
   */
  async renderObject(object: CanvasObject, layer: Layer): Promise<void> {
    const plan: RenderPlan = {
      layers: new Set([layer.id]),
      objects: new Set([object.id]),
      fullRedraw: false,
      dirtyRegions: [this.getObjectBounds(object, layer.id)]
    }
    
    await this.executePlan(plan)
  }
  
  /**
   * Render entire document
   */
  async renderDocument(canvas: CanvasManager): Promise<void> {
    const plan: RenderPlan = {
      layers: new Set(canvas.state.layers.map(l => l.id)),
      objects: new Set(),
      fullRedraw: true,
      dirtyRegions: []
    }
    
    await this.executePlan(plan)
  }
  
  /**
   * Batch render multiple operations
   */
  async batchRender(requests: RenderRequest[]): Promise<void> {
    const plan = this.createBatchPlan(requests)
    await this.executePlan(plan)
  }
  
  /**
   * Prepare render plan without executing
   */
  prepareRender(objects: CanvasObject[]): RenderPlan {
    const layers = new Set<string>()
    const objectIds = new Set<string>()
    const dirtyRegions: DirtyRegion[] = []
    
    for (const obj of objects) {
      layers.add(obj.layerId)
      objectIds.add(obj.id)
      dirtyRegions.push(this.getObjectBounds(obj, obj.layerId))
    }
    
    // Merge overlapping regions
    const mergedRegions = this.mergeRegions(dirtyRegions)
    
    return {
      layers,
      objects: objectIds,
      fullRedraw: false,
      dirtyRegions: mergedRegions
    }
  }
  
  /**
   * Execute a render plan
   */
  async executeRender(plan: RenderPlan): Promise<void> {
    await this.executePlan(plan)
  }
  
  /**
   * Validate render result
   */
  validateRender(result: RenderResult): boolean {
    return result.success && result.errors.length === 0
  }
  
  /**
   * Get debug information
   */
  captureRenderState(): RenderDebugInfo {
    const allDirtyRegions: DirtyRegion[] = []
    for (const regions of this.dirtyRegions.values()) {
      allDirtyRegions.push(...regions)
    }
    
    return {
      lastRenderTime: this.renderStats.lastTime,
      renderCount: this.renderStats.count,
      averageRenderTime: this.renderStats.totalTime / Math.max(1, this.renderStats.count),
      dirtyRegions: allDirtyRegions,
      pendingRenders: this.renderQueue.length
    }
  }
  
  // Private methods
  
  private async executePlan(plan: RenderPlan): Promise<void> {
    // Add to queue
    this.renderQueue.push(plan)
    
    // Process queue
    if (!this.isRendering) {
      await this.processQueue()
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.renderQueue.length === 0) return
    
    this.isRendering = true
    const startTime = performance.now()
    
    try {
      // Merge all pending plans
      const mergedPlan = this.mergePlans(this.renderQueue)
      this.renderQueue = []
      
      // Execute render
      if (mergedPlan.fullRedraw) {
        await this.fullRedraw()
      } else {
        await this.partialRedraw(mergedPlan)
      }
      
      // Update stats
      const renderTime = performance.now() - startTime
      this.renderStats.count++
      this.renderStats.totalTime += renderTime
      this.renderStats.lastTime = renderTime
      
    } finally {
      this.isRendering = false
      
      // Process any new items that were added while rendering
      if (this.renderQueue.length > 0) {
        requestAnimationFrame(() => this.processQueue())
      }
    }
  }
  
  private async fullRedraw(): Promise<void> {
    // Clear dirty regions
    this.dirtyRegions.clear()
    
    // Batch draw entire stage
    this.canvas.konvaStage.batchDraw()
  }
  
  private async partialRedraw(plan: RenderPlan): Promise<void> {
    // Update dirty regions
    for (const region of plan.dirtyRegions) {
      if (!this.dirtyRegions.has(region.layerId)) {
        this.dirtyRegions.set(region.layerId, [])
      }
      this.dirtyRegions.get(region.layerId)!.push(region)
    }
    
    // Render each affected layer
    for (const layerId of plan.layers) {
      const layer = this.canvas.state.layers.find(l => l.id === layerId)
      if (layer) {
        // For now, redraw entire layer
        // TODO: Implement true dirty rectangle rendering
        layer.konvaLayer.batchDraw()
      }
    }
    
    // Clear processed regions
    for (const layerId of plan.layers) {
      this.dirtyRegions.delete(layerId)
    }
  }
  
  private createBatchPlan(requests: RenderRequest[]): RenderPlan {
    const layers = new Set<string>()
    const objects = new Set<string>()
    let fullRedraw = false
    const dirtyRegions: DirtyRegion[] = []
    
    for (const request of requests) {
      // Analyze request and update plan
      // This is simplified - real implementation would parse request types
      if (request.type === 'fullRedraw') {
        fullRedraw = true
        break
      }
    }
    
    return {
      layers,
      objects,
      fullRedraw,
      dirtyRegions
    }
  }
  
  private mergePlans(plans: RenderPlan[]): RenderPlan {
    const layers = new Set<string>()
    const objects = new Set<string>()
    let fullRedraw = false
    const dirtyRegions: DirtyRegion[] = []
    
    for (const plan of plans) {
      if (plan.fullRedraw) {
        fullRedraw = true
        break
      }
      
      plan.layers.forEach(l => layers.add(l))
      plan.objects.forEach(o => objects.add(o))
      dirtyRegions.push(...plan.dirtyRegions)
    }
    
    return {
      layers,
      objects,
      fullRedraw,
      dirtyRegions: fullRedraw ? [] : this.mergeRegions(dirtyRegions)
    }
  }
  
  private getObjectBounds(object: CanvasObject, layerId: string): DirtyRegion {
    const node = object.node
    const rect = node.getClientRect()
    
    // Add some padding for anti-aliasing and effects
    const padding = 5
    
    return {
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      layerId
    }
  }
  
  private mergeRegions(regions: DirtyRegion[]): DirtyRegion[] {
    if (regions.length <= 1) return regions
    
    // Group by layer
    const byLayer = new Map<string, DirtyRegion[]>()
    for (const region of regions) {
      if (!byLayer.has(region.layerId)) {
        byLayer.set(region.layerId, [])
      }
      byLayer.get(region.layerId)!.push(region)
    }
    
    // Merge overlapping regions per layer
    const merged: DirtyRegion[] = []
    
    for (const [layerId, layerRegions] of byLayer) {
      const mergedLayerRegions = this.mergeLayerRegions(layerRegions)
      merged.push(...mergedLayerRegions.map(r => ({ ...r, layerId })))
    }
    
    return merged
  }
  
  private mergeLayerRegions(regions: DirtyRegion[]): Omit<DirtyRegion, 'layerId'>[] {
    // Simple merge algorithm - can be optimized
    const merged: Omit<DirtyRegion, 'layerId'>[] = []
    const used = new Set<number>()
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue
      
      let current: Omit<DirtyRegion, 'layerId'> = {
        x: regions[i].x,
        y: regions[i].y,
        width: regions[i].width,
        height: regions[i].height
      }
      used.add(i)
      
      // Try to merge with other regions
      let changed = true
      while (changed) {
        changed = false
        
        for (let j = 0; j < regions.length; j++) {
          if (used.has(j)) continue
          
          if (this.regionsOverlap(current, regions[j])) {
            // Merge regions
            const minX = Math.min(current.x, regions[j].x)
            const minY = Math.min(current.y, regions[j].y)
            const maxX = Math.max(current.x + current.width, regions[j].x + regions[j].width)
            const maxY = Math.max(current.y + current.height, regions[j].y + regions[j].height)
            
            current = {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
            }
            
            used.add(j)
            changed = true
          }
        }
      }
      
      merged.push(current)
    }
    
    return merged
  }
  
  private regionsOverlap(a: Omit<DirtyRegion, 'layerId'>, b: Omit<DirtyRegion, 'layerId'>): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }
} 