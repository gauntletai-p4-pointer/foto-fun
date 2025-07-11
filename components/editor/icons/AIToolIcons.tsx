import React from 'react'
import { 
  Sparkles, 
  Wand2, 
  Brain, 
  Palette, 
  Eraser,
  Grid3x3,
  Brush,
  Image,
  ScanSearch,
  Maximize2,
  UserCheck,
  PaintBucket,
  Layers,
  Type,
  Settings2
} from 'lucide-react'

// AI Generation Icons
export const ImageGenerationIcon: React.FC = () => (
  <Sparkles className="w-4 h-4" />
)

export const VariationGridIcon: React.FC = () => (
  <Grid3x3 className="w-4 h-4" />
)

export const OutpaintingIcon: React.FC = () => (
  <Maximize2 className="w-4 h-4" />
)

// AI Enhancement Icons
export const BackgroundRemovalIcon: React.FC = () => (
  <Layers className="w-4 h-4" />
)

export const FaceEnhancementIcon: React.FC = () => (
  <UserCheck className="w-4 h-4" />
)

export const InpaintingIcon: React.FC = () => (
  <PaintBucket className="w-4 h-4" />
)

export const MagicEraserIcon: React.FC = () => (
  <div className="relative">
    <Eraser className="w-4 h-4" />
    <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5" />
  </div>
)

// AI Selection Icons
export const SemanticSelectionIcon: React.FC = () => (
  <div className="relative">
    <ScanSearch className="w-4 h-4" />
    <Type className="w-2 h-2 absolute -bottom-0.5 -right-0.5" />
  </div>
)

export const SmartSelectionIcon: React.FC = () => (
  <div className="relative">
    <Wand2 className="w-4 h-4" />
    <Brain className="w-2 h-2 absolute -top-0.5 -right-0.5" />
  </div>
)

// AI Creative Icons
export const AIPromptBrushIcon: React.FC = () => (
  <div className="relative">
    <Brush className="w-4 h-4" />
    <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5" />
  </div>
)

export const StyleTransferBrushIcon: React.FC = () => (
  <div className="relative">
    <Palette className="w-4 h-4" />
    <Brush className="w-2 h-2 absolute -bottom-0.5 -right-0.5" />
  </div>
)

export const PromptAdjustmentIcon: React.FC = () => (
  <div className="relative">
    <Settings2 className="w-4 h-4" />
    <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5" />
  </div>
) 