'use client';

import { MousePointer2, Pen, Scissors, Trash2,
  MousePointer,
  Combine,
  MinusSquare,
  Network,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize,
  Eraser,
  Spline,
  Scaling,
  Tag
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
}

export default function Toolbar({ activeTool, onToolSelect }: ToolbarProps) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'direct', icon: MousePointer, label: 'Direct Selection (A)' },
    { id: 'pen', icon: Pen, label: 'Vector Pen (P)' },
    { id: 'curve', icon: Spline, label: 'Bezier Curve' },
    { id: 'grade', icon: Scaling, label: 'Grade Pattern (Offsets)' },
    { id: 'mirror', icon: Scissors, label: 'Mirror Pattern', action: true },
    { id: 'designate', icon: Tag, label: 'Designate Pattern / Size' },
    { id: 'notch', icon: Network, label: 'Add Notch' },
    { id: 'union', icon: Combine, label: 'Merge / Union', action: true },
    { id: 'subtract', icon: MinusSquare, label: 'Subtract', action: true },
    { id: 'zoom-in', icon: ZoomIn, label: 'Zoom In', action: true },
    { id: 'zoom-out', icon: ZoomOut, label: 'Zoom Out', action: true },
    { id: 'fit-all', icon: Maximize, label: 'Fit to Screen', action: true },
    { id: 'delete', icon: Trash2, label: 'Delete Selected', action: true },
    { id: 'clear', icon: Eraser, label: 'Clear Canvas', action: true },
  ];

  return (
    <aside className="w-16 border-r bg-white flex flex-col items-center py-4 gap-4 z-10 shadow-sm">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect(tool.id)}
          className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
            activeTool === tool.id
              ? 'bg-blue-100 text-blue-600 shadow-inner'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
          title={tool.label}
        >
          <tool.icon size={20} />
        </button>
      ))}
    </aside>
  );
}
