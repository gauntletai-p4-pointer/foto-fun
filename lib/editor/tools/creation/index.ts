export { FrameTool } from './FrameTool';

// Tool registrations for the creation tools
import { FrameTool } from './FrameTool';
import type { ToolMetadata } from '../base/ToolRegistry';
import React from 'react';

export const FRAME_TOOL_METADATA: ToolMetadata = {
  id: 'frame',
  name: 'Frame Tool',
  description: 'Create frames for document boundaries and composition guides',
  category: 'creation',
  groupId: 'shape-group',
  icon: () => React.createElement('div', { className: 'icon-frame' }),
  cursor: 'crosshair',
  shortcut: 'F',
  priority: 1
};

export const CREATION_TOOL_REGISTRATIONS = [
  {
    id: 'frame',
    ToolClass: FrameTool,
    metadata: FRAME_TOOL_METADATA
  }
] as const; 