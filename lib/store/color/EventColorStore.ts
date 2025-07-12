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
  
  canApply(_context: unknown): boolean {
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
 * Secondary color changed event
 */
export class SecondaryColorChangedEvent extends Event {
  constructor(
    public readonly color: string,
    metadata: Event['metadata']
  ) {
    super('SecondaryColorChangedEvent', color, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return null
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed secondary color to: ${this.color}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      color: this.color
    }
  }
}

/**
 * Colors swapped event
 */
export class ColorsSwappedEvent extends Event {
  constructor(
    public readonly primaryColor: string,
    public readonly secondaryColor: string,
    metadata: Event['metadata']
  ) {
    super('ColorsSwappedEvent', `${primaryColor}-${secondaryColor}`, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return new ColorsSwappedEvent(this.secondaryColor, this.primaryColor, this.metadata)
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return 'Swapped primary and secondary colors'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor
    }
  }
}

/**
 * Color added to favorites event
 */
export class ColorAddedToFavoritesEvent extends Event {
  constructor(
    public readonly color: string,
    metadata: Event['metadata']
  ) {
    super('ColorAddedToFavoritesEvent', color, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return new ColorRemovedFromFavoritesEvent(this.color, this.metadata)
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Added ${this.color} to favorites`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      color: this.color
    }
  }
}

/**
 * Color removed from favorites event
 */
export class ColorRemovedFromFavoritesEvent extends Event {
  constructor(
    public readonly color: string,
    metadata: Event['metadata']
  ) {
    super('ColorRemovedFromFavoritesEvent', color, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return new ColorAddedToFavoritesEvent(this.color, this.metadata)
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Removed ${this.color} from favorites`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      color: this.color
    }
  }
}

/**
 * Recent colors cleared event
 */
export class RecentColorsClearedEvent extends Event {
  constructor(
    public readonly previousColors: string[],
    metadata: Event['metadata']
  ) {
    super('RecentColorsClearedEvent', previousColors.join(','), 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return null // Cannot reverse clearing
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return 'Cleared recent colors'
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      previousColors: this.previousColors
    }
  }
}

/**
 * Color mode changed event
 */
export class ColorModeChangedEvent extends Event {
  constructor(
    public readonly mode: 'RGB' | 'HSL' | 'HEX',
    metadata: Event['metadata']
  ) {
    super('ColorModeChangedEvent', mode, 'tool', metadata)
  }
  
  apply(currentState: unknown): unknown {
    return currentState
  }
  
  reverse(): Event | null {
    return null // Cannot reverse mode change without previous mode
  }
  
  canApply(_context: unknown): boolean {
    return true
  }
  
  getDescription(): string {
    return `Changed color mode to ${this.mode}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      mode: this.mode
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
      ['ColorSelectedEvent', this.handleColorSelected.bind(this)],
      ['SecondaryColorChangedEvent', this.handleSecondaryColorChanged.bind(this)],
      ['ColorsSwappedEvent', this.handleColorsSwapped.bind(this)],
      ['ColorAddedToFavoritesEvent', this.handleColorAddedToFavorites.bind(this)],
      ['ColorRemovedFromFavoritesEvent', this.handleColorRemovedFromFavorites.bind(this)],
      ['RecentColorsClearedEvent', this.handleRecentColorsCleared.bind(this)],
      ['ColorModeChangedEvent', this.handleColorModeChanged.bind(this)]
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
  
  private handleSecondaryColorChanged(event: Event): void {
    const e = event as SecondaryColorChangedEvent
    
    this.setState(state => ({
      ...state,
      secondaryColor: e.color
    }))
  }
  
  private handleColorsSwapped(event: Event): void {
    const e = event as ColorsSwappedEvent
    
    this.setState(state => ({
      ...state,
      primaryColor: e.primaryColor,
      secondaryColor: e.secondaryColor
    }))
  }
  
  private handleColorAddedToFavorites(event: Event): void {
    const e = event as ColorAddedToFavoritesEvent
    
    this.setState(state => {
      if (state.favoriteColors.includes(e.color)) return state
      
      return {
        ...state,
        favoriteColors: [...state.favoriteColors, e.color]
      }
    })
  }
  
  private handleColorRemovedFromFavorites(event: Event): void {
    const e = event as ColorRemovedFromFavoritesEvent
    
    this.setState(state => ({
      ...state,
      favoriteColors: state.favoriteColors.filter(c => c !== e.color)
    }))
  }
  
  private handleRecentColorsCleared(event: Event): void {
    this.setState(state => ({
      ...state,
      recentColors: []
    }))
  }
  
  private handleColorModeChanged(event: Event): void {
    const e = event as ColorModeChangedEvent
    
    this.setState(state => ({
      ...state,
      colorMode: e.mode
    }))
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
  async setSecondaryColor(color: string): Promise<void> {
    await this._eventStore.append(new SecondaryColorChangedEvent(
      color,
      { source: 'user' }
    ))
  }
  
  /**
   * Swap primary and secondary colors
   */
  async swapColors(): Promise<void> {
    const state = this.getState()
    await this._eventStore.append(new ColorsSwappedEvent(
      state.secondaryColor,
      state.primaryColor,
      { source: 'user' }
    ))
  }
  
  /**
   * Add color to favorites
   */
  async addToFavorites(color: string): Promise<void> {
    await this._eventStore.append(new ColorAddedToFavoritesEvent(
      color,
      { source: 'user' }
    ))
  }
  
  /**
   * Remove color from favorites
   */
  async removeFromFavorites(color: string): Promise<void> {
    await this._eventStore.append(new ColorRemovedFromFavoritesEvent(
      color,
      { source: 'user' }
    ))
  }
  
  /**
   * Clear recent colors
   */
  async clearRecentColors(): Promise<void> {
    const state = this.getState()
    await this._eventStore.append(new RecentColorsClearedEvent(
      state.recentColors,
      { source: 'user' }
    ))
  }
  
  /**
   * Set color mode
   */
  async setColorMode(mode: ColorStoreState['colorMode']): Promise<void> {
    await this._eventStore.append(new ColorModeChangedEvent(
      mode,
      { source: 'user' }
    ))
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