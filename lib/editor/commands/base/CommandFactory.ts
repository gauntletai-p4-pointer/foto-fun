import type { CanvasObject, TextData } from '@/lib/editor/objects/types'
import type { PixelSelection, SelectionMode } from '@/types'
import type { CommandContext } from './Command'
import type { Command } from './Command'
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
import { CompositeCommand } from './CompositeCommand'

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

  // Composite commands
  createCompositeCommand(description: string, commands: Command[]): CompositeCommand
}

/**
 * Default implementation of CommandFactory
 * Uses dependency injection through CommandContext
 */
export class DefaultCommandFactory implements CommandFactory {
  constructor(private context: CommandContext) {}

  // Object commands
  createAddObjectCommand(object: Partial<CanvasObject>): AddObjectCommand {
    return new AddObjectCommand(
      `Add ${object.type || 'object'}`,
      this.context,
      { object }
    )
  }

  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand {
    return new UpdateObjectCommand(
      'Update object',
      this.context,
      { objectId, updates }
    )
  }

  createRemoveObjectCommand(objectId: string): RemoveObjectCommand {
    return new RemoveObjectCommand(
      'Remove object',
      this.context,
      { objectId }
    )
  }

  createGroupObjectsCommand(objectIds: string[], groupName?: string): GroupObjectsCommand {
    return new GroupObjectsCommand(
      `Group ${objectIds.length} objects`,
      this.context,
      { objectIds, groupName }
    )
  }

  createUngroupObjectsCommand(groupId: string): UngroupObjectsCommand {
    return new UngroupObjectsCommand(
      'Ungroup objects',
      this.context,
      { groupId }
    )
  }

  createReorderObjectsCommand(objectIds: string[], direction: ReorderDirection): ReorderObjectsCommand {
    return new ReorderObjectsCommand(
      `Move objects ${direction}`,
      this.context,
      { objectIds, direction }
    )
  }

  // Text commands
  createAddTextCommand(text: string, position: { x: number; y: number }, style?: Partial<TextData>): AddTextCommand {
    return new AddTextCommand(
      'Add text',
      this.context,
      { text, position, style }
    )
  }

  createEditTextCommand(objectId: string, newText: string, newStyle?: Partial<TextData>): EditTextCommand {
    return new EditTextCommand(
      'Edit text',
      this.context,
      { objectId, newText, newStyle }
    )
  }

  // Clipboard commands
  createCopyCommand(objects?: CanvasObject[]): CopyCommand {
    return new CopyCommand(
      'Copy objects',
      this.context,
      { objects }
    )
  }

  createCutCommand(objects?: CanvasObject[]): CutCommand {
    return new CutCommand(
      'Cut objects',
      this.context,
      { objects }
    )
  }

  createPasteCommand(position?: { x: number; y: number }, offset?: number): PasteCommand {
    return new PasteCommand(
      'Paste objects',
      this.context,
      { position, offset }
    )
  }

  // Selection commands
  createSelectionCommand(selection: PixelSelection, mode: SelectionMode): CreateSelectionCommand {
    return new CreateSelectionCommand(
      `Create ${mode} selection`,
      this.context,
      { selection, mode }
    )
  }

  createClearSelectionCommand(): ClearSelectionCommand {
    return new ClearSelectionCommand(
      'Clear selection',
      this.context
    )
  }

  // Composite commands
  createCompositeCommand(description: string, commands: Command[]): CompositeCommand {
    return new CompositeCommand(description, this.context, commands)
  }
} 