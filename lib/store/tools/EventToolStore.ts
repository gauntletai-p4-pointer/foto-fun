import { BaseStore } from '../base/BaseStore'
import { EventStore } from '@/lib/events/core/EventStore'
import { Event } from '@/lib/events/core/Event'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { Tool } from '@/lib/editor/canvas/types'

// Re-export types that components expect
export type OptionType = 'slider' | 'checkbox' | 'dropdown' | 'number' | 'button-group' | 'color'

export interface ToolOption<T = unknown> {
  id: string
  type: OptionType
  label: string
  value: T
  props?: Record<string, unknown> // Type-specific props (min, max, options, etc.)
}

export interface ToolOptionsConfig {
  toolId: string
  options: ToolOption<string | number | boolean>[]
}

// Tool state
export interface ToolState {
  // Tool registry
  tools: Map<string, Tool>
  toolsByCategory: Map<string, Tool[]>
  
  // Active tool
  activeTool: Tool | null
  previousTool: Tool | null
  
  // Tool options
  toolOptions: Map<string, Record<string, string | number | boolean>>
  defaultOptions: Map<string, Record<string, string | number | boolean>>
  toolOptionsConfigs: Map<string, ToolOptionsConfig> // Store full configurations
  
  // Tool state
  isToolLocked: boolean
  toolHistory: string[] // Recent tool IDs
}

/**
 * Event-driven tool store
 * Manages tool selection, options, and state
 */
export class EventToolStore extends BaseStore<ToolState> {
  private typedEventBus: TypedEventBus
  private typedSubscriptions: Array<() => void> = []

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        tools: new Map(),
        toolsByCategory: new Map(),
        activeTool: null,
        previousTool: null,
        toolOptions: new Map(),
        defaultOptions: new Map(),
        toolOptionsConfigs: new Map(),
        isToolLocked: false,
        toolHistory: []
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
    this.initializeTypedSubscriptions()
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We use TypedEventBus for most events
    return new Map()
  }
  
  /**
   * Initialize subscriptions to typed events
   */
  private initializeTypedSubscriptions(): void {
    // Tool activation
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.activated', (data) => {
        this.setState(state => {
          const tool = state.tools.get(data.toolId)
          if (!tool) return state
          
          // Update tool history
          const history = [
            data.toolId,
            ...state.toolHistory.filter(id => id !== data.toolId)
          ].slice(0, 10)
          
          return {
            ...state,
            activeTool: tool,
            previousTool: state.activeTool,
            toolHistory: history
          }
        })
      })
    )
    
    // Tool deactivation
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.deactivated', (data) => {
        this.setState(state => {
          if (state.activeTool?.id !== data.toolId) return state
          
          return {
            ...state,
            activeTool: null,
            previousTool: state.activeTool
          }
        })
      })
    )
    
    // Tool option changes
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.option.changed', (data) => {
        this.setState(state => {
          const options = state.toolOptions.get(data.toolId) || {}
          const newOptions = {
            ...options,
            [data.optionKey]: data.value
          }
          
          const newToolOptions = new Map(state.toolOptions)
          newToolOptions.set(data.toolId, newOptions)
          
          // Update the configuration value as well
          const config = state.toolOptionsConfigs.get(data.toolId)
          if (config) {
            const updatedConfig = {
              ...config,
              options: config.options.map(opt => 
                opt.id === data.optionKey 
                  ? { ...opt, value: data.value as string | number | boolean }
                  : opt
              )
            }
            const newConfigs = new Map(state.toolOptionsConfigs)
            newConfigs.set(data.toolId, updatedConfig)
            
            return {
              ...state,
              toolOptions: newToolOptions,
              toolOptionsConfigs: newConfigs
            }
          }
          
          return {
            ...state,
            toolOptions: newToolOptions
          }
        })
      })
    )
    
    // Tool lock/unlock
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.locked', () => {
        this.setState(state => ({
          ...state,
          isToolLocked: true
        }))
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.unlocked', () => {
        this.setState(state => ({
          ...state,
          isToolLocked: false
        }))
      })
    )
  }
  
  /**
   * Register a tool
   */
  registerTool(tool: Tool, category: string = 'general'): void {
    this.setState(state => {
      const newTools = new Map(state.tools)
      newTools.set(tool.id, tool)
      
      const newToolsByCategory = new Map(state.toolsByCategory)
      const categoryTools = newToolsByCategory.get(category) ?? []
      if (!categoryTools.find(t => t.id === tool.id)) {
        newToolsByCategory.set(category, [...categoryTools, tool])
      }
      
      return {
        ...state,
        tools: newTools,
        toolsByCategory: newToolsByCategory
      }
    })
  }
  
  /**
   * Register tool options configuration
   */
  registerToolOptions(config: ToolOptionsConfig): void {
    // Store the options configuration
    const options: Record<string, string | number | boolean> = {}
    config.options.forEach(opt => {
      options[opt.id] = opt.value
    })
    
    this.setState(state => {
      const newToolOptions = new Map(state.toolOptions)
      newToolOptions.set(config.toolId, options)
      
      const newDefaultOptions = new Map(state.defaultOptions)
      if (!newDefaultOptions.has(config.toolId)) {
        newDefaultOptions.set(config.toolId, options)
      }
      
      const newConfigs = new Map(state.toolOptionsConfigs)
      newConfigs.set(config.toolId, config)
      
      return {
        ...state,
        toolOptions: newToolOptions,
        defaultOptions: newDefaultOptions,
        toolOptionsConfigs: newConfigs
      }
    })
  }
  
  /**
   * Set default options for a tool
   */
  setDefaultOptions(toolId: string, options: Record<string, string | number | boolean>): void {
    this.setState(state => {
      const newDefaults = new Map(state.defaultOptions)
      newDefaults.set(toolId, options)
      
      // Also set as current options if not already set
      const newOptions = new Map(state.toolOptions)
      if (!newOptions.has(toolId)) {
        newOptions.set(toolId, options)
      }
      
      return {
        ...state,
        defaultOptions: newDefaults,
        toolOptions: newOptions
      }
    })
  }
  
  /**
   * Get tool options with defaults
   */
  getToolOptions(toolId: string): Record<string, string | number | boolean> {
    const state = this.getState()
    return state.toolOptions.get(toolId) || state.defaultOptions.get(toolId) || {}
  }
  
  /**
   * Get tool options configuration
   */
  getToolOptionsConfig(toolId: string): ToolOption[] {
    const state = this.getState()
    const config = state.toolOptionsConfigs.get(toolId)
    if (!config) return []
    
    // Return options with current values
    const currentValues = this.getToolOptions(toolId)
    return config.options.map(opt => ({
      ...opt,
      value: currentValues[opt.id] ?? opt.value
    }))
  }
  
  /**
   * Activate a tool
   */
  async activateTool(toolId: string): Promise<void> {
    const tool = this.getState().tools.get(toolId)
    if (!tool) {
      console.warn(`Tool ${toolId} not found`)
      return
    }
    
    // Emit tool activation event
    this.typedEventBus.emit('tool.activated', { 
      toolId, 
      previousToolId: this.getState().activeTool?.id || null 
    })
  }
  
  /**
   * Deactivate current tool (switches to move tool)
   */
  async deactivateTool(): Promise<void> {
    const moveToolId = 'move'
    const moveTool = this.getState().tools.get(moveToolId)
    if (moveTool) {
      await this.activateTool(moveToolId)
    }
  }
  
  /**
   * Update a tool option
   */
  updateOption(toolId: string, optionId: string, value: unknown): void {
    const currentOptions = this.getState().toolOptions.get(toolId) || {}
    const previousValue = currentOptions[optionId]
    
    this.typedEventBus.emit('tool.option.changed', {
      toolId,
      optionId,
      optionKey: optionId,
      value,
      previousValue
    })
  }
  
  /**
   * Get active tool
   */
  getActiveTool(): Tool | null {
    return this.getState().activeTool
  }
  
  /**
   * Get a specific tool
   */
  getTool(toolId: string): Tool | undefined {
    return this.getState().tools.get(toolId)
  }
  
  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): Tool[] {
    return this.getState().toolsByCategory.get(category) || []
  }
  
  /**
   * Get all tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.getState().tools.values())
  }
  
  /**
   * Clean up subscriptions
   */
  dispose(): void {
    // Unsubscribe from typed events
    this.typedSubscriptions.forEach(unsubscribe => unsubscribe())
    this.typedSubscriptions = []
    
    // Call parent dispose
    super.dispose()
  }
}

// Export singleton instance and hook
let eventToolStore: EventToolStore | null = null

export function getEventToolStore(eventStore: EventStore, typedEventBus: TypedEventBus): EventToolStore {
  if (!eventToolStore) {
    eventToolStore = new EventToolStore(eventStore, typedEventBus)
  }
  return eventToolStore
}

// React hook
import { useStore } from '../base/BaseStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

export function useEventToolStore(): ToolState {
  const eventStore = EventStore.getInstance()
  const typedEventBus = getTypedEventBus()
  const store = getEventToolStore(eventStore, typedEventBus)
  return useStore(store)
} 