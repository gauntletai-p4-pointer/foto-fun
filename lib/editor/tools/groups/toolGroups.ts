import React from 'react';
import type { ToolGroupMetadata } from '../base/ToolRegistry';

// TODO: Import actual icon components when available
// For now using placeholder types
type IconComponent = React.ComponentType;

// Placeholder icon components - these should be replaced with actual icons
const SelectionGroupIcon: IconComponent = () => React.createElement('div', null, 'S');
const TransformGroupIcon: IconComponent = () => React.createElement('div', null, 'T');
const DrawingGroupIcon: IconComponent = () => React.createElement('div', null, 'D');
const ShapeGroupIcon: IconComponent = () => React.createElement('div', null, 'Sh');
const TextGroupIcon: IconComponent = () => React.createElement('div', null, 'Tx');
const AdjustmentGroupIcon: IconComponent = () => React.createElement('div', null, 'A');
const FilterGroupIcon: IconComponent = () => React.createElement('div', null, 'F');
const AIGenerationIcon: IconComponent = () => React.createElement('div', null, 'AI');
const AIEnhancementIcon: IconComponent = () => React.createElement('div', null, 'AE');
const AIEditingIcon: IconComponent = () => React.createElement('div', null, 'AEd');
const AISelectionIcon: IconComponent = () => React.createElement('div', null, 'AS');
const AICreativeIcon: IconComponent = () => React.createElement('div', null, 'AC');
const NavigationGroupIcon: IconComponent = () => React.createElement('div', null, 'N');

/**
 * UI Tool Groups Definition
 * These groups organize the 42 tools into logical UI groups for the tool palette
 */
export const UI_TOOL_GROUPS: ToolGroupMetadata[] = [
  {
    id: 'selection-group',
    name: 'Selection Tools',
    icon: SelectionGroupIcon,
    tools: ['marquee-rect', 'marquee-ellipse', 'lasso', 'magic-wand', 'quick-selection'],
    defaultTool: 'marquee-rect',
    showActiveToolIcon: true,
    priority: 1
  },
  {
    id: 'transform-group',
    name: 'Transform Tools',
    icon: TransformGroupIcon,
    tools: ['move', 'crop', 'rotate', 'flip'],
    defaultTool: 'move',
    showActiveToolIcon: true,
    priority: 2
  },
  {
    id: 'drawing-group',
    name: 'Drawing Tools',
    icon: DrawingGroupIcon,
    tools: ['brush', 'eraser', 'gradient'],
    defaultTool: 'brush',
    showActiveToolIcon: true,
    priority: 3
  },
  {
    id: 'shape-group',
    name: 'Shape Tools',
    icon: ShapeGroupIcon,
    tools: ['frame'],
    defaultTool: 'frame',
    showActiveToolIcon: false,
    priority: 4
  },
  {
    id: 'text-group',
    name: 'Text Tools',
    icon: TextGroupIcon,
    tools: ['horizontal-type', 'vertical-type', 'type-mask', 'type-on-path'],
    defaultTool: 'horizontal-type',
    showActiveToolIcon: true,
    priority: 5
  },
  {
    id: 'adjustment-group',
    name: 'Adjustment Tools',
    icon: AdjustmentGroupIcon,
    tools: ['brightness', 'contrast', 'saturation', 'hue', 'exposure'],
    defaultTool: 'brightness',
    showActiveToolIcon: true,
    priority: 6
  },
  {
    id: 'filter-group',
    name: 'Filter Tools',
    icon: FilterGroupIcon,
    tools: ['blur', 'sharpen', 'grayscale', 'invert', 'vintage-effects'],
    defaultTool: 'blur',
    showActiveToolIcon: true,
    priority: 7
  },
  {
    id: 'ai-generation-group',
    name: 'AI Generation',
    icon: AIGenerationIcon,
    tools: ['ai-image-generation', 'ai-variation'],
    defaultTool: 'ai-image-generation',
    showActiveToolIcon: false,
    priority: 8
  },
  {
    id: 'ai-enhancement-group',
    name: 'AI Enhancement',
    icon: AIEnhancementIcon,
    tools: ['ai-background-removal', 'ai-face-enhancement', 'ai-upscaling', 'ai-style-transfer'],
    defaultTool: 'ai-background-removal',
    showActiveToolIcon: false,
    priority: 9
  },
  {
    id: 'ai-editing-group',
    name: 'AI Editing',
    icon: AIEditingIcon,
    tools: ['ai-inpainting', 'ai-outpainting', 'ai-object-removal', 'ai-relighting'],
    defaultTool: 'ai-inpainting',
    showActiveToolIcon: false,
    priority: 10
  },
  {
    id: 'ai-selection-group',
    name: 'AI Selection',
    icon: AISelectionIcon,
    tools: ['ai-semantic-selection'],
    defaultTool: 'ai-semantic-selection',
    showActiveToolIcon: false,
    priority: 11
  },
  {
    id: 'ai-creative-group',
    name: 'AI Creative',
    icon: AICreativeIcon,
    tools: ['ai-prompt-brush', 'ai-style-transfer-brush', 'ai-prompt-adjustment'],
    defaultTool: 'ai-prompt-brush',
    showActiveToolIcon: false,
    priority: 12
  },
  {
    id: 'navigation-group',
    name: 'Navigation Tools',
    icon: NavigationGroupIcon,
    tools: ['hand', 'zoom', 'eyedropper'],
    defaultTool: 'hand',
    showActiveToolIcon: true,
    priority: 13
  }
];

/**
 * Helper function to get a tool group by ID
 */
export function getToolGroup(groupId: string): ToolGroupMetadata | null {
  return UI_TOOL_GROUPS.find(group => group.id === groupId) || null;
}

/**
 * Helper function to get all tools in a group
 */
export function getToolsInGroup(groupId: string): string[] {
  const group = getToolGroup(groupId);
  return group ? group.tools : [];
}

/**
 * Helper function to find which group a tool belongs to
 */
export function getToolGroupForTool(toolId: string): ToolGroupMetadata | null {
  return UI_TOOL_GROUPS.find(group => group.tools.includes(toolId)) || null;
} 