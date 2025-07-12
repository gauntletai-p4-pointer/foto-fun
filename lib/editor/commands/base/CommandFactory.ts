import type { CanvasObject, TextData } from '@/lib/editor/objects/types'
import type { PixelSelection, SelectionMode } from '@/types'
import type { CommandContext } from './Command'
import type { Command } from './Command'
import type { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import type { SelectionMask } from '@/lib/editor/selection/SelectionMask'
import { AddObjectCommand } from '../object/AddObjectCommand'
import { UpdateObjectCommand } from '../object/UpdateObjectCommand'
import { RemoveObjectCommand } from '../object/RemoveObjectCommand'
import { GroupObjectsCommand } from '../object/GroupObjectsCommand'
import { UngroupObjectsCommand } from '../object/UngroupObjectsCommand'
import { ReorderObjectsCommand, type ReorderDirection } from '../object/ReorderObjectsCommand'
import { AddTextCommand } from '../text/AddTextCommand'
import { EditTextCommand } from '../text/EditTextCommand'
import { CopyCommand } from '../clipboard/CopyCommand'
import { CutCommand } from '../clipboard/CutCommand'
import { PasteCommand } from '../clipboard/PasteCommand'
import { CreateSelectionCommand } from '../selection/CreateSelectionCommand'
import { ClearSelectionCommand } from '../selection/ClearSelectionCommand'
import { CreateBrushStrokeCommand } from '../drawing/CreateBrushStrokeCommand'
import { CompositeCommand } from './CompositeCommand'
import { CropCommand, type CropOptions } from '../canvas/CropCommand'
import { UpdateImageDataCommand, type UpdateImageDataOptions } from '../canvas/UpdateImageDataCommand'

/**
 * Command Factory Pattern with Dependency Injection
 * Provides a standardized way to create commands with proper context
 */
export interface CommandFactory {
  // Object commands
  createAddObjectCommand(object: Partial<CanvasObject>): AddObjectCommand
  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand
  createRemoveObjectCommand(objectId: string): RemoveObjectCommand
  createGroupObjectsCommand(objectIds: string[], groupName?: string): GroupObjectsCommand
  createUngroupObjectsCommand(groupId: string): UngroupObjectsCommand
  createReorderObjectsCommand(objectIds: string[], direction: ReorderDirection): ReorderObjectsCommand

  // Text commands
  createAddTextCommand(text: string, position: { x: number; y: number }, style?: Partial<TextData>): AddTextCommand
  createEditTextCommand(objectId: string, newText: string, newStyle?: Partial<TextData>): EditTextCommand

  // Clipboard commands
  createCopyCommand(objects?: CanvasObject[]): CopyCommand
  createCutCommand(objects?: CanvasObject[]): CutCommand
  createPasteCommand(position?: { x: number; y: number }, offset?: number): PasteCommand

  // Selection commands
  createSelectionCommand(selection: PixelSelection, mode: SelectionMode): CreateSelectionCommand
  createClearSelectionCommand(): ClearSelectionCommand
  createApplySelectionCommand(selectionMask: SelectionMask, mode: SelectionMode): CreateSelectionCommand

  // Drawing commands
  createDrawCommand(
    targetObjectId: string,
    points: import('@/lib/editor/tools/engines/BrushEngine').BrushStrokePoint[],
    options: import('@/lib/editor/tools/engines/BrushEngine').BrushOptions
  ): CreateBrushStrokeCommand

  // Canvas commands
  createCropCommand(cropOptions: CropOptions): CropCommand
  createUpdateImageDataCommand(options: UpdateImageDataOptions): UpdateImageDataCommand

  // Composite commands
  createCompositeCommand(description: string, commands: Command[]): CompositeCommand
}

/**
 * Service implementation of CommandFactory with dependency injection
 * Gets all dependencies from ServiceContainer and creates commands with proper context
 */
export class ServiceCommandFactory implements CommandFactory {
  private serviceContainer: ServiceContainer;

  constructor(serviceContainer: ServiceContainer) {
    // Store the container instead of resolving dependencies immediately
    this.serviceContainer = serviceContainer;
  }

  /**
   * Create command context with injected dependencies
   */
  private createCommandContext(): CommandContext {
    // Resolve dependencies just-in-time when a command is created
    const eventBus = this.serviceContainer.getSync<TypedEventBus>('TypedEventBus');
    const canvasManager = this.serviceContainer.getSync<CanvasManager>('CanvasManager');
    const selectionManager = this.serviceContainer.getSync<SelectionManager>('SelectionManager');

    return {
      eventBus,
      canvasManager,
      selectionManager,
      executionId: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
  }

  // Object commands
  createAddObjectCommand(object: Partial<CanvasObject>): AddObjectCommand {
    return new AddObjectCommand(
      `Add ${object.type || 'object'}`,
      this.createCommandContext(),
      { object }
    )
  }

  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand {
    return new UpdateObjectCommand(
      'Update object',
      this.createCommandContext(),
      { objectId, updates }
    )
  }

  createRemoveObjectCommand(objectId: string): RemoveObjectCommand {
    return new RemoveObjectCommand(
      'Remove object',
      this.createCommandContext(),
      { objectId }
    )
  }

  createGroupObjectsCommand(objectIds: string[], groupName?: string): GroupObjectsCommand {
    return new GroupObjectsCommand(
      `Group ${objectIds.length} objects`,
      this.createCommandContext(),
      { objectIds, groupName }
    )
  }

  createUngroupObjectsCommand(groupId: string): UngroupObjectsCommand {
    return new UngroupObjectsCommand(
      'Ungroup objects',
      this.createCommandContext(),
      { groupId }
    )
  }

  createReorderObjectsCommand(objectIds: string[], direction: ReorderDirection): ReorderObjectsCommand {
    return new ReorderObjectsCommand(
      `Move objects ${direction}`,
      this.createCommandContext(),
      { objectIds, direction }
    )
  }

  // Text commands
  createAddTextCommand(text: string, position: { x: number; y: number }, style?: Partial<TextData>): AddTextCommand {
    return new AddTextCommand(
      'Add text',
      this.createCommandContext(),
      { text, position, style }
    )
  }

  createEditTextCommand(objectId: string, newText: string, newStyle?: Partial<TextData>): EditTextCommand {
    return new EditTextCommand(
      'Edit text',
      this.createCommandContext(),
      { objectId, newText, newStyle }
    )
  }

  // Clipboard commands
  createCopyCommand(objects?: CanvasObject[]): CopyCommand {
    return new CopyCommand(
      'Copy objects',
      this.createCommandContext(),
      { objects }
    )
  }

  createCutCommand(objects?: CanvasObject[]): CutCommand {
    return new CutCommand(
      'Cut objects',
      this.createCommandContext(),
      { objects }
    )
  }

  createPasteCommand(position?: { x: number; y: number }, offset?: number): PasteCommand {
    return new PasteCommand(
      'Paste objects',
      this.createCommandContext(),
      { position, offset }
    )
  }

  // Selection commands
  createSelectionCommand(selection: PixelSelection, mode: SelectionMode): CreateSelectionCommand {
    return new CreateSelectionCommand(
      `Create ${mode} selection`,
      this.createCommandContext(),
      { selection, mode }
    )
  }

  createClearSelectionCommand(): ClearSelectionCommand {
    return new ClearSelectionCommand(
      'Clear selection',
      this.createCommandContext()
    )
  }

  createApplySelectionCommand(selectionMask: SelectionMask, mode: SelectionMode): CreateSelectionCommand {
    // Convert SelectionMask to PixelSelection format
    const pixelSelection: PixelSelection = {
      type: 'pixels',
      mask: new ImageData(selectionMask.bounds.width, selectionMask.bounds.height), // Placeholder
      bounds: selectionMask.bounds
    };
    
    return new CreateSelectionCommand(
      `Apply ${mode} selection`,
      this.createCommandContext(),
      { selection: pixelSelection, mode }
    )
  }

  // Drawing commands
  createDrawCommand(
    targetObjectId: string,
    points: import('@/lib/editor/tools/engines/BrushEngine').BrushStrokePoint[],
    options: import('@/lib/editor/tools/engines/BrushEngine').BrushOptions
  ): CreateBrushStrokeCommand {
    const strokeData: import('@/lib/editor/tools/engines/BrushEngine').BrushStrokeData = {
      id: `stroke-${Date.now()}`,
      targetObjectId,
      points,
      options,
      startTime: Date.now()
    };
    return new CreateBrushStrokeCommand(
      'Draw brush stroke',
      this.createCommandContext(),
      { strokeData, targetObjectId }
    );
  }

  // Canvas commands
  createCropCommand(cropOptions: CropOptions): CropCommand {
    return new CropCommand(
      cropOptions,
      this.createCommandContext()
    )
  }

  createUpdateImageDataCommand(options: UpdateImageDataOptions): UpdateImageDataCommand {
    return new UpdateImageDataCommand(
      options,
      this.createCommandContext()
    )
  }

  // Composite commands
  createCompositeCommand(description: string, commands: Command[]): CompositeCommand {
    return new CompositeCommand(description, this.createCommandContext(), commands)
  }
} 