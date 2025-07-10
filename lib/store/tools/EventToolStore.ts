import { BaseStore } from '../base/BaseStore'
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { Tool } from '@/lib/editor/canvas/types'
import { ToolActivatedEvent, ToolOptionChangedEvent } from '@/lib/events/canvas/ToolEvents'

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
  options: ToolOption[]
}

interface ToolState {
  tools: Map<string, Tool>
  toolsByCategory: Map<string, Tool[]>
  activeTool: Tool | null
  toolOptions: Map<string, ToolOptionsConfig>
}

export class EventToolStore extends BaseStore<ToolState> {
  private typedEventBus: TypedEventBus
  private _eventStore: EventStore

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    const initialState: ToolState = {
      tools: new Map(),
      toolsByCategory: new Map(),
      activeTool: null,
      toolOptions: new Map()
    }
    
    super(initialState, eventStore)
    this.typedEventBus = typedEventBus
    this._eventStore = eventStore
  }

  protected getEventHandlers() {
    return new Map()
  }

  initialize() {
    // Listen for tool activation events
    this.typedEventBus.on('tool.activated', (data) => {
      const tool = this.getState().tools.get(data.toolId)
      if (tool) {
        this.setState(state => ({
          ...state,
          activeTool: tool
        }))
      }
    })

    // Listen for tool option changes
    this.typedEventBus.on('tool.option.changed', (data) => {
      this.updateOption(data.toolId, data.optionId, data.value)
    })
  }

  // Tool registration
  registerTool(tool: Tool, category: string = 'general') {
    this.setState(state => {
      const newTools = new Map(state.tools)
      newTools.set(tool.id, tool)
      
      const newToolsByCategory = new Map(state.toolsByCategory)
      const categoryTools = newToolsByCategory.get(category) || []
      newToolsByCategory.set(category, [...categoryTools, tool])
      
      return {
        ...state,
        tools: newTools,
        toolsByCategory: newToolsByCategory
      }
    })
  }

  // Tool options registration
  registerToolOptions(config: ToolOptionsConfig) {
    this.setState(state => {
      const newOptions = new Map(state.toolOptions)
      newOptions.set(config.toolId, config)
      return { ...state, toolOptions: newOptions }
    })
  }

  // Tool activation
  async activateTool(toolId: string) {
    const tool = this.getState().tools.get(toolId)
    if (!tool) {
      console.warn(`Tool ${toolId} not found`)
      return
    }

    // Emit tool activation event
    await this._eventStore.append(
      new ToolActivatedEvent(
        toolId,
        tool.name,
        { source: 'user' }
      )
    )

    this.typedEventBus.emit('tool.activated', { toolId, previousToolId: null })
  }

  // Tool option management
  updateOption(toolId: string, optionId: string, value: unknown) {
    this.setState(state => {
      const toolConfig = state.toolOptions.get(toolId)
      if (!toolConfig) return state
      
      const updatedOptions = toolConfig.options.map(opt => 
        opt.id === optionId ? { ...opt, value } : opt
      )
      
      const newOptions = new Map(state.toolOptions)
      newOptions.set(toolId, { ...toolConfig, options: updatedOptions })
      
      return { ...state, toolOptions: newOptions }
    })
  }

  // Getters
  getActiveTool(): Tool | null {
    return this.getState().activeTool
  }

  getTool(toolId: string): Tool | undefined {
    return this.getState().tools.get(toolId)
  }

  getToolsByCategory(category: string): Tool[] {
    return this.getState().toolsByCategory.get(category) || []
  }

  getAllTools(): Tool[] {
    return Array.from(this.getState().tools.values())
  }

  getToolOptions(toolId: string): ToolOption[] | undefined {
    return this.getState().toolOptions.get(toolId)?.options
  }

  getOptionValue<T = unknown>(toolId: string, optionId: string): T | undefined {
    const options = this.getState().toolOptions.get(toolId)?.options
    return options?.find(opt => opt.id === optionId)?.value as T
  }
} 