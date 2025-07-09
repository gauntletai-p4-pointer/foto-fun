import { create } from 'zustand'
import { TOOL_IDS } from '@/constants'
import type { Tool } from '@/types'

interface ToolStore {
  // Current tool
  activeTool: string
  previousTool: string | null
  
  // Tool registry
  tools: Map<string, Tool>
  
  // Tool state
  toolOptions: Record<string, any>
  
  // Actions
  setActiveTool: (toolId: string) => void
  registerTool: (tool: Tool) => void
  registerTools: (tools: Tool[]) => void
  updateToolOptions: (toolId: string, options: any) => void
  
  // Tool helpers
  getActiveTool: () => Tool | undefined
  getTool: (toolId: string) => Tool | undefined
}

export const useToolStore = create<ToolStore>((set, get) => ({
  activeTool: TOOL_IDS.MOVE,
  previousTool: null,
  tools: new Map(),
  toolOptions: {},
  
  setActiveTool: (toolId) => {
    const { activeTool, tools } = get()
    const newTool = tools.get(toolId)
    const oldTool = tools.get(activeTool)
    
    if (!newTool || toolId === activeTool) return
    
    const canvasStore = useCanvasStore.getState()
    
    // Deactivate old tool
    if (oldTool?.onDeactivate) {
      if (canvasStore.fabricCanvas) {
        oldTool.onDeactivate(canvasStore.fabricCanvas)
      }
    }
    
    // Control object selection based on tool type
    // Pixel-based selection tools should disable Fabric.js object selection
    const pixelSelectionTools = [
      TOOL_IDS.MARQUEE_RECT,
      TOOL_IDS.MARQUEE_ELLIPSE,
      TOOL_IDS.LASSO,
      TOOL_IDS.MAGIC_WAND,
      TOOL_IDS.QUICK_SELECTION
    ] as const
    
    const shouldDisableObjectSelection = (pixelSelectionTools as readonly string[]).includes(toolId)
    canvasStore.setObjectSelection(!shouldDisableObjectSelection)
    
    // Activate new tool
    if (newTool.onActivate) {
      if (canvasStore.fabricCanvas) {
        newTool.onActivate(canvasStore.fabricCanvas)
      }
    }
    
    set({ 
      activeTool: toolId,
      previousTool: activeTool
    })
  },
  
  registerTool: (tool) => {
    set((state) => {
      const newTools = new Map(state.tools)
      newTools.set(tool.id, tool)
      return { tools: newTools }
    })
  },
  
  registerTools: (tools) => {
    set((state) => {
      const newTools = new Map(state.tools)
      tools.forEach(tool => newTools.set(tool.id, tool))
      return { tools: newTools }
    })
  },
  
  updateToolOptions: (toolId, options) => {
    set((state) => ({
      toolOptions: {
        ...state.toolOptions,
        [toolId]: {
          ...state.toolOptions[toolId],
          ...options
        }
      }
    }))
  },
  
  getActiveTool: () => {
    const { activeTool, tools } = get()
    return tools.get(activeTool)
  },
  
  getTool: (toolId) => {
    return get().tools.get(toolId)
  }
}))

// Import canvas store after export to avoid circular dependency
import { useCanvasStore } from './canvasStore' 