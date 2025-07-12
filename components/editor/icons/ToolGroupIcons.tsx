import React from 'react';
import { 
  MousePointer2, 
  Move, 
  Brush, 
  Square, 
  Type, 
  Settings, 
  Filter, 
  Sparkles, 
  Wand2, 
  Brain, 
  ScanSearch, 
  Palette, 
  Hand, 
  Layers,
  Crop,
  RotateCcw,
  Eraser,
  Paintbrush,
  Frame,
  AlignLeft,
  Sun,
  Circle,
  Droplet,
  Focus,
  Scissors,
  Zap,
  ZoomIn,
  Pipette
} from 'lucide-react';

interface IconProps {
  className?: string;
}

// Selection Tools Group
export const SelectionGroupIcon: React.FC<IconProps> = ({ className }) => (
  <MousePointer2 className={className} />
);

// Transform Tools Group
export const TransformGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Move className={className} />
);

// Drawing Tools Group
export const DrawingGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Brush className={className} />
);

// Shape Tools Group
export const ShapeGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Square className={className} />
);

// Text Tools Group
export const TextGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Type className={className} />
);

// Adjustment Tools Group
export const AdjustmentGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Settings className={className} />
);

// Filter Tools Group
export const FilterGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Filter className={className} />
);

// AI Generation Group
export const AIGenerationIcon: React.FC<IconProps> = ({ className }) => (
  <Sparkles className={className} />
);

// AI Enhancement Group
export const AIEnhancementIcon: React.FC<IconProps> = ({ className }) => (
  <Wand2 className={className} />
);

// AI Editing Group
export const AIEditingIcon: React.FC<IconProps> = ({ className }) => (
  <Brain className={className} />
);

// AI Selection Group
export const AISelectionIcon: React.FC<IconProps> = ({ className }) => (
  <ScanSearch className={className} />
);

// AI Creative Group
export const AICreativeIcon: React.FC<IconProps> = ({ className }) => (
  <Palette className={className} />
);

// Navigation Tools Group
export const NavigationGroupIcon: React.FC<IconProps> = ({ className }) => (
  <Hand className={className} />
);

// Individual Tool Icons (for when tools are implemented)
export const MoveIcon: React.FC<IconProps> = ({ className }) => (
  <Move className={className} />
);

export const CropIcon: React.FC<IconProps> = ({ className }) => (
  <Crop className={className} />
);

export const RotateIcon: React.FC<IconProps> = ({ className }) => (
  <RotateCcw className={className} />
);

export const FlipIcon: React.FC<IconProps> = ({ className }) => (
  <Layers className={className} />
);

export const BrushIcon: React.FC<IconProps> = ({ className }) => (
  <Brush className={className} />
);

export const EraserIcon: React.FC<IconProps> = ({ className }) => (
  <Eraser className={className} />
);

export const GradientIcon: React.FC<IconProps> = ({ className }) => (
  <Paintbrush className={className} />
);

export const FrameIcon: React.FC<IconProps> = ({ className }) => (
  <Frame className={className} />
);

export const HorizontalTypeIcon: React.FC<IconProps> = ({ className }) => (
  <Type className={className} />
);

export const VerticalTypeIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className} style={{ transform: 'rotate(90deg)' }}>
    <Type className="w-full h-full" />
  </div>
);

export const TypeMaskIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className}>
    <Type className="w-full h-full opacity-50" />
  </div>
);

export const TypeOnPathIcon: React.FC<IconProps> = ({ className }) => (
  <AlignLeft className={className} />
);

export const BrightnessIcon: React.FC<IconProps> = ({ className }) => (
  <Sun className={className} />
);

export const ContrastIcon: React.FC<IconProps> = ({ className }) => (
  <Circle className={className} />
);

export const SaturationIcon: React.FC<IconProps> = ({ className }) => (
  <Droplet className={className} />
);

export const HueIcon: React.FC<IconProps> = ({ className }) => (
  <Palette className={className} />
);

export const ExposureIcon: React.FC<IconProps> = ({ className }) => (
  <Zap className={className} />
);

export const BlurIcon: React.FC<IconProps> = ({ className }) => (
  <Focus className={className} />
);

export const SharpenIcon: React.FC<IconProps> = ({ className }) => (
  <Scissors className={className} />
);

export const GrayscaleIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className} style={{ filter: 'grayscale(100%)' }}>
    <Square className="w-full h-full" />
  </div>
);

export const InvertIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className} style={{ filter: 'invert(100%)' }}>
    <Square className="w-full h-full" />
  </div>
);

export const VintageEffectsIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className} style={{ filter: 'sepia(100%)' }}>
    <Square className="w-full h-full" />
  </div>
);

export const HandIcon: React.FC<IconProps> = ({ className }) => (
  <Hand className={className} />
);

export const ZoomIcon: React.FC<IconProps> = ({ className }) => (
  <ZoomIn className={className} />
);

export const EyedropperIcon: React.FC<IconProps> = ({ className }) => (
  <Pipette className={className} />
);

// Marquee Tools
export const MarqueeRectIcon: React.FC<IconProps> = ({ className }) => (
  <Square className={className} />
);

export const MarqueeEllipseIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <ellipse cx="12" cy="12" rx="8" ry="6" strokeDasharray="4 2" />
    </svg>
  </div>
);

export const LassoIcon: React.FC<IconProps> = ({ className }) => (
  <div className={className}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
      <path d="M3 12c0-4 2-8 6-8s8 2 8 6-2 8-6 8c-2 0-4-1-5-2" strokeDasharray="4 2" />
    </svg>
  </div>
);

export const MagicWandIcon: React.FC<IconProps> = ({ className }) => (
  <Wand2 className={className} />
);

export const QuickSelectionIcon: React.FC<IconProps> = ({ className }) => (
  <MousePointer2 className={className} />
); 