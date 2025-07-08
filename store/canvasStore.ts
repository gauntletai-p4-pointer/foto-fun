import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Canvas, Point, TPointerEvent, TPointerEventInfo } from 'fabric'
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_LEVELS } from '@/constants'
import { SelectionManager, SelectionRenderer } from '@/lib/editor/selection'

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
  initCanvas: (element: HTMLCanvasElement, width: number, height: number) => void
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
  isReady: boolean
  
  // Selection management actions
  initializeSelection: () => void
  cleanupSelection: () => void
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
      isReady: false,
      
      // Initialize canvas
      initCanvas: (element, width, height) => {
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
        
        set({ 
          fabricCanvas: canvas, 
          width, 
          height,
          zoom: DEFAULT_ZOOM / 100,
          backgroundColor: bgColor
        })
        
        // Initialize selection system after canvas is set
        const state = get()
        state.initializeSelection()
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
        const { fabricCanvas } = get()
        if (!fabricCanvas) return
        
        const selectionManager = new SelectionManager(fabricCanvas)
        const selectionRenderer = new SelectionRenderer(fabricCanvas, selectionManager)
        
        set({ selectionManager, selectionRenderer, isReady: true })
      },
      
      cleanupSelection: () => {
        const { selectionManager, selectionRenderer } = get()
        
        if (selectionRenderer) {
          selectionRenderer.stopRendering()
        }
        
        if (selectionManager) {
          selectionManager.dispose()
        }
        
        set({ selectionManager: null, selectionRenderer: null })
      }
    }),
    {
      name: 'canvas-store'
    }
  )
) 