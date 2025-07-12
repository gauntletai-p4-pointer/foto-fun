import { BaseTool, ToolState } from './BaseTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';

/**
 * Navigation operation data structure
 */
export interface NavigationData {
  startPosition: { x: number; y: number };
  currentPosition?: { x: number; y: number };
  modifiers: {
    constrain: boolean;
    fast: boolean;
    precise: boolean;
  };
  navigationType: 'pan' | 'zoom' | 'sample';
  navigationParams?: Record<string, any>;
}

/**
 * Base class for all navigation tools
 * Handles common navigation operations and state management
 */
export abstract class NavigationTool extends BaseTool {
  protected currentNavigation: NavigationData | null = null;
  protected navigationStartTime: number = 0;

  /**
   * Get the navigation operation name for this tool
   */
  protected abstract getNavigationOperation(): string;

  /**
   * Calculate navigation data from tool event
   */
  protected abstract calculateNavigation(event: ToolEvent): Partial<NavigationData>;

  /**
   * Get additional navigation parameters specific to this tool
   */
  protected getNavigationParams(event: ToolEvent): Record<string, any> {
    return {};
  }

  /**
   * Get keyboard modifiers for navigation
   */
  protected getNavigationModifiers(event: ToolEvent): NavigationData['modifiers'] {
    return {
      constrain: event.shiftKey || false,
      fast: event.ctrlKey || false,
      precise: event.altKey || false
    };
  }

  /**
   * Handle mouse down - start navigation
   */
  protected handleMouseDown(event: ToolEvent): void {
    if (this.getState() !== ToolState.ACTIVE) return;

    try {
      this.setState(ToolState.WORKING);
      this.navigationStartTime = Date.now();

      // Create navigation data
      const navigationData: NavigationData = {
        startPosition: { x: event.canvasX, y: event.canvasY },
        modifiers: this.getNavigationModifiers(event),
        navigationType: this.getNavigationOperation() as NavigationData['navigationType'],
        navigationParams: this.getNavigationParams(event),
        ...this.calculateNavigation(event)
      };

      this.currentNavigation = navigationData;

      // Emit navigation start operation
      this.emitOperation(`${this.getNavigationOperation()}.start`, navigationData);

    } catch (error) {
      this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: error as Error,
        operation: 'mouseDown',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse move - update navigation
   */
  protected handleMouseMove(event: ToolEvent): void {
    if (this.getState() !== ToolState.WORKING || !this.currentNavigation) return;

    try {
      // Update navigation data
      const updatedNavigation = {
        ...this.currentNavigation,
        currentPosition: { x: event.canvasX, y: event.canvasY },
        modifiers: this.getNavigationModifiers(event),
        ...this.calculateNavigation(event)
      };

      this.currentNavigation = updatedNavigation;

      // Emit navigation update operation
      this.emitOperation(`${this.getNavigationOperation()}.update`, updatedNavigation);

    } catch (error) {
      this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: error as Error,
        operation: 'mouseMove',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse up - complete navigation
   */
  protected handleMouseUp(event: ToolEvent): void {
    if (this.getState() === ToolState.WORKING && this.currentNavigation) {
      try {
        this.setState(ToolState.ACTIVE);

        // Final navigation data
        const finalNavigation = {
          ...this.currentNavigation,
          currentPosition: { x: event.canvasX, y: event.canvasY },
          modifiers: this.getNavigationModifiers(event),
          duration: Date.now() - this.navigationStartTime,
          ...this.calculateNavigation(event)
        };

        // Emit navigation complete operation
        this.emitOperation(`${this.getNavigationOperation()}.complete`, finalNavigation);

        // Clear current navigation
        this.currentNavigation = null;
        this.navigationStartTime = 0;

      } catch (error) {
        this.dependencies.eventBus.emit('tool.error', {
          toolId: this.id,
          instanceId: this.instanceId,
          error: error as Error,
          operation: 'mouseUp',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handle keyboard events for navigation modifiers
   */
  protected handleKeyDown(event: KeyboardEvent): void {
    // Update modifiers if navigation is active
    if (this.getState() === ToolState.WORKING && this.currentNavigation) {
      // Create fake tool event to get updated modifiers
      const fakeEvent: ToolEvent = {
        x: 0, y: 0, canvasX: 0, canvasY: 0,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        eventType: 'keydown',
        timestamp: Date.now(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation()
      };

      const updatedModifiers = this.getNavigationModifiers(fakeEvent);
      
      // Check if modifiers changed
      const currentModifiers = this.currentNavigation.modifiers;
      if (JSON.stringify(updatedModifiers) !== JSON.stringify(currentModifiers)) {
        this.currentNavigation.modifiers = updatedModifiers;
        
        // Emit modifier change
        this.emitOperation(`${this.getNavigationOperation()}.modifier.changed`, {
          ...this.currentNavigation,
          modifiers: updatedModifiers
        });
      }
    }
  }

  /**
   * Handle key up events
   */
  protected handleKeyUp(event: KeyboardEvent): void {
    // Same as keydown - update modifiers
    this.handleKeyDown(event);
  }

  /**
   * Get current camera state
   */
  protected getCurrentCamera(): { x: number; y: number; zoom: number } {
    return this.dependencies.canvasManager.getCamera();
  }

  /**
   * Set camera position
   */
  protected setCameraPosition(x: number, y: number): void {
    this.dependencies.canvasManager.setPan({ x, y });
  }

  /**
   * Set camera zoom
   */
  protected setCameraZoom(zoom: number): void {
    this.dependencies.canvasManager.setZoom(zoom);
  }

  /**
   * Common cleanup for navigation tools
   */
  protected async cleanupTool(): Promise<void> {
    this.currentNavigation = null;
    this.navigationStartTime = 0;
  }
} 