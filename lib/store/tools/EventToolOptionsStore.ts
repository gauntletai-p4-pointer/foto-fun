import { BaseStore } from '../base/BaseStore'
import { EventStore } from '@/lib/events/core/EventStore'
import { Event } from '@/lib/events/core/Event'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

// Tool option types
export type OptionType = 'slider' | 'checkbox' | 'dropdown' | 'number' | 'button-group' | 'color'

export interface ToolOption<T = unknown> {
  id: string
  type: OptionType
  label: string
  value: T
  defaultValue: T
  props?: Record<string, unknown> // Type-specific props (min, max, options, etc.)
}

export interface ToolOptionsConfig {
  toolId: string
  options: ToolOption[]
}

// Tool options store state
export interface ToolOptionsState {
  // Option configurations by tool
  optionConfigs: Map<string, ToolOptionsConfig>
  
  // Current option values by tool
  optionValues: Map<string, Map<string, unknown>>
  
  // Option presets
  presets: Map<string, Array<{
    id: string
    name: string
    values: Record<string, unknown>
  }>>
  
  // UI state
  expandedSections: Set<string>
  pinnedOptions: Set<string> // toolId:optionId format
}

/**
 * Event-driven store for tool options
 * Manages tool option configurations and values
 */
export class EventToolOptionsStore extends BaseStore<ToolOptionsState> {
  private typedEventBus: TypedEventBus
  private typedSubscriptions: Array<() => void> = []
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        optionConfigs: new Map(),
        optionValues: new Map(),
        presets: new Map(),
        expandedSections: new Set(['general']),
        pinnedOptions: new Set()
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
    // Tool option changes
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.option.changed', (data) => {
        this.setState(state => {
          const toolValues = new Map(state.optionValues.get(data.toolId) || [])
          toolValues.set(data.optionKey || data.optionId, data.value)
          
          const newOptionValues = new Map(state.optionValues)
          newOptionValues.set(data.toolId, toolValues)
          
          return {
            ...state,
            optionValues: newOptionValues
          }
        })
      })
    )
    
    // Tool activation - ensure options are initialized
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.activated', (data) => {
        this.setState(state => {
          const config = state.optionConfigs.get(data.toolId)
          if (!config || state.optionValues.has(data.toolId)) {
            return state
          }
          
          // Initialize with default values
          const defaultValues = new Map<string, unknown>()
          config.options.forEach(option => {
            defaultValues.set(option.id, option.defaultValue ?? option.value)
          })
          
          const newOptionValues = new Map(state.optionValues)
          newOptionValues.set(data.toolId, defaultValues)
          
          return {
            ...state,
            optionValues: newOptionValues
          }
        })
      })
    )
    
    // Preset events
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.preset.saved', (data) => {
        this.setState(state => {
          const toolPresets = state.presets.get(data.toolId) || []
          const newPreset = {
            id: `preset-${Date.now()}`,
            name: data.name,
            values: data.values
          }
          
          const newPresets = new Map(state.presets)
          newPresets.set(data.toolId, [...toolPresets, newPreset])
          
          return {
            ...state,
            presets: newPresets
          }
        })
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('tool.preset.applied', (data) => {
        this.setState(state => {
          const preset = state.presets.get(data.toolId)?.find(p => p.id === data.presetId)
          if (!preset) return state
          
          const toolValues = new Map(state.optionValues.get(data.toolId) || [])
          Object.entries(preset.values).forEach(([key, value]) => {
            toolValues.set(key, value)
          })
          
          const newOptionValues = new Map(state.optionValues)
          newOptionValues.set(data.toolId, toolValues)
          
          return {
            ...state,
            optionValues: newOptionValues
          }
        })
      })
    )
  }
  
  /**
   * Register tool options configuration
   */
  registerToolOptions(config: ToolOptionsConfig): void {
    this.setState(state => {
      const newConfigs = new Map(state.optionConfigs)
      newConfigs.set(config.toolId, config)
      
      return {
        ...state,
        optionConfigs: newConfigs
      }
    })
  }
  
  /**
   * Get option value for a tool
   */
  getOptionValue<T = unknown>(toolId: string, optionId: string): T | undefined {
    const state = this.getState()
    const toolValues = state.optionValues.get(toolId)
    if (toolValues?.has(optionId)) {
      return toolValues.get(optionId) as T
    }
    
    // Return default value
    const config = state.optionConfigs.get(toolId)
    const option = config?.options.find(o => o.id === optionId)
    return option?.defaultValue ?? option?.value as T
  }
  
  /**
   * Get all option values for a tool
   */
  getToolOptionValues(toolId: string): Record<string, unknown> {
    const state = this.getState()
    const values: Record<string, unknown> = {}
    
    const config = state.optionConfigs.get(toolId)
    if (!config) return values
    
    config.options.forEach(option => {
      values[option.id] = this.getOptionValue(toolId, option.id)
    })
    
    return values
  }
  
  /**
   * Toggle section expansion
   */
  toggleSection(sectionId: string): void {
    this.setState(state => {
      const newExpanded = new Set(state.expandedSections)
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId)
      } else {
        newExpanded.add(sectionId)
      }
      
      return {
        ...state,
        expandedSections: newExpanded
      }
    })
  }
  
  /**
   * Toggle option pinning
   */
  togglePinOption(toolId: string, optionId: string): void {
    const key = `${toolId}:${optionId}`
    this.setState(state => {
      const newPinned = new Set(state.pinnedOptions)
      if (newPinned.has(key)) {
        newPinned.delete(key)
      } else {
        newPinned.add(key)
      }
      
      return {
        ...state,
        pinnedOptions: newPinned
      }
    })
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
let eventToolOptionsStore: EventToolOptionsStore | null = null

export function getEventToolOptionsStore(eventStore: EventStore, typedEventBus: TypedEventBus): EventToolOptionsStore {
  if (!eventToolOptionsStore) {
    eventToolOptionsStore = new EventToolOptionsStore(eventStore, typedEventBus)
  }
  return eventToolOptionsStore
}

// React hook
import { useStore } from '../base/BaseStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

export function useEventToolOptionsStore(): ToolOptionsState {
  const eventStore = EventStore.getInstance()
  const typedEventBus = getTypedEventBus()
  const store = getEventToolOptionsStore(eventStore, typedEventBus)
  return useStore(store)
} 