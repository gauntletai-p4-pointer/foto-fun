import type { ToolRegistry } from './base/ToolRegistry';
import { MoveToolEnhanced as MoveTool } from './transform/MoveToolEnhanced';
import { CropTool } from './transform/CropTool';
import { BrushTool } from './drawing/BrushTool';
import { EraserTool } from './drawing/EraserTool';
import { MarqueeRectTool } from './selection/MarqueeRectTool';
import { FrameTool } from './creation/FrameTool';
import { TextTool } from './creation/TextTool';
import { VerticalTypeTool } from './creation/VerticalTypeTool';
import { TypeMaskTool } from './creation/TypeMaskTool';
import { TypeOnPathTool } from './creation/TypeOnPathTool';
import { HandTool } from './navigation/handTool';
import { ZoomTool } from './navigation/zoomTool';

/**
 * Registers all core tools with the provided ToolRegistry.
 * This centralized registration helps avoid circular dependencies.
 * @param registry The ToolRegistry instance.
 */
export function registerCoreTools(registry: ToolRegistry): void {
  // Register navigation tools
  registry.registerToolClass(HandTool.getMetadata().id, HandTool, HandTool.getMetadata());
  registry.registerToolClass(ZoomTool.getMetadata().id, ZoomTool, ZoomTool.getMetadata());
  
  // Register transform tools
  registry.registerToolClass(MoveTool.getMetadata().id, MoveTool, MoveTool.getMetadata());
  registry.registerToolClass(CropTool.getMetadata().id, CropTool, CropTool.getMetadata());
  
  // Register drawing tools
  registry.registerToolClass(BrushTool.getMetadata().id, BrushTool, BrushTool.getMetadata());
  registry.registerToolClass(EraserTool.getMetadata().id, EraserTool, EraserTool.getMetadata());
  
  // Register selection tools
  registry.registerToolClass(MarqueeRectTool.getMetadata().id, MarqueeRectTool, MarqueeRectTool.getMetadata());
  
  // Register creation tools
  registry.registerToolClass(FrameTool.getMetadata().id, FrameTool, FrameTool.getMetadata());
  
  // Register text tools
  registry.registerToolClass(TextTool.getMetadata().id, TextTool, TextTool.getMetadata());
  registry.registerToolClass(VerticalTypeTool.getMetadata().id, VerticalTypeTool, VerticalTypeTool.getMetadata());
  registry.registerToolClass(TypeMaskTool.getMetadata().id, TypeMaskTool, TypeMaskTool.getMetadata());
  registry.registerToolClass(TypeOnPathTool.getMetadata().id, TypeOnPathTool, TypeOnPathTool.getMetadata());

  console.log('[ToolRegistration] All core tools registered.');
} 