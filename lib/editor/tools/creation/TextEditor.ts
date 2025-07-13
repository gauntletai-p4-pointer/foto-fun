import type { CanvasObject, TextData } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';

export interface TextEditorCallbacks {
  onTextChange: (text: string) => void;
  onComplete: (finalText: string) => void;
  onCancel: () => void;
}

export interface TextEditorDependencies {
  canvasManager: CanvasManager;
}

/**
 * TextEditor - Provides inline text editing capability for text objects
 * Creates an overlay that positions itself over the text object for direct editing
 */
export class TextEditor {
  private container: HTMLDivElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private currentObject: CanvasObject | null = null;
  private callbacks: TextEditorCallbacks | null = null;
  
  constructor(private dependencies: TextEditorDependencies) {}
  
  startEditing(textObject: CanvasObject, callbacks: TextEditorCallbacks): void {
    this.currentObject = textObject;
    this.callbacks = callbacks;
    
    // Create editor UI
    this.createEditor();
    this.positionEditor();
    this.applyStyles();
    
    // Focus and select all
    if (this.textarea) {
      const textData = textObject.data as TextData;
      this.textarea.value = textData?.content || '';
      this.textarea.focus();
      this.textarea.select();
    }
  }
  
  stopEditing(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.textarea = null;
    }
    
    this.currentObject = null;
    this.callbacks = null;
  }
  
  complete(): void {
    if (this.textarea && this.callbacks) {
      this.callbacks.onComplete(this.textarea.value);
    }
  }
  
  cancel(): void {
    if (this.callbacks) {
      this.callbacks.onCancel();
    }
  }
  
  private createEditor(): void {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'text-editor-overlay';
    this.container.style.position = 'fixed';
    this.container.style.pointerEvents = 'none';
    
    // Create textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'text-editor-textarea';
    this.textarea.style.pointerEvents = 'auto';
    
    // Handle input
    this.textarea.addEventListener('input', () => {
      if (this.callbacks) {
        this.callbacks.onTextChange(this.textarea!.value);
      }
      this.autoResize();
    });
    
    // Handle keyboard
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.complete();
      }
    });
    
    // Handle blur
    this.textarea.addEventListener('blur', () => {
      // Delay to allow for button clicks
      setTimeout(() => {
        if (this.container && !this.container.contains(document.activeElement)) {
          this.complete();
        }
      }, 100);
    });
    
    this.container.appendChild(this.textarea);
    document.body.appendChild(this.container);
  }
  
  private positionEditor(): void {
    if (!this.container || !this.currentObject) return;
    
    const canvas = this.dependencies.canvasManager.stage.container();
    const canvasRect = canvas.getBoundingClientRect();
    const zoom = this.dependencies.canvasManager.stage.scaleX();
    const stagePos = this.dependencies.canvasManager.stage.position();
    
    // Convert object coordinates to screen coordinates
    const screenX = (this.currentObject.x * zoom) + stagePos.x + canvasRect.left;
    const screenY = (this.currentObject.y * zoom) + stagePos.y + canvasRect.top;
    const screenWidth = this.currentObject.width * zoom;
    const screenHeight = this.currentObject.height * zoom;
    
    this.container.style.left = `${screenX}px`;
    this.container.style.top = `${screenY}px`;
    this.container.style.width = `${screenWidth}px`;
    this.container.style.minHeight = `${screenHeight}px`;
  }
  
  private applyStyles(): void {
    if (!this.textarea || !this.currentObject) return;
    
    const data = this.currentObject.data as TextData;
    const zoom = this.dependencies.canvasManager.stage.scaleX();
    
    // Apply text styles
    this.textarea.style.fontFamily = data?.font || 'Inter';
    this.textarea.style.fontSize = `${(data?.fontSize || 24) * zoom}px`;
    this.textarea.style.fontWeight = '400';
    this.textarea.style.fontStyle = 'normal';
    this.textarea.style.textAlign = data?.align || 'left';
    this.textarea.style.lineHeight = `${data?.lineHeight || 1.5}`;
    this.textarea.style.letterSpacing = `${(data?.letterSpacing || 0) * zoom}px`;
    this.textarea.style.color = data?.color || '#000000';
    
    // Transparent background with subtle border
    this.textarea.style.background = 'none';
    this.textarea.style.border = '1px dashed #0066FF';
    this.textarea.style.outline = 'none';
    this.textarea.style.resize = 'none';
    this.textarea.style.padding = '4px';
    this.textarea.style.margin = '0';
    this.textarea.style.width = '100%';
    this.textarea.style.boxSizing = 'border-box';
    this.textarea.style.overflow = 'hidden';
  }
  
  private autoResize(): void {
    if (!this.textarea) return;
    
    // Reset height to auto to get scroll height
    this.textarea.style.height = 'auto';
    
    // Set height to scroll height
    this.textarea.style.height = `${this.textarea.scrollHeight}px`;
  }
}