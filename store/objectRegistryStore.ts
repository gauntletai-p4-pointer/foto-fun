import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { FabricObject } from 'fabric'
import { useCanvasStore } from './canvasStore'
import { usePerformanceStore } from './performanceStore'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface ObjectRenderCache {
  imageData: ImageData
  bounds: BoundingBox
  version: number
}

interface ObjectRegistryStore {
  // Map pixel coordinates to object IDs
  pixelToObject: Map<string, string>
  
  // Cache object bounds for performance
  objectBounds: Map<string, BoundingBox>
  
  // Track object render order
  renderOrder: string[]
  
  // Track if pixel map needs update
  isDirty: boolean
  
  // Changed objects that need updating
  dirtyObjects: Set<string>
  
  // Object render cache
  renderCache: Map<string, ObjectRenderCache>
  
  // Sampling resolution (1 = full res, 2 = half res, 4 = quarter res)
  samplingResolution: number
  
  // Progressive loading state
  isLoading: boolean
  loadingProgress: number
  
  // Methods
  updatePixelMap: () => void
  updatePixelMapProgressive: () => void
  updatePixelMapIfNeeded: () => void
  updatePixelMapIncremental: (objectIds: string[]) => void
  markDirty: (objectId?: string) => void
  clearCache: (objectId?: string) => void
  setSamplingResolution: (resolution: number) => void
  getObjectAtPixel: (x: number, y: number) => FabricObject | null
  getObjectPixels: (objectId: string) => ImageData | null
  getObjectsAtPixel: (x: number, y: number) => FabricObject[]
  
  // Object overlap handling
  getObjectZOrder: (objectId: string) => number
  getTopObjectAtPixel: (x: number, y: number, includeTransparent?: boolean) => FabricObject | null
}

// Reusable canvas for rendering (avoid creating new canvases)
let sharedCanvas: HTMLCanvasElement | null = null
let sharedContext: CanvasRenderingContext2D | null = null

function getSharedCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas')
    sharedContext = sharedCanvas.getContext('2d', { willReadFrequently: true })
  }
  
  if (!sharedContext) return null
  
  // Resize if needed
  if (sharedCanvas.width < width || sharedCanvas.height < height) {
    sharedCanvas.width = Math.max(width, sharedCanvas.width)
    sharedCanvas.height = Math.max(height, sharedCanvas.height)
  }
  
  // Clear the area we'll use
  sharedContext.clearRect(0, 0, width, height)
  
  return { canvas: sharedCanvas, ctx: sharedContext }
}

export const useObjectRegistryStore = create<ObjectRegistryStore>()(
  devtools(
    (set, get) => ({
      pixelToObject: new Map(),
      objectBounds: new Map(),
      renderOrder: [],
      isDirty: true,
      dirtyObjects: new Set(),
      renderCache: new Map(),
      samplingResolution: 2, // Default to half resolution for performance
      isLoading: false,
      loadingProgress: 0,
      
      markDirty: (objectId?: string) => {
        if (objectId) {
          set(state => ({
            isDirty: true,
            dirtyObjects: new Set(state.dirtyObjects).add(objectId)
          }))
        } else {
          set({ isDirty: true, dirtyObjects: new Set() })
        }
      },
      
      clearCache: (objectId?: string) => {
        if (objectId) {
          const { renderCache } = get()
          renderCache.delete(objectId)
          set({ renderCache: new Map(renderCache) })
        } else {
          set({ renderCache: new Map() })
        }
      },
      
      setSamplingResolution: (resolution: number) => {
        const clampedResolution = Math.max(1, Math.min(8, resolution))
        set({ samplingResolution: clampedResolution })
        // Clear cache when resolution changes
        get().clearCache()
        get().markDirty()
      },
      
      updatePixelMapIfNeeded: () => {
        const { isDirty, dirtyObjects } = get()
        if (!isDirty) return
        
        // If we have specific dirty objects and it's less than 5, do incremental update
        if (dirtyObjects.size > 0 && dirtyObjects.size < 5) {
          get().updatePixelMapIncremental(Array.from(dirtyObjects))
        } else {
          // Otherwise do full update
          get().updatePixelMap()
        }
      },
      
      updatePixelMapIncremental: (objectIds: string[]) => {
        const performanceStore = usePerformanceStore.getState()
        
        performanceStore.track('updatePixelMapIncremental', () => {
          const { fabricCanvas } = useCanvasStore.getState()
          if (!fabricCanvas) return
          
          const { pixelToObject, objectBounds, renderOrder, samplingResolution, renderCache } = get()
          const canvasWidth = fabricCanvas.getWidth()
          const canvasHeight = fabricCanvas.getHeight()
          
          console.log(`[ObjectRegistry] Incremental update for ${objectIds.length} objects`)
          
          // First, clear pixels for objects being updated
          objectIds.forEach(objId => {
            const bounds = objectBounds.get(objId)
            if (!bounds) return
            
            // Clear pixels in the affected region
            for (let y = bounds.y; y < bounds.y + bounds.height; y += samplingResolution) {
              for (let x = bounds.x; x < bounds.x + bounds.width; x += samplingResolution) {
                const key = `${x},${y}`
                pixelToObject.delete(key)
              }
            }
          })
          
          // Update bounds and re-render only changed objects
          objectIds.forEach(objId => {
            const obj = fabricCanvas.getObjects().find(o => (o.get('id') as string) === objId)
            if (!obj) return
            
            // Update bounds
            const bounds = obj.getBoundingRect()
            const boundingBox: BoundingBox = {
              x: Math.floor(bounds.left),
              y: Math.floor(bounds.top),
              width: Math.ceil(bounds.width),
              height: Math.ceil(bounds.height)
            }
            objectBounds.set(objId, boundingBox)
            
            // Skip very large objects
            if (boundingBox.width * boundingBox.height > 4096 * 4096) {
              console.warn(`[ObjectRegistry] Skipping large object ${objId}`)
              return
            }
            
            // Get or create render cache
            const objVersion = obj.get('version') || 0
            const cached = renderCache.get(objId)
            
            let imageData: ImageData
            if (cached && cached.version === objVersion && 
                cached.bounds.width === boundingBox.width && 
                cached.bounds.height === boundingBox.height) {
              // Use cached render
              imageData = cached.imageData
            } else {
              // Render object
              const shared = getSharedCanvas(boundingBox.width, boundingBox.height)
              if (!shared) return
              
              shared.ctx.save()
              shared.ctx.translate(-boundingBox.x, -boundingBox.y)
              obj.render(shared.ctx)
              shared.ctx.restore()
              
              imageData = shared.ctx.getImageData(0, 0, boundingBox.width, boundingBox.height)
              
              // Cache the render
              renderCache.set(objId, {
                imageData: imageData,
                bounds: boundingBox,
                version: objVersion
              })
            }
            
            // Map pixels with sampling
            for (let y = 0; y < boundingBox.height; y += samplingResolution) {
              for (let x = 0; x < boundingBox.width; x += samplingResolution) {
                const pixelIndex = (y * boundingBox.width + x) * 4
                const alpha = imageData.data[pixelIndex + 3]
                
                if (alpha > 0) {
                  const globalX = boundingBox.x + x
                  const globalY = boundingBox.y + y
                  
                  if (globalX >= 0 && globalX < canvasWidth && 
                      globalY >= 0 && globalY < canvasHeight) {
                    const key = `${globalX},${globalY}`
                    pixelToObject.set(key, objId)
                  }
                }
              }
            }
          })
          
          // Re-apply other objects that might overlap the updated region
          const updatedBounds = objectIds.map(id => objectBounds.get(id)).filter(b => b) as BoundingBox[]
          const affectedRegion = updatedBounds.reduce((acc, bounds) => ({
            x: Math.min(acc.x, bounds.x),
            y: Math.min(acc.y, bounds.y),
            right: Math.max(acc.right, bounds.x + bounds.width),
            bottom: Math.max(acc.bottom, bounds.y + bounds.height)
          }), {
            x: Infinity,
            y: Infinity,
            right: -Infinity,
            bottom: -Infinity
          })
          
          // Re-render overlapping objects
          renderOrder.forEach(objId => {
            if (objectIds.includes(objId)) return // Skip already updated objects
            
            const bounds = objectBounds.get(objId)
            if (!bounds) return
            
            // Check if this object overlaps the affected region
            if (bounds.x + bounds.width < affectedRegion.x || 
                bounds.x > affectedRegion.right ||
                bounds.y + bounds.height < affectedRegion.y || 
                bounds.y > affectedRegion.bottom) {
              return // No overlap
            }
            
            // Re-apply this object's pixels in the overlap region
            const obj = fabricCanvas.getObjects().find(o => (o.get('id') as string) === objId)
            if (!obj) return
            
            const cached = renderCache.get(objId)
            if (!cached) return
            
            const imageData = cached.imageData
            
            // Only update pixels in the overlap region
            const overlapX = Math.max(0, affectedRegion.x - bounds.x)
            const overlapY = Math.max(0, affectedRegion.y - bounds.y)
            const overlapRight = Math.min(bounds.width, affectedRegion.right - bounds.x)
            const overlapBottom = Math.min(bounds.height, affectedRegion.bottom - bounds.y)
            
            for (let y = overlapY; y < overlapBottom; y += samplingResolution) {
              for (let x = overlapX; x < overlapRight; x += samplingResolution) {
                const pixelIndex = (y * bounds.width + x) * 4
                const alpha = imageData.data[pixelIndex + 3]
                
                if (alpha > 0) {
                  const globalX = bounds.x + x
                  const globalY = bounds.y + y
                  const key = `${globalX},${globalY}`
                  pixelToObject.set(key, objId)
                }
              }
            }
          })
          
          set({ 
            pixelToObject: new Map(pixelToObject),
            objectBounds: new Map(objectBounds),
            renderCache: new Map(renderCache),
            isDirty: false,
            dirtyObjects: new Set()
          })
          
          console.log(`[ObjectRegistry] Incremental update complete`)
        })
      },
      
      updatePixelMap: () => {
        const performanceStore = usePerformanceStore.getState()
        
        performanceStore.track('updatePixelMap', () => {
          const { fabricCanvas } = useCanvasStore.getState()
          if (!fabricCanvas) return
          
          const newPixelMap = new Map<string, string>()
          const newBounds = new Map<string, BoundingBox>()
          const newRenderOrder: string[] = []
          const { samplingResolution, renderCache } = get()
          
          // Get canvas dimensions
          const canvasWidth = fabricCanvas.getWidth()
          const canvasHeight = fabricCanvas.getHeight()
          
          // Process objects in render order (bottom to top)
          const objects = fabricCanvas.getObjects()
          
          console.log(`[ObjectRegistry] Full update for ${objects.length} objects (sampling: 1/${samplingResolution})`)
          
          objects.forEach((obj) => {
            const objId = obj.get('id') as string
            if (!objId) return
            
            newRenderOrder.push(objId)
            
            // Get object bounds
            const bounds = obj.getBoundingRect()
            const boundingBox: BoundingBox = {
              x: Math.floor(bounds.left),
              y: Math.floor(bounds.top),
              width: Math.ceil(bounds.width),
              height: Math.ceil(bounds.height)
            }
            newBounds.set(objId, boundingBox)
            
            // Skip very large objects to avoid memory issues
            if (boundingBox.width * boundingBox.height > 4096 * 4096) {
              console.warn(`[ObjectRegistry] Skipping large object ${objId}: ${boundingBox.width}x${boundingBox.height}`)
              return
            }
            
            // Check cache
            const objVersion = obj.get('version') || 0
            const cached = renderCache.get(objId)
            
            let imageData: ImageData
            if (cached && cached.version === objVersion && 
                cached.bounds.width === boundingBox.width && 
                cached.bounds.height === boundingBox.height) {
              // Use cached render
              imageData = cached.imageData
            } else {
              // Use shared canvas for rendering
              const shared = getSharedCanvas(boundingBox.width, boundingBox.height)
              if (!shared) return
              
              shared.ctx.save()
              shared.ctx.translate(-boundingBox.x, -boundingBox.y)
              obj.render(shared.ctx)
              shared.ctx.restore()
              
              // Get pixel data
              imageData = shared.ctx.getImageData(0, 0, boundingBox.width, boundingBox.height)
              
              // Update cache
              renderCache.set(objId, {
                imageData: imageData,
                bounds: boundingBox,
                version: objVersion
              })
            }
            
            // Map non-transparent pixels to object ID with sampling
            for (let y = 0; y < boundingBox.height; y += samplingResolution) {
              for (let x = 0; x < boundingBox.width; x += samplingResolution) {
                const pixelIndex = (y * boundingBox.width + x) * 4
                const alpha = imageData.data[pixelIndex + 3]
                
                // Only map pixels with some opacity
                if (alpha > 0) {
                  const globalX = boundingBox.x + x
                  const globalY = boundingBox.y + y
                  
                  // Check canvas bounds
                  if (globalX >= 0 && globalX < canvasWidth && 
                      globalY >= 0 && globalY < canvasHeight) {
                    const key = `${globalX},${globalY}`
                    
                    // Objects rendered later override earlier ones
                    newPixelMap.set(key, objId)
                  }
                }
              }
            }
          })
          
          set({
            pixelToObject: newPixelMap,
            objectBounds: newBounds,
            renderOrder: newRenderOrder,
            renderCache: new Map(renderCache), // Keep existing cache
            isDirty: false,
            dirtyObjects: new Set()
          })
          
          console.log(`[ObjectRegistry] Pixel map updated: ${newPixelMap.size} pixels mapped (reduced by ${samplingResolution}x)`)
        })
      },
      
      updatePixelMapProgressive: () => {
        const { fabricCanvas } = useCanvasStore.getState()
        if (!fabricCanvas) return
        
        const objects = fabricCanvas.getObjects()
        if (objects.length === 0) return
        
        console.log(`[ObjectRegistry] Starting progressive update for ${objects.length} objects`)
        set({ isLoading: true, loadingProgress: 0 })
        
        let currentIndex = 0
        const batchSize = 5 // Process 5 objects at a time
        
        const processBatch = () => {
          const endIndex = Math.min(currentIndex + batchSize, objects.length)
          const batch = objects.slice(currentIndex, endIndex)
          
          // Process this batch
          batch.forEach(obj => {
            const objId = obj.get('id') as string
            if (objId) {
              get().updatePixelMapIncremental([objId])
            }
          })
          
          currentIndex = endIndex
          const progress = (currentIndex / objects.length) * 100
          set({ loadingProgress: progress })
          
          if (currentIndex < objects.length) {
            // Schedule next batch
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(processBatch, { timeout: 100 })
            } else {
              setTimeout(processBatch, 16) // Fallback to setTimeout
            }
          } else {
            // Completed
            console.log('[ObjectRegistry] Progressive update complete')
            set({ isLoading: false, loadingProgress: 100, isDirty: false })
          }
        }
        
        // Start processing
        processBatch()
      },
      
      getObjectAtPixel: (x: number, y: number) => {
        const { pixelToObject, samplingResolution } = get()
        const { fabricCanvas } = useCanvasStore.getState()
        
        if (!fabricCanvas) return null
        
        // Round to nearest sampled pixel
        const sampledX = Math.floor(x / samplingResolution) * samplingResolution
        const sampledY = Math.floor(y / samplingResolution) * samplingResolution
        
        // Try exact position first
        let key = `${Math.floor(x)},${Math.floor(y)}`
        let objectId = pixelToObject.get(key)
        
        // If not found, try the sampled position
        if (!objectId) {
          key = `${sampledX},${sampledY}`
          objectId = pixelToObject.get(key)
        }
        
        // If still not found and sampling > 1, check nearby sampled pixels
        if (!objectId && samplingResolution > 1) {
          // Check the 4 nearest sampled pixels
          const nearbyOffsets = [
            [0, 0],
            [samplingResolution, 0],
            [0, samplingResolution],
            [samplingResolution, samplingResolution]
          ]
          
          for (const [dx, dy] of nearbyOffsets) {
            const nearX = sampledX + dx
            const nearY = sampledY + dy
            key = `${nearX},${nearY}`
            objectId = pixelToObject.get(key)
            if (objectId) break
          }
        }
        
        if (!objectId) return null
        
        return fabricCanvas.getObjects().find(obj => 
          (obj.get('id') as string) === objectId
        ) || null
      },
      
      getObjectPixels: (objectId: string) => {
        const { objectBounds } = get()
        const { fabricCanvas } = useCanvasStore.getState()
        
        if (!fabricCanvas) return null
        
        const bounds = objectBounds.get(objectId)
        if (!bounds) return null
        
        const object = fabricCanvas.getObjects().find(obj => 
          (obj.get('id') as string) === objectId
        )
        if (!object) return null
        
        // Create temporary canvas for object
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = bounds.width
        tempCanvas.height = bounds.height
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
        if (!tempCtx) return null
        
        // Render object
        tempCtx.save()
        tempCtx.translate(-bounds.x, -bounds.y)
        object.render(tempCtx)
        tempCtx.restore()
        
        // Return pixel data
        return tempCtx.getImageData(0, 0, bounds.width, bounds.height)
      },
      
      getObjectsAtPixel: (x: number, y: number) => {
        const { renderOrder } = get()
        const { fabricCanvas } = useCanvasStore.getState()
        
        if (!fabricCanvas) return []
        
        const objects: FabricObject[] = []
        
        // Check objects in reverse render order (top to bottom)
        for (let i = renderOrder.length - 1; i >= 0; i--) {
          const objectId = renderOrder[i]
          const obj = fabricCanvas.getObjects().find(o => 
            (o.get('id') as string) === objectId
          )
          
          if (obj && obj.containsPoint({ x, y } as any)) {
            objects.push(obj)
          }
        }
        
        return objects
      },
      
      getObjectZOrder: (objectId: string) => {
        const { renderOrder } = get()
        return renderOrder.indexOf(objectId)
      },
      
      getTopObjectAtPixel: (x: number, y: number, includeTransparent = false) => {
        if (includeTransparent) {
          // Use fabric's built-in hit detection which includes transparent areas
          const { fabricCanvas } = useCanvasStore.getState()
          if (!fabricCanvas) return null
          
          const objects = get().getObjectsAtPixel(x, y)
          return objects[0] || null
        } else {
          // Use pixel map which only includes non-transparent pixels
          return get().getObjectAtPixel(x, y)
        }
      }
    }),
    {
      name: 'object-registry-store'
    }
  )
) 