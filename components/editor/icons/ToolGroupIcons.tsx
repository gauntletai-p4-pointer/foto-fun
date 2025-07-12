import { Hand, SquareDashedBottom, Brush, Type, Frame, Move, Crop, ZoomIn, Eye, GitBranchPlus } from "lucide-react";
import React from "react";

export const ToolGroupIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    'selection-group': SquareDashedBottom,
    'transform-group': Move,
    'drawing-group': Brush,
    'brush': Brush,
    'text-group': Type,
    'shape-group': Frame,
    'navigation-group': Hand,
    'move': Move,
    'crop': Crop,
    'zoom': ZoomIn,
    'hand': Hand,
    'eyedropper': Eye,
    'frame': GitBranchPlus,
}; 