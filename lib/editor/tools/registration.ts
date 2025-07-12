import type { ToolRegistry } from './base/ToolRegistry';
import { MoveTool } from './transform/MoveTool';
import { CropTool } from './transform/CropTool';
import { BrushTool } from './drawing/BrushTool';
import { FrameTool } from './creation/FrameTool';

/**
 * Registers all core tools with the provided ToolRegistry.
 * This centralized registration helps avoid circular dependencies.
 * @param registry The ToolRegistry instance.
 */
export function registerCoreTools(registry: ToolRegistry): void {
  // Register individual tools
  registry.registerToolClass(MoveTool.getMetadata().id, MoveTool, MoveTool.getMetadata());
  registry.registerToolClass(CropTool.getMetadata().id, CropTool, CropTool.getMetadata());
  registry.registerToolClass(BrushTool.getMetadata().id, BrushTool, BrushTool.getMetadata());
  registry.registerToolClass(FrameTool.getMetadata().id, FrameTool, FrameTool.getMetadata());

  console.log('[ToolRegistration] All core tools registered.');
} 