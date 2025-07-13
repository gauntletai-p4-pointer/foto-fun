import { NavigationTool, NavigationData } from '../base/NavigationTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { ToolDependencies } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

interface PanState {
  startX: number;
  startY: number;
  startCameraX: number;
  startCameraY: number;
}

export class HandTool extends NavigationTool {
  id = 'hand';
  name = 'Hand Tool';
  cursor = 'grab';

  static getMetadata(): ToolMetadata {
    return {
      id: 'hand',
      name: 'Hand Tool',
      description: 'Pan the canvas',
      category: 'navigation',
      groupId: 'navigation-group',
      icon: ToolGroupIcons['hand'],
      cursor: 'grab',
      shortcut: 'H',
      priority: 1
    };
  }

  private panState: PanState | null = null;

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  protected getNavigationOperation(): string {
    return 'pan';
  }

  protected calculateNavigation(event: ToolEvent): Partial<NavigationData> {
    if (!this.panState) {
      return {};
    }

    const deltaX = event.x - this.panState.startX;
    const deltaY = event.y - this.panState.startY;

    return {
      navigationParams: {
        x: this.panState.startCameraX - deltaX,
        y: this.panState.startCameraY - deltaY
      }
    };
  }

  async onActivate(): Promise<void> {
    this.setState(ToolState.ACTIVE);
    this.cursor = 'grab';
  }

  async onDeactivate(): Promise<void> {
    this.setState(ToolState.INACTIVE);
    this.cursor = 'default';
    this.panState = null;
    await this.cleanupTool();
  }

  onMouseDown(event: ToolEvent): void {
    const camera = this.getCurrentCamera();
    
    this.panState = {
      startX: event.x,
      startY: event.y,
      startCameraX: camera.x,
      startCameraY: camera.y
    };

    this.cursor = 'grabbing';
    this.handleMouseDown(event);
  }

  onMouseMove(event: ToolEvent): void {
    if (this.getState() !== ToolState.WORKING || !this.panState) return;

    const deltaX = event.x - this.panState.startX;
    const deltaY = event.y - this.panState.startY;

    let newX = this.panState.startCameraX - deltaX;
    let newY = this.panState.startCameraY - deltaY;

    // Constrain to axis if shift is held
    if (event.shiftKey) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newY = this.panState.startCameraY;
      } else {
        newX = this.panState.startCameraX;
      }
    }

    // Apply speed modifiers
    const speedMultiplier = event.altKey ? 0.3 : (event.metaKey || event.ctrlKey) ? 2 : 1;
    if (speedMultiplier !== 1) {
      newX = this.panState.startCameraX - (deltaX * speedMultiplier);
      newY = this.panState.startCameraY - (deltaY * speedMultiplier);
    }

    this.setCameraPosition(newX, newY);
    this.handleMouseMove(event);
  }

  onMouseUp(event: ToolEvent): void {
    this.cursor = 'grab';
    this.handleMouseUp(event);
    this.panState = null;
  }

  onKeyDown(event: KeyboardEvent): void {
    // Support spacebar for temporary hand tool activation
    if (event.code === 'Space' && this.getState() !== ToolState.WORKING) {
      this.dependencies.eventBus.emit('tool.operation.requested', {
        toolId: this.id,
        instanceId: this.instanceId,
        operation: 'temporary.activate',
        params: { toolId: 'hand' } as Record<string, unknown>,
        timestamp: Date.now()
      });
    }
    this.handleKeyDown(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.handleKeyUp(event);
  }
}