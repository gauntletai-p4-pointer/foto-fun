import { BaseStore } from '../base/BaseStore'
import { EventStore } from '@/lib/events/core/EventStore'
import { Event } from '@/lib/events/core/Event'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { TextEffects } from '@/lib/editor/text/effects'

// Text store state
export interface TextStoreState {
  // Active text objects
  activeTextId: string | null
  editingTextId: string | null
  
  // Text style defaults
  defaultStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: string
    fontStyle: string
    color: string
    alignment: string
    lineHeight: number
    letterSpacing: number
  }
  
  // Text effects
  activeEffects: TextEffects | null
  
  // Recently used fonts
  recentFonts: string[]
  
  // Text presets
  presets: Array<{
    id: string
    name: string
    style: Record<string, string | number | boolean>
    effects?: TextEffects
  }>
}

/**
 * Event-driven store for text-related state
 * Manages text selection, editing, and effects
 */
export class EventTextStore extends BaseStore<TextStoreState> {
  private typedEventBus: TypedEventBus
  private typedSubscriptions: Array<() => void> = []
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super(
      {
        activeTextId: null,
        editingTextId: null,
        defaultStyle: {
          fontFamily: 'Arial',
          fontSize: 60,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#000000',
          alignment: 'left',
          lineHeight: 1.2,
          letterSpacing: 0
        },
        activeEffects: null,
        recentFonts: ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana'],
        presets: [
          {
            id: 'heading',
            name: 'Heading',
            style: {
              fontSize: 72,
              fontWeight: 'bold',
              letterSpacing: -2
            }
          },
          {
            id: 'body',
            name: 'Body Text',
            style: {
              fontSize: 16,
              lineHeight: 1.5
            }
          }
        ]
      },
      eventStore
    )
    this.typedEventBus = typedEventBus
    this.initializeTypedSubscriptions()
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We use TypedEventBus for most events, but can still handle Event-based events
    return new Map()
  }
  
  /**
   * Initialize subscriptions to typed events
   */
  private initializeTypedSubscriptions(): void {
    // Text creation
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.created', (data) => {
        this.setState(state => ({
          ...state,
          activeTextId: data.textId
        }))
      })
    )
    
    // Text selection
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.selected', (data) => {
        this.setState(state => ({
          ...state,
          activeTextId: data.textId
        }))
      })
    )
    
    // Text deselection
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.deselected', () => {
        this.setState(state => ({
          ...state,
          activeTextId: null,
          activeEffects: null
        }))
      })
    )
    
    // Text editing
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.editing.started', (data) => {
        this.setState(state => ({
          ...state,
          editingTextId: data.textId
        }))
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.editing.ended', () => {
        this.setState(state => ({
          ...state,
          editingTextId: null
        }))
      })
    )
    
    // Text style changes
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.style.changed', (data) => {
        if (data.setAsDefault) {
          this.setState(state => ({
            ...state,
            defaultStyle: {
              ...state.defaultStyle,
              ...data.style
            }
          }))
        }
      })
    )
    
    // Text effects
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.effects.applied', (data) => {
        this.setState(state => ({
          ...state,
          activeEffects: data.effects
        }))
      })
    )
    
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.effects.removed', () => {
        this.setState(state => ({
          ...state,
          activeEffects: null
        }))
      })
    )
    
    // Font usage tracking
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.font.used', (data) => {
        this.setState(state => {
          // Move font to front of recent fonts
          const recentFonts = [
            data.fontFamily,
            ...state.recentFonts.filter(f => f !== data.fontFamily)
          ].slice(0, 10) // Keep only 10 recent fonts
          
          return {
            ...state,
            recentFonts
          }
        })
      })
    )
    
    // Preset management
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.preset.saved', (data) => {
        this.setState(state => ({
          ...state,
          presets: [
            ...state.presets,
            {
              id: `preset-${Date.now()}`,
              name: data.name,
              style: data.style,
              effects: data.effects
            }
          ]
        }))
      })
    )
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
  
  // Helper methods
  getActiveTextStyle(): Record<string, string | number> {
    return this.getState().defaultStyle
  }
  
  getPresets(): TextStoreState['presets'] {
    return this.getState().presets
  }
  
  isEditing(textId: string): boolean {
    return this.getState().editingTextId === textId
  }
}

// Export singleton instance and hook
let eventTextStore: EventTextStore | null = null

export function getEventTextStore(eventStore: EventStore, typedEventBus: TypedEventBus): EventTextStore {
  if (!eventTextStore) {
    eventTextStore = new EventTextStore(eventStore, typedEventBus)
  }
  return eventTextStore
}

// React hook
import { useStore } from '../base/BaseStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

export function useEventTextStore(): TextStoreState {
  const eventStore = EventStore.getInstance()
  const typedEventBus = getTypedEventBus()
  const store = getEventTextStore(eventStore, typedEventBus)
  return useStore(store)
} 