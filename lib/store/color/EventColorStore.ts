import { BaseStore } from '../base/BaseStore'
import { Event } from '@/lib/events/core/Event'
import { EventStore } from '@/lib/events/core/EventStore'

/**
 * Color selected event
 */
export class ColorSelectedEvent extends Event {
  constructor(
    public readonly color: string,
    public readonly source: 'picker' | 'palette' | 'eyedropper',
    metadata: Event['metadata']
  ) {
    super('ColorSelectedEvent', color, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    // Color selection is not reversible
    return null
  }
  
  canApply(_: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Selected color: ${this.color}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      color: this.color,
      source: this.source
    }
  }
}

/**
 * Color store state
 */
export interface ColorStoreState {
  // Current colors
  primaryColor: string
  secondaryColor: string
  
  // Recent colors
  recentColors: string[]
  maxRecentColors: number
  
  // Favorite colors
  favoriteColors: string[]
  
  // Color mode
  colorMode: 'RGB' | 'HSL' | 'HEX'
}

/**
 * Event-driven color store
 */
export class EventColorStore extends BaseStore<ColorStoreState> {
  private _eventStore: EventStore
  
  constructor(eventStore: EventStore) {
    super(
      {
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        recentColors: [],
        maxRecentColors: 12,
        favoriteColors: [],
        colorMode: 'HEX'
      },
      eventStore
    )
    this._eventStore = eventStore
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    return new Map([
      ['ColorSelectedEvent', this.handleColorSelected.bind(this)]
    ])
  }
  
  private handleColorSelected(event: Event): void {
    const e = event as ColorSelectedEvent
    
    this.setState(state => {
      // Add to recent colors
      const recentColors = this.addToRecentColors(state.recentColors, e.color, state.maxRecentColors)
      
      return {
        ...state,
        primaryColor: e.color,
        recentColors
      }
    })
  }
  
  private addToRecentColors(colors: string[], newColor: string, maxColors: number): string[] {
    // Don't add if it's already the most recent
    if (colors[0] === newColor) return colors
    
    // Remove the color if it already exists
    const filtered = colors.filter(c => c !== newColor)
    
    // Add to the beginning and limit the array size
    return [newColor, ...filtered].slice(0, maxColors)
  }
  
  // Public methods
  
  /**
   * Set primary color
   */
  async setPrimaryColor(color: string, source: ColorSelectedEvent['source'] = 'picker'): Promise<void> {
    await this._eventStore.append(new ColorSelectedEvent(
      color,
      source,
      { source: 'user' }
    ))
  }
  
  /**
   * Set secondary color
   */
  setSecondaryColor(color: string): void {
    this.setState(state => ({
      ...state,
      secondaryColor: color
    }))
  }
  
  /**
   * Swap primary and secondary colors
   */
  swapColors(): void {
    this.setState(state => ({
      ...state,
      primaryColor: state.secondaryColor,
      secondaryColor: state.primaryColor
    }))
  }
  
  /**
   * Add color to favorites
   */
  addToFavorites(color: string): void {
    this.setState(state => {
      if (state.favoriteColors.includes(color)) return state
      
      return {
        ...state,
        favoriteColors: [...state.favoriteColors, color]
      }
    })
  }
  
  /**
   * Remove color from favorites
   */
  removeFromFavorites(color: string): void {
    this.setState(state => ({
      ...state,
      favoriteColors: state.favoriteColors.filter(c => c !== color)
    }))
  }
  
  /**
   * Clear recent colors
   */
  clearRecentColors(): void {
    this.setState(state => ({
      ...state,
      recentColors: []
    }))
  }
  
  /**
   * Set color mode
   */
  setColorMode(mode: ColorStoreState['colorMode']): void {
    this.setState(state => ({
      ...state,
      colorMode: mode
    }))
  }
  
  // Getters
  
  getPrimaryColor(): string {
    return this.getState().primaryColor
  }
  
  getSecondaryColor(): string {
    return this.getState().secondaryColor
  }
  
  getRecentColors(): string[] {
    return this.getState().recentColors
  }
  
  getFavoriteColors(): string[] {
    return this.getState().favoriteColors
  }
  
  getColorMode(): ColorStoreState['colorMode'] {
    return this.getState().colorMode
  }
} 