import { AdjustmentTool, AdjustmentOptions } from '../base/AdjustmentTool';
import type { ToolDependencies } from '../base/BaseTool';

import type { ToolMetadata } from '../base/ToolRegistry';
import React from 'react';

export interface BrightnessOptions extends AdjustmentOptions {
  value: number; // -100 to 100
  preserveColors: boolean;
}

/**
 * Brightness adjustment tool that modifies image brightness while optionally preserving color relationships
 * Uses HSL color space for color-preserving adjustments or simple RGB scaling for direct adjustments
 */
export class BrightnessTool extends AdjustmentTool<BrightnessOptions> {
  private adjustmentUI: HTMLElement | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  protected getDefaultOptions(): BrightnessOptions {
    return {
      value: 0,
      preserveColors: true,
      previewMode: true
    };
  }

  public getOptionDefinitions() {
    return {
      value: {
        type: 'number' as const,
        defaultValue: 0,
        label: 'Brightness',
        min: -100,
        max: 100,
        step: 1
      },
      preserveColors: {
        type: 'boolean' as const,
        defaultValue: true,
        label: 'Preserve Colors'
      },
      previewMode: {
        type: 'boolean' as const,
        defaultValue: true,
        label: 'Real-time Preview'
      }
    };
  }

  /**
   * Process image data with brightness adjustment
   */
  protected async processImageData(imageData: ImageData, value: number): Promise<ImageData> {
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const adjustment = value / 100; // Convert to -1 to 1 range
    const options = this.getAllOptions();
    
    for (let i = 0; i < output.data.length; i += 4) {
      const r = output.data[i];
      const g = output.data[i + 1];
      const b = output.data[i + 2];
      const a = output.data[i + 3];
      
      if (options.preserveColors) {
        // Preserve color relationships using HSL
        const hsl = this.rgbToHsl(r, g, b);
        
        // Adjust lightness
        hsl.l = Math.max(0, Math.min(1, hsl.l + adjustment));
        
        // Convert back to RGB
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        
        output.data[i] = rgb.r;
        output.data[i + 1] = rgb.g;
        output.data[i + 2] = rgb.b;
      } else {
        // Simple brightness adjustment - direct RGB scaling
        const factor = adjustment > 0 ? 1 + adjustment : 1 / (1 - adjustment);
        
        output.data[i] = Math.max(0, Math.min(255, r * factor));
        output.data[i + 1] = Math.max(0, Math.min(255, g * factor));
        output.data[i + 2] = Math.max(0, Math.min(255, b * factor));
      }
      
      // Alpha channel unchanged
      output.data[i + 3] = a;
    }
    
    return output;
  }

  /**
   * Show adjustment UI (placeholder implementation)
   */
  protected async showAdjustmentUI(): Promise<void> {
    // For now, just log - UI integration will be implemented later
    console.log('[BrightnessTool] Showing adjustment UI with options:', this.getOptionDefinitions());
    
    // Store reference for later cleanup
    this.adjustmentUI = document.createElement('div');
    this.adjustmentUI.setAttribute('data-tool', this.id);
    this.adjustmentUI.setAttribute('data-type', 'adjustment');
  }

  /**
   * Hide adjustment UI
   */
  protected async hideAdjustmentUI(): Promise<void> {
    // For now, just log - UI integration will be implemented later
    console.log('[BrightnessTool] Hiding adjustment UI');
    
    // Clean up UI reference
    if (this.adjustmentUI) {
      this.adjustmentUI.remove();
      this.adjustmentUI = null;
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.getState() !== 'ACTIVE') return;
    
    const options = this.getAllOptions();
    let newValue = options.value;
    
    switch (event.key) {
      case 'ArrowUp':
        newValue = Math.min(100, options.value + 5);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newValue = Math.max(-100, options.value - 5);
        event.preventDefault();
        break;
      case 'Enter':
        this.commitAdjustment(options.value);
        event.preventDefault();
        break;
      case 'Escape':
        this.cancelAdjustment();
        event.preventDefault();
        break;
      default:
        return;
    }
    
    if (newValue !== options.value) {
      this.setOption('value', newValue);
      if (options.previewMode) {
        this.applyAdjustment(newValue);
      }
    }
  }

  /**
   * Get tool metadata for registration
   */
  static getMetadata(): ToolMetadata {
    return {
      id: 'brightness',
      name: 'Brightness',
      description: 'Adjust image brightness while preserving color relationships',
      category: 'adjustment',
      groupId: 'adjustment-group',
      icon: (() => React.createElement('div', {}, '☀️')) as React.ComponentType, // Placeholder icon
      cursor: 'default',
      shortcut: 'Ctrl+Shift+B',
      priority: 1
    };
  }
} 