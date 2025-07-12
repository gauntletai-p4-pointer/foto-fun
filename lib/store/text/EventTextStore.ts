import { BaseStore } from '../base/BaseStore'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

export interface TextStoreState {
  // Active text state
  activeTextId: string | null
  isEditing: boolean
  
  // Default text style
  defaultStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: 'normal' | 'bold'
    fontStyle: 'normal' | 'italic'
    textAlign: 'left' | 'center' | 'right' | 'justify'
    color: string
    backgroundColor: string | null
    
    // Character panel
    letterSpacing: number
    lineHeight: number
    
    // Paragraph panel
    paragraphSpacing: number
    firstLineIndent: number
    leftIndent: number
    rightIndent: number
  }
  
  // Text effects
  effects: {
    dropShadow: {
      enabled: boolean
      color: string
      offsetX: number
      offsetY: number
      blur: number
      opacity: number
    }
    glow: {
      enabled: boolean
      color: string
      size: number
      opacity: number
    }
    gradient: {
      enabled: boolean
      type: 'linear' | 'radial'
      colors: Array<{ color: string; position: number }>
      angle: number
    }
  }
  
  // Font management
  availableFonts: Array<{
    family: string
    variants: string[]
    category: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting'
    isSystemFont: boolean
    isWebFont: boolean
  }>
  loadingFonts: Set<string>
  
  // Recent fonts
  recentFonts: string[]
  
  // Text presets
  presets: Array<{
    id: string
    name: string
    style: Partial<TextStoreState['defaultStyle']>
    effects?: Partial<TextStoreState['effects']>
  }>
}

export interface TextStoreConfig {
  persistence?: boolean
  validation?: boolean
  maxRecentFonts?: number
}

/**
 * Event-driven text store
 * Manages text styling, fonts, effects, and presets
 * 
 * Now uses dependency injection instead of singleton pattern.
 */
export class EventTextStore extends BaseStore<TextStoreState> {
  private typedEventBus: TypedEventBus
  private config: TextStoreConfig
  private typedSubscriptions: Array<() => void> = []
  private storeDisposed = false

  constructor(eventStore: EventStore, typedEventBus: TypedEventBus, config: TextStoreConfig = {}) {
    super(
      {
        activeTextId: null,
        isEditing: false,
        defaultStyle: {
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#000000',
          backgroundColor: null,
          letterSpacing: 0,
          lineHeight: 1.2,
          paragraphSpacing: 0,
          firstLineIndent: 0,
          leftIndent: 0,
          rightIndent: 0
        },
        effects: {
          dropShadow: {
            enabled: false,
            color: '#000000',
            offsetX: 2,
            offsetY: 2,
            blur: 4,
            opacity: 0.5
          },
          glow: {
            enabled: false,
            color: '#ffffff',
            size: 5,
            opacity: 0.8
          },
          gradient: {
            enabled: false,
            type: 'linear',
            colors: [
              { color: '#000000', position: 0 },
              { color: '#ffffff', position: 1 }
            ],
            angle: 0
          }
        },
        availableFonts: [],
        loadingFonts: new Set(),
        recentFonts: [],
        presets: []
      },
      eventStore
    )
    
    this.typedEventBus = typedEventBus
    this.config = {
      persistence: true,
      validation: true,
      maxRecentFonts: 10,
      ...config
    }
    
    this.initializeTypedSubscriptions()
    this.loadRecentFonts()
    this.loadPresets()
  }
  
  /**
   * Dispose of the store and clean up resources
   */
  dispose(): void {
    if (this.storeDisposed) return
    
    this.storeDisposed = true
    
    // Unsubscribe from typed events
    this.typedSubscriptions.forEach(unsubscribe => unsubscribe())
    this.typedSubscriptions = []
    
    // Call parent dispose
    super.dispose()
    
    console.log('[TextStore] Disposed')
  }
  
  /**
   * Check if the store is disposed
   */
  isDisposed(): boolean {
    return this.storeDisposed
  }

  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // For now, return empty map as we're using TypedEventBus for UI events
    // Event sourcing events would be handled here if needed
    return new Map()
  }

  private initializeTypedSubscriptions(): void {
    if (this.storeDisposed) return
    
    // Subscribe to text events
    this.typedSubscriptions.push(
      this.typedEventBus.on('text.created', (data) => {
        this.setState(state => ({
          ...state,
          activeTextId: data.textId
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.selected', (data) => {
        this.setState(state => ({
          ...state,
          activeTextId: data.textId,
          isEditing: false
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.deselected', () => {
        this.setState(state => ({
          ...state,
          activeTextId: null,
          isEditing: false
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.editing.started', (data) => {
        this.setState(state => ({
          ...state,
          activeTextId: data.textId,
          isEditing: true
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.editing.ended', () => {
        this.setState(state => ({
          ...state,
          isEditing: false
        }))
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.style.changed', (data) => {
        if (data.setAsDefault) {
          this.setState(state => ({
            ...state,
            defaultStyle: { ...state.defaultStyle, ...data.style }
          }))
        }
      })
    )

    this.typedSubscriptions.push(
      this.typedEventBus.on('text.font.used', (data) => {
        this.addToRecentFonts(data.fontFamily)
      })
    )
  }

  private loadRecentFonts(): void {
    if (this.config.persistence) {
      const stored = localStorage.getItem('recentFonts')
      if (stored) {
        try {
          const recentFonts = JSON.parse(stored)
          this.setState(state => ({ ...state, recentFonts }))
        } catch (error) {
          console.error('[TextStore] Failed to load recent fonts:', error)
        }
      }
    }
  }

  private loadPresets(): void {
    if (this.config.persistence) {
      const stored = localStorage.getItem('textPresets')
      if (stored) {
        try {
          const presets = JSON.parse(stored)
          this.setState(state => ({ ...state, presets }))
        } catch (error) {
          console.error('[TextStore] Failed to load text presets:', error)
        }
      }
    }
  }

  // Public methods
  updateDefaultStyle(updates: Partial<TextStoreState['defaultStyle']>): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({
      ...state,
      defaultStyle: { ...state.defaultStyle, ...updates }
    }))

    this.typedEventBus.emit('text.style.changed', {
      style: updates,
      setAsDefault: true
    })
  }

  updateEffects(updates: Partial<TextStoreState['effects']>): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({
      ...state,
      effects: { ...state.effects, ...updates }
    }))

    const { activeTextId } = this.getState()
    if (activeTextId) {
      this.typedEventBus.emit('text.effects.applied', {
        textId: activeTextId,
        effects: updates
      })
    }
  }

  setActiveText(textId: string | null): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({
      ...state,
      activeTextId: textId,
      isEditing: false
    }))

    if (textId) {
      this.typedEventBus.emit('text.selected', { textId })
    } else {
      this.typedEventBus.emit('text.deselected', { textId: '' })
    }
  }

  startEditing(textId: string): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({
      ...state,
      activeTextId: textId,
      isEditing: true
    }))

    this.typedEventBus.emit('text.editing.started', { textId })
  }

  endEditing(): void {
    if (this.storeDisposed) return
    
    const { activeTextId } = this.getState()
    
    this.setState(state => ({
      ...state,
      isEditing: false
    }))

    this.typedEventBus.emit('text.editing.ended', {
      textId: activeTextId || '',
      finalText: '' // Would get actual text from editor
    })
  }

  addToRecentFonts(fontFamily: string): void {
    if (this.storeDisposed) return
    
    const { recentFonts } = this.getState()
    const maxRecent = this.config.maxRecentFonts || 10
    
    const updated = [
      fontFamily,
      ...recentFonts.filter(font => font !== fontFamily)
    ].slice(0, maxRecent)

    this.setState(state => ({ ...state, recentFonts: updated }))

    if (this.config.persistence) {
      localStorage.setItem('recentFonts', JSON.stringify(updated))
    }
  }

  savePreset(name: string, style: Partial<TextStoreState['defaultStyle']>, effects?: Partial<TextStoreState['effects']>): void {
    if (this.storeDisposed) return
    
    const preset = {
      id: `preset-${Date.now()}`,
      name,
      style,
      effects
    }

    this.setState(state => ({
      ...state,
      presets: [...state.presets, preset]
    }))

    if (this.config.persistence) {
      const { presets } = this.getState()
      localStorage.setItem('textPresets', JSON.stringify(presets))
    }

    this.typedEventBus.emit('text.preset.saved', { name, style, effects })
  }

  applyPreset(presetId: string): void {
    if (this.storeDisposed) return
    
    const { presets } = this.getState()
    const preset = presets.find(p => p.id === presetId)
    
    if (preset) {
      if (preset.style) {
        this.updateDefaultStyle(preset.style)
      }
      if (preset.effects) {
        this.updateEffects(preset.effects)
      }
    }
  }

  setAvailableFonts(fonts: TextStoreState['availableFonts']): void {
    if (this.storeDisposed) return
    
    this.setState(state => ({ ...state, availableFonts: fonts }))
  }

  setLoadingFont(fontFamily: string, loading: boolean): void {
    if (this.storeDisposed) return
    
    this.setState(state => {
      const loadingFonts = new Set(state.loadingFonts)
      if (loading) {
        loadingFonts.add(fontFamily)
      } else {
        loadingFonts.delete(fontFamily)
      }
      return { ...state, loadingFonts }
    })
  }
} 