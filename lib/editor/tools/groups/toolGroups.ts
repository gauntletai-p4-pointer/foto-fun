import React from 'react';
import type { ToolRegistry } from '../base/ToolRegistry';
import type { ToolGroupMetadata } from '../base/ToolGroup';

// NOTE TO EXECUTOR: These are placeholder icon components. The UI team
// will need to create proper React components for these icons.
export const UI_TOOL_GROUPS: ToolGroupMetadata[] = [
  {
    id: 'selection-group',
    name: 'Selection Tools',
    description: 'Tools for selecting objects and areas',
    icon: () => React.createElement('div', { className: 'icon-selection' }),
    tools: ['marquee-rect', 'marquee-ellipse', 'lasso', 'magic-wand', 'quick-selection'],
    defaultTool: 'marquee-rect',
    showActiveToolIcon: true,
    priority: 1,
    shortcut: 'M',
    category: 'core'
  },
  {
    id: 'transform-group',
    name: 'Transform & Crop',
    description: 'Tools for moving, rotating, and transforming objects',
    icon: () => React.createElement('div', { className: 'icon-transform' }),
    tools: ['move', 'crop'],
    defaultTool: 'move',
    showActiveToolIcon: true,
    priority: 2,
    shortcut: 'V',
    category: 'core'
  },
  {
    id: 'drawing-group',
    name: 'Drawing Tools',
    description: 'Tools for drawing and painting',
    icon: () => React.createElement('div', { className: 'icon-drawing' }),
    tools: ['brush', 'eraser', 'gradient'],
    defaultTool: 'brush',
    showActiveToolIcon: true,
    priority: 3,
    shortcut: 'B',
    category: 'creative'
  },
  {
    id: 'text-group',
    name: 'Type Tools',
    description: 'Tools for creating and editing text',
    icon: () => React.createElement('div', { className: 'icon-text' }),
    tools: ['horizontal-type', 'vertical-type', 'type-mask', 'type-on-path'],
    defaultTool: 'horizontal-type',
    showActiveToolIcon: true,
    priority: 4,
    shortcut: 'T',
    category: 'creative'
  },
  {
    id: 'shape-group',
    name: 'Object & Shape Tools',
    description: 'Tools for creating shapes and frames',
    icon: () => React.createElement('div', { className: 'icon-shapes' }),
    tools: ['frame'], // Add rect, ellipse, etc. here later
    defaultTool: 'frame',
    showActiveToolIcon: false,
    priority: 5,
    shortcut: 'U',
    category: 'core'
  },
  {
    id: 'navigation-group',
    name: 'Navigation',
    description: 'Tools for navigating and examining the canvas',
    icon: () => React.createElement('div', { className: 'icon-navigation' }),
    tools: ['hand', 'zoom'],
    defaultTool: 'hand',
    showActiveToolIcon: true,
    priority: 10,
    shortcut: 'H',
    category: 'utility'
  }
];

export function registerUIToolGroups(registry: ToolRegistry) {
    UI_TOOL_GROUPS.forEach(group => registry.registerToolGroup(group));
} 