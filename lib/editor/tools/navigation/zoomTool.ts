import { NavigationTool, NavigationData } from '../base/NavigationTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { ToolDependencies } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

export class ZoomTool extends NavigationTool {
  id = 'zoom';
  name = 'Zoom Tool';
  cursor = 'zoom-in';

  private zoomMode: 'in' | 'out' = 'in';
  private zoomStep = 0.1;
  private minZoom = 0.1;
  private maxZoom = 10;

  static getMetadata(): ToolMetadata {
    return {
      id: 'zoom',
      name: 'Zoom Tool',
      description: 'Zoom in/out of the canvas',
      category: 'navigation',
      groupId: 'navigation-group',
      icon: ToolGroupIcons['zoom'],
      cursor: 'zoom-in',
      shortcut: 'Z',
      priority: 2
    };
  }

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  protected getNavigationOperation(): string {
    return 'zoom';
  }

  protected calculateNavigation(event: ToolEvent): Partial<NavigationData> {
    const currentCamera = this.getCurrentCamera();
    const currentZoom = currentCamera.zoom;
    
    // Calculate new zoom level
    const multiplier = this.zoomMode === 'in' ? (1 + this.zoomStep) : (1 - this.zoomStep);
    let newZoom = currentZoom * multiplier;
    
    // Clamp zoom to min/max
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

    return {
      navigationParams: {
        zoom: newZoom,
        zoomCenter: { x: event.canvasX, y: event.canvasY },
        zoomMode: this.zoomMode
      }
    };
  }

  async onActivate(): Promise<void> {
    this.setState(ToolState.ACTIVE);
    this.updateCursor();
  }

  async onDeactivate(): Promise<void> {
    this.setState(ToolState.INACTIVE);
    this.cursor = 'default';
    this.zoomMode = 'in';
    await this.cleanupTool();
  }

  onMouseDown(event: ToolEvent): void {
    // Get zoom parameters from navigation params
    const navigation = this.calculateNavigation(event);
    const params = navigation.navigationParams;
    
    if (params && typeof params.zoom === 'number') {
      const zoomCenter = params.zoomCenter as { x: number; y: number };
      
      // Apply the zoom
      this.setCameraZoom(params.zoom);
      
      // Adjust pan to zoom towards the click point
      const currentCamera = this.getCurrentCamera();
      const zoomFactor = params.zoom / currentCamera.zoom;
      
      const newX = zoomCenter.x - (zoomCenter.x - currentCamera.x) * zoomFactor;
      const newY = zoomCenter.y - (zoomCenter.y - currentCamera.y) * zoomFactor;
      
      this.setCameraPosition(newX, newY);
    }

    // Emit zoom operation through base class
    this.handleMouseDown(event);
    
    // Complete immediately since zoom is a single click
    this.handleMouseUp(event);
  }

  onMouseMove(_event: ToolEvent): void {
    // Zoom tool doesn't use mouse move
  }

  onMouseUp(_event: ToolEvent): void {
    // Already handled in onMouseDown
  }

  onKeyDown(event: KeyboardEvent): void {
    // Alt key toggles zoom out mode
    if (event.altKey && this.zoomMode !== 'out') {
      this.zoomMode = 'out';
      this.updateCursor();
    }
    
    // Plus/minus keys for zoom
    if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      this.zoomOut();
    } else if (event.key === '0') {
      this.resetZoom();
    }
    
    this.handleKeyDown(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    // Release alt to return to zoom in mode
    if (!event.altKey && this.zoomMode === 'out') {
      this.zoomMode = 'in';
      this.updateCursor();
    }
    
    this.handleKeyUp(event);
  }

  private updateCursor(): void {
    this.cursor = this.zoomMode === 'in' ? 'zoom-in' : 'zoom-out';
  }

  private zoomIn(): void {
    const currentCamera = this.getCurrentCamera();
    const newZoom = Math.min(this.maxZoom, currentCamera.zoom * (1 + this.zoomStep));
    this.setCameraZoom(newZoom);
    
    // Emit zoom operation
    this.emitOperation('zoom.keyboard', {
      zoom: newZoom,
      direction: 'in'
    });
  }

  private zoomOut(): void {
    const currentCamera = this.getCurrentCamera();
    const newZoom = Math.max(this.minZoom, currentCamera.zoom * (1 - this.zoomStep));
    this.setCameraZoom(newZoom);
    
    // Emit zoom operation
    this.emitOperation('zoom.keyboard', {
      zoom: newZoom,
      direction: 'out'
    });
  }

  private resetZoom(): void {
    this.setCameraZoom(1);
    this.setCameraPosition(0, 0);
    
    // Emit zoom operation
    this.emitOperation('zoom.reset', {
      zoom: 1,
      position: { x: 0, y: 0 }
    });
  }
}