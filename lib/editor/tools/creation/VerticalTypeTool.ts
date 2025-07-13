import { TextTool } from './TextTool';
import type { ToolDependencies } from '../base/BaseTool';
import type { CanvasObject, Rect } from '@/types';
import type { TextData } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';

/**
 * Vertical Type Tool - Creates vertical text objects
 * Extends TextTool with vertical writing mode support
 */
export class VerticalTypeTool extends TextTool {
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'vertical-type',
      name: 'Vertical Type Tool',
      description: 'Add vertical text to the canvas',
      category: 'core',
      groupId: 'text-group',
      icon: ToolGroupIcons['vertical-text'],
      cursor: 'text',
      shortcut: 'Shift+T',
      priority: 2,
    };
  }

  protected createObjectData(bounds: Rect): Partial<CanvasObject> {
    // Get base text object from parent
    const baseObject = super.createObjectData(bounds);
    
    // Override with vertical text properties
    const textData = baseObject.data as TextData;
    textData.direction = 'vertical'; // Vertical text direction
    
    // Adjust default dimensions for vertical text
    const verticalObject: Partial<CanvasObject> = {
      ...baseObject,
      type: 'verticalText',
      name: 'Vertical Text',
      width: bounds.width || 50,  // Narrower default width
      height: bounds.height || 200, // Taller default height
      data: textData
    };
    
    return verticalObject;
  }

  public getOptionDefinitions() {
    // Get base options from parent
    const baseOptions = super.getOptionDefinitions();
    
    // Add vertical-specific options
    return {
      ...baseOptions,
      writingMode: {
        type: 'select' as const,
        defaultValue: 'vertical-rl',
        options: [
          { value: 'vertical-rl', label: 'Vertical (Right to Left)' },
          { value: 'vertical-lr', label: 'Vertical (Left to Right)' }
        ],
        label: 'Writing Mode'
      },
      textOrientation: {
        type: 'select' as const,
        defaultValue: 'mixed',
        options: [
          { value: 'mixed', label: 'Mixed' },
          { value: 'upright', label: 'Upright' },
          { value: 'sideways', label: 'Sideways' }
        ],
        label: 'Text Orientation'
      }
    };
  }

  protected getDefaultOptions() {
    return {
      ...super.getDefaultOptions(),
      writingMode: 'vertical-rl',
      textOrientation: 'mixed'
    };
  }
}