import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Canvas, Point, TPointerEvent, TPointerEventInfo } from 'fabric'
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_LEVELS } from '@/constants'
import { SelectionManager, SelectionRenderer } from '@/lib/editor/selection'
import { ClipboardManager } from '@/lib/editor/clipboard'

interface CanvasStore {
  // Canvas instances
  fabricCanvas: Canvas | null
  
  // Canvas properties
  zoom: number
  isPanning: boolean
  lastPosX: number
  lastPosY: number
  
  // Document properties
  width: number
  height: number
  backgroundColor: string
  
  // Actions
  initCanvas: (element: HTMLCanvasElement, width: number, height: number) => Promise<void>
  disposeCanvas: () => void
  
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
  centerContent: () => void
  
  // Selection management
  selectionManager: SelectionManager | null
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
      selectionManager: null,
      selectionRenderer: null,
      clipboardManager: null,
      isReady: false,
      initializationError: null,
      initializationPromise: null,
      
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
              zoom: DEFAULT_ZOOM / 100,
              backgroundColor: bgColor
            })
            
            // Wait a frame to ensure state is updated
            await new Promise(resolve => requestAnimationFrame(resolve))
            
            // Initialize selection system
            const state = get()
            if (state.fabricCanvas) {
              const selectionManager = new SelectionManager(state.fabricCanvas)
              const selectionRenderer = new SelectionRenderer(state.fabricCanvas, selectionManager)
              const clipboardManager = new ClipboardManager(state.fabricCanvas, selectionManager)
              
              set({ 
                selectionManager, 
                selectionRenderer, 
                clipboardManager 
              })
              
              // Start rendering if there's already a selection
              if (selectionManager.hasSelection()) {
                selectionRenderer.startRendering()
              }
            }
            
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
        const { fabricCanvas, width, height } = get()
        if (!fabricCanvas) return
        
        const canvasWidth = fabricCanvas.getWidth()
        const canvasHeight = fabricCanvas.getHeight()
        const zoom = Math.min(canvasWidth / width, canvasHeight / height) * 0.9
        
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
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        fabricCanvas.setDimensions({ width, height })
        set({ width, height })
      },
      
      centerContent: () => {
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        const center = fabricCanvas.getCenter()
        fabricCanvas.absolutePan(new Point(center.left, center.top))
      },
      
      // Selection management actions
      initializeSelection: () => {
        // This is now called from within initCanvas
        // Kept for backward compatibility but does nothing
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
      }
    }),
    {
      name: 'canvas-store'
    }
  )
) 