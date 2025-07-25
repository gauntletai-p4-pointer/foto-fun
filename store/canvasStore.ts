import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Canvas, Point, TPointerEvent, TPointerEventInfo, FabricImage } from 'fabric'
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_LEVELS } from '@/constants'
import { LayerAwareSelectionManager, SelectionRenderer } from '@/lib/editor/selection'
import { ClipboardManager } from '@/lib/editor/clipboard'
import { useObjectRegistryStore } from './objectRegistryStore'
import { useFilterStore, TOGGLE_FILTER_TOOLS } from './filterStore'

interface CanvasStore {
  // Canvas instances
  fabricCanvas: Canvas | null
  
  // Canvas properties
  zoom: number
  isPanning: boolean
  lastPosX: number
  lastPosY: number
  
  // Document properties (actual image/document dimensions)
  width: number
  height: number
  backgroundColor: string
  
  // Viewport properties (visible area dimensions)
  viewportWidth: number
  viewportHeight: number
  
  // Active AI Tool (for UI activation)
  activeAITool: {
    type: string
    tool: any // BaseAITool
    activationType: 'dialog' | 'panel' | 'immediate'
  } | null
  
  // Active Adjustment Tool (for adjustment dialogs)
  activeAdjustmentTool: {
    toolId: string
    toolName: string
    currentValue?: number
    anchorElement?: HTMLElement | null
  } | null
  
  // Review Modal (for image processing results)
  reviewModal: {
    isOpen: boolean
    title: string
    originalImage: string
    processedImage: string
    onApplyInPlace: () => void
    onRejectChange: () => void
    onAcceptBoth: () => void
    maskImage?: string
  } | null
  
  // Actions
  initCanvas: (element: HTMLCanvasElement, width: number, height: number) => Promise<void>
  disposeCanvas: () => void
  setActiveAITool: (tool: { type: string; tool: any; activationType: 'dialog' | 'panel' | 'immediate' } | null) => void
  setActiveAdjustmentTool: (tool: { toolId: string; toolName: string; currentValue?: number; anchorElement?: HTMLElement | null } | null) => void
  setReviewModal: (modal: {
    isOpen: boolean
    title: string
    originalImage: string
    processedImage: string
    onApplyInPlace: () => void
    onRejectChange: () => void
    onAcceptBoth: () => void
    maskImage?: string
  } | null) => void
  
  // Zoom actions
  setZoom: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToActual: () => void
  
  // Pan actions
  startPanning: (e: TPointerEventInfo<MouseEvent>) => void
  pan: (e: TPointerEventInfo<MouseEvent>) => void
  endPanning: () => void
  
  // Canvas actions
  setBackgroundColor: (color: string) => void
  resize: (width: number, height: number) => void
  resizeViewport: (width: number, height: number) => void
  centerContent: () => void
  
  // Selection control
  setObjectSelection: (enabled: boolean) => void
  
  // Selection management
  selectionManager: LayerAwareSelectionManager | null
  selectionRenderer: SelectionRenderer | null
  clipboardManager: ClipboardManager | null
  
  // Initialization state
  isReady: boolean
  initializationError: Error | null
  initializationPromise: Promise<void> | null
  
  // Selection management actions
  initializeSelection: () => void
  cleanupSelection: () => void
  
  // Wait for canvas to be ready
  waitForReady: () => Promise<void>
  
  // Check if canvas has content
  hasContent: () => boolean
  
  // Update filter states based on current canvas
  updateFilterStates: () => void
}

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      fabricCanvas: null,
      zoom: DEFAULT_ZOOM / 100,
      isPanning: false,
      lastPosX: 0,
      lastPosY: 0,
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      viewportWidth: 800,
      viewportHeight: 600,
      selectionManager: null,
      selectionRenderer: null,
      clipboardManager: null,
      isReady: false,
      initializationError: null,
      initializationPromise: null,
      activeAITool: null,
      activeAdjustmentTool: null,
      reviewModal: null,
      
      // Initialize canvas with proper async handling
      initCanvas: async (element, width, height) => {
        // Reset state first
        set({ 
          isReady: false, 
          initializationError: null,
          initializationPromise: null,
          fabricCanvas: null // Clear old canvas reference
        })
        
        // Create and store the initialization promise
        const initPromise = new Promise<void>(async (resolve, reject) => {
          try {
            // Get theme-aware background color
            const isDarkMode = document.documentElement.classList.contains('dark')
            const bgColor = isDarkMode ? '#191817' : '#FAF9F5'
            
            const canvas = new Canvas(element, {
              width,
              height,
              backgroundColor: bgColor,
              preserveObjectStacking: true,
              selection: true,
              renderOnAddRemove: true,
            })
            
            // Set up event handlers
            canvas.on('mouse:wheel', (opt: TPointerEventInfo<WheelEvent>) => {
              const delta = opt.e.deltaY
              let zoom = canvas.getZoom()
              zoom *= 0.999 ** delta
              
              // Clamp zoom
              const minZoom = MIN_ZOOM / 100
              const maxZoom = MAX_ZOOM / 100
              if (zoom > maxZoom) zoom = maxZoom
              if (zoom < minZoom) zoom = minZoom
              
              canvas.zoomToPoint(
                new Point(opt.e.offsetX, opt.e.offsetY),
                zoom
              )
              
              set({ zoom })
              opt.e.preventDefault()
              opt.e.stopPropagation()
            })
            
            // Store canvas in state
            set({ 
              fabricCanvas: canvas, 
              width, 
              height,
              viewportWidth: width,
              viewportHeight: height,
              zoom: DEFAULT_ZOOM / 100,
              backgroundColor: bgColor
            })
            
            // Wait for next frame to ensure canvas is rendered
            await new Promise(resolve => requestAnimationFrame(resolve))
            
            // Initialize selection management
            get().initializeSelection()
            
            // Render canvas
            canvas.renderAll()
            
            // Final verification
            await new Promise(resolve => {
              requestAnimationFrame(() => {
                const finalState = get()
                if (finalState.fabricCanvas && finalState.selectionManager) {
                  try {
                    // Verify canvas is operational
                    finalState.fabricCanvas.getObjects()
                    finalState.fabricCanvas.getContext()
                    set({ isReady: true })
                    resolve(undefined)
                  } catch (error) {
                    reject(new Error('Canvas verification failed: ' + error))
                  }
                } else {
                  reject(new Error('Canvas or selection manager not available'))
                }
              })
            })
            
            resolve()
          } catch (error) {
            const err = error instanceof Error ? error : new Error('Canvas initialization failed')
            set({ initializationError: err, isReady: false })
            reject(err)
          }
        })
        
        // Store the promise so components can wait for it
        set({ initializationPromise: initPromise })
        
        return initPromise
      },
      
      disposeCanvas: () => {
        const { fabricCanvas, cleanupSelection } = get()
        
        // Cleanup selection system first
        cleanupSelection()
        
        // Clear any pending pixel map update
        if ((window as any).pixelMapUpdateTimeout) {
          clearTimeout((window as any).pixelMapUpdateTimeout)
          delete (window as any).pixelMapUpdateTimeout
        }
        
        if (fabricCanvas) {
          fabricCanvas.dispose()
          set({ fabricCanvas: null })
        }
      },
      
      // Zoom actions
      setZoom: (zoom) => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        const clampedZoom = Math.max(MIN_ZOOM / 100, Math.min(MAX_ZOOM / 100, zoom))
        const center = fabricCanvas.getCenter()
        fabricCanvas.zoomToPoint(
          new Point(center.left, center.top),
          clampedZoom
        )
        set({ zoom: clampedZoom })
      },
      
      zoomIn: () => {
        const { zoom, setZoom } = get()
        const currentPercent = zoom * 100
        const nextLevel = ZOOM_LEVELS.find(level => level > currentPercent) || MAX_ZOOM
        setZoom(nextLevel / 100)
      },
      
      zoomOut: () => {
        const { zoom, setZoom } = get()
        const currentPercent = zoom * 100
        const prevLevel = [...ZOOM_LEVELS].reverse().find(level => level < currentPercent) || MIN_ZOOM
        setZoom(prevLevel / 100)
      },
      
      zoomToFit: () => {
        const { fabricCanvas, width, height, viewportWidth, viewportHeight } = get()
        if (!fabricCanvas) return
        
        // Calculate zoom to fit the document within the viewport
        const zoom = Math.min(viewportWidth / width, viewportHeight / height) * 0.9
        
        get().setZoom(zoom)
        get().centerContent()
      },
      
      zoomToActual: () => {
        get().setZoom(1)
        get().centerContent()
      },
      
      // Pan actions
      startPanning: (e) => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        set({ 
          isPanning: true,
          lastPosX: e.e.clientX,
          lastPosY: e.e.clientY
        })
        fabricCanvas.selection = false
        fabricCanvas.setCursor('grab')
      },
      
      pan: (e) => {
        const { fabricCanvas, isPanning, lastPosX, lastPosY } = get()
        if (!fabricCanvas || !isPanning) return
        
        const vpt = fabricCanvas.viewportTransform
        if (!vpt) return
        
        vpt[4] += e.e.clientX - lastPosX
        vpt[5] += e.e.clientY - lastPosY
        
        fabricCanvas.requestRenderAll()
        set({
          lastPosX: e.e.clientX,
          lastPosY: e.e.clientY
        })
      },
      
      endPanning: () => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        set({ isPanning: false })
        fabricCanvas.selection = true
        fabricCanvas.setCursor('default')
      },
      
      // Canvas actions
      setBackgroundColor: (color) => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        fabricCanvas.backgroundColor = color
        fabricCanvas.renderAll()
        set({ backgroundColor: color })
      },
      
      resize: (width, height) => {
        // This updates the document dimensions (actual image/content size)
        // It does NOT change the viewport size
        set({ width, height })
      },
      
      resizeViewport: (width, height) => {
        // This updates the viewport dimensions (visible area)
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        fabricCanvas.setDimensions({ width, height })
        set({ viewportWidth: width, viewportHeight: height })
      },
      
      centerContent: () => {
        const { fabricCanvas, width, height, viewportWidth, viewportHeight } = get()
        if (!fabricCanvas) return
        
        // Calculate the pan offset to center the content
        // We want to move the viewport so that the center of the content
        // appears at the center of the viewport
        const panX = (viewportWidth - width * fabricCanvas.getZoom()) / 2
        const panY = (viewportHeight - height * fabricCanvas.getZoom()) / 2
        
        // Set the viewport transform to center the content
        fabricCanvas.absolutePan(new Point(-panX, -panY))
      },
      
      // Selection control
      setObjectSelection: (enabled) => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        fabricCanvas.selection = enabled
        fabricCanvas.forEachObject((obj) => {
          obj.selectable = enabled
          obj.evented = enabled // This prevents objects from responding to mouse events
        })
        
        // Clear any existing selection when disabling
        if (!enabled) {
          fabricCanvas.discardActiveObject()
        }
        
        fabricCanvas.renderAll()
      },
      
      // Selection management actions
      initializeSelection: () => {
        const state = get()
        
        if (!state.fabricCanvas) {
          console.error('Canvas not initialized')
          return
        }
        
        try {
          const selectionManager = new LayerAwareSelectionManager(state.fabricCanvas)
          const selectionRenderer = new SelectionRenderer(state.fabricCanvas, selectionManager)
          const clipboardManager = new ClipboardManager(state.fabricCanvas, selectionManager)
          
          // Initialize object registry but don't update on every render
          const objectRegistry = useObjectRegistryStore.getState()
          
          // Only update pixel map when objects actually change
          state.fabricCanvas.on('object:added', (e: any) => {
            const obj = e.target
            // Ignore selection overlays and other temporary objects
            if (obj && !obj.excludeFromExport) {
              // Apply current canvas selection state to newly added objects
              if (!state.fabricCanvas!.selection) {
                obj.selectable = false
                obj.evented = false
              }
              
              // Defer update to avoid blocking UI
              requestAnimationFrame(() => {
                objectRegistry.updatePixelMap()
                // Update filter states when objects are added
                get().updateFilterStates()
              })
            }
          })
          
          state.fabricCanvas.on('object:removed', (e: any) => {
            const obj = e.target
            // Ignore selection overlays and other temporary objects
            if (obj && !obj.excludeFromExport) {
              requestAnimationFrame(() => {
                objectRegistry.updatePixelMap()
                // Update filter states when objects are removed
                get().updateFilterStates()
              })
            }
          })
          
          state.fabricCanvas.on('object:modified', (e: any) => {
            // Mark specific object as dirty for incremental update
            const obj = e.target
            if (obj && obj.get('id') && !obj.excludeFromExport) {
              objectRegistry.markDirty(obj.get('id') as string)
              
              // Debounce modifications since they can fire rapidly
              if ((window as any).pixelMapUpdateTimeout) {
                clearTimeout((window as any).pixelMapUpdateTimeout)
              }
              
              (window as any).pixelMapUpdateTimeout = setTimeout(() => {
                objectRegistry.updatePixelMapIfNeeded()
                // Update filter states when objects are modified
                get().updateFilterStates()
              }, 300) // Wait 300ms after last modification
            }
          })
          
          // Also listen for object:moving to mark as dirty but don't update until done
          state.fabricCanvas.on('object:moving', (e: any) => {
            const obj = e.target
            if (obj && obj.get('id') && !obj.excludeFromExport) {
              objectRegistry.markDirty(obj.get('id') as string)
            }
          })
          
          set({ 
            selectionManager, 
            selectionRenderer,
            clipboardManager
          })
        } catch (error) {
          console.error('Failed to initialize selection system:', error)
        }
      },
      
      cleanupSelection: () => {
        const { selectionManager, selectionRenderer } = get()
        
        if (selectionRenderer) {
          selectionRenderer.stopRendering()
        }
        
        if (selectionManager) {
          selectionManager.dispose()
        }
        
        set({ selectionManager: null, selectionRenderer: null, clipboardManager: null, isReady: false })
      },
      
      // Wait for canvas to be ready
      waitForReady: async () => {
        const state = get()
        
        // If already ready and canvas exists, return immediately
        if (state.isReady && state.fabricCanvas) {
          return Promise.resolve()
        }
        
        // If there's an initialization error, reject
        if (state.initializationError) {
          return Promise.reject(state.initializationError)
        }
        
        // If there's an initialization promise, wait for it
        if (state.initializationPromise) {
          try {
            await state.initializationPromise
            // Double-check after promise resolves
            const newState = get()
            if (!newState.fabricCanvas || !newState.isReady) {
              throw new Error('Canvas not available after initialization')
            }
            return
          } catch (error) {
            throw error
          }
        }
        
        // If there's no promise and not ready, wait for ready state with timeout
        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            unsubscribe()
            reject(new Error('Canvas initialization timeout after 10 seconds'))
          }, 10000)
          
          const unsubscribe = useCanvasStore.subscribe((state) => {
            if (state.isReady && state.fabricCanvas) {
              clearTimeout(timeout)
              unsubscribe()
              resolve()
            } else if (state.initializationError) {
              clearTimeout(timeout)
              unsubscribe()
              reject(state.initializationError)
            }
          })
          
          // Check one more time in case it became ready while setting up the subscription
          const currentState = get()
          if (currentState.isReady && currentState.fabricCanvas) {
            clearTimeout(timeout)
            unsubscribe()
            resolve()
          }
        })
      },
      
      // Check if canvas has content
      hasContent: () => {
        const { fabricCanvas } = get()
        return fabricCanvas && fabricCanvas.getObjects().length > 0
      },
      
      // Update filter states based on current canvas
      updateFilterStates: () => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        const filterStore = useFilterStore.getState()
        const filterStates: Record<string, boolean> = {}
        
        // Initialize all toggle filters as false
        TOGGLE_FILTER_TOOLS.forEach(toolId => {
          filterStates[toolId] = false
        })
        
        // Check images for active filters
        const images = fabricCanvas.getObjects().filter(obj => obj instanceof FabricImage) as FabricImage[]
        
        if (images.length > 0) {
          // Check the first image for filters (assuming all images have same filters)
          const firstImage = images[0]
          if (firstImage.filters && firstImage.filters.length > 0) {
            firstImage.filters.forEach((filter: any) => {
              const filterType = filter.type || filter.constructor.name
              
              // Map filter types to tool IDs
              switch (filterType) {
                case 'Grayscale':
                  filterStates['grayscale'] = true
                  break
                case 'Sepia':
                  filterStates['sepia'] = true
                  break
                case 'Invert':
                  filterStates['invert'] = true
                  break
              }
            })
          }
        }
        
        // Update the filter store
        filterStore.updateFromCanvas(filterStates)
      },
      
      // Set active AI tool
      setActiveAITool: (tool) => {
        set({ activeAITool: tool })
      },

      // Set active adjustment tool
      setActiveAdjustmentTool: (tool) => {
        set({ activeAdjustmentTool: tool })
      },

      // Set review modal
      setReviewModal: (modal) => {
        set({ reviewModal: modal })
      }
    }),
    {
      name: 'canvas-store'
    }
  )
) 