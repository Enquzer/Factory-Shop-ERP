
"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, MousePointer2 } from 'lucide-react';

export interface Arrow {
  id: string;
  label: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface MeasurementCanvasProps {
  imageUrl?: string;
  arrows: Arrow[];
  onArrowsChange: (arrows: Arrow[]) => void;
  onImageChange: (url: string) => void;
  selectedArrowId: string | null;
  onArrowSelect: (id: string | null) => void;
}

export function MeasurementCanvas({ 
    imageUrl, 
    arrows, 
    onArrowsChange, 
    onImageChange, 
    selectedArrowId,
    onArrowSelect
}: MeasurementCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentArrow, setCurrentArrow] = useState<Partial<Arrow> | null>(null);

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * 100, // percentage
      y: (e.clientY - rect.top) / rect.height * 100  // percentage
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    // Don't start drawing if clicking on an existing arrow (handled by bubbling, but let's be safe)
    if ((e.target as HTMLElement).closest('.arrow-handle')) return;

    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    setCurrentArrow({
      start: coords,
      end: coords
    });
    onArrowSelect(null); // Deselect on new draw
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentArrow) return;
    const coords = getRelativeCoords(e);
    setCurrentArrow(prev => ({ ...prev, end: coords }));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentArrow || !currentArrow.start || !currentArrow.end) return;
    
    // Only add if it has some length
    const dx = currentArrow.end.x - currentArrow.start.x;
    const dy = currentArrow.end.y - currentArrow.start.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 2) {
        const nextLabelCode = String.fromCharCode(65 + arrows.length); // A, B, C...
        const newArrow: Arrow = {
            id: `arrow-${Date.now()}`,
            label: nextLabelCode,
            start: currentArrow.start,
            end: currentArrow.end
        };
        onArrowsChange([...arrows, newArrow]);
        onArrowSelect(newArrow.id);
    }
    
    setIsDrawing(false);
    setCurrentArrow(null);
  };

  const deleteArrow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onArrowsChange(arrows.filter(a => a.id !== id));
      if (selectedArrowId === id) onArrowSelect(null);
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-slate-100">
        <div className="p-2 bg-white border-b flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Canvas</span>
            {!imageUrl ? (
                 <>
                    <input 
                        type="file" 
                        id="guide-upload" 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/gif" // Guide image usually not PDF but let's stick to images
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            const token = localStorage.getItem('authToken');

                            try {
                                const response = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` },
                                    body: formData,
                                });
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    onImageChange(data.url);
                                } else {
                                    console.error('Upload failed');
                                    alert('Failed to upload file');
                                }
                            } catch (error) {
                                console.error('Error uploading:', error);
                                alert('Error uploading file');
                            }
                        }}
                    />
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => document.getElementById('guide-upload')?.click()}>
                            <Upload className="h-3 w-3 mr-1" /> Upload Image
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                             const url = prompt("Enter Image URL for Measure Guide");
                             if(url) onImageChange(url);
                        }}>
                             Link URL
                        </Button>
                    </div>
                 </>
            ) : (
                <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={() => onArrowsChange([])}>
                        <X className="h-3 w-3 mr-1" /> Remove Arrows
                    </Button>
                    <div className="w-px h-4 bg-slate-200 self-center"></div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500 hover:text-slate-700" onClick={() => onImageChange('')}>
                        Clear Image
                    </Button>
                </div>
            )}
        </div>
        
        <div 
            ref={containerRef}
            className="flex-1 relative cursor-crosshair select-none touch-none bg-slate-200/50"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setIsDrawing(false); setCurrentArrow(null); }}
        >
            {imageUrl ? (
                <img src={imageUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" alt="Guide" />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <MousePointer2 className="h-12 w-12 mb-2 opacity-20" />
                    <p>Load an image to start annotation</p>
                </div>
            )}

            {/* Render Arrows */}
            {imageUrl && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                        </marker>
                        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                        </marker>
                    </defs>
                    
                    {arrows.map(arrow => {
                        const isSelected = arrow.id === selectedArrowId;
                        return (
                            <g key={arrow.id} className="pointer-events-auto" onClick={(e) => { e.stopPropagation(); onArrowSelect(arrow.id); }}>
                                {/* Transparent wide line for easier clicking */}
                                <line 
                                    x1={`${arrow.start.x}%`} y1={`${arrow.start.y}%`} 
                                    x2={`${arrow.end.x}%`} y2={`${arrow.end.y}%`} 
                                    stroke="transparent" strokeWidth="10" 
                                    className="cursor-pointer"
                                />
                                {/* Visible line */}
                                <line 
                                    x1={`${arrow.start.x}%`} y1={`${arrow.start.y}%`} 
                                    x2={`${arrow.end.x}%`} y2={`${arrow.end.y}%`} 
                                    stroke={isSelected ? "#2563eb" : "#ef4444"} 
                                    strokeWidth="2" 
                                    markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                                />
                                {/* Label Bubble */}
                                <foreignObject 
                                    x={`${(arrow.start.x + arrow.end.x)/2 - 2.5}%`} 
                                    y={`${(arrow.start.y + arrow.end.y)/2 - 2.5}%`} 
                                    width="5%" height="5%"
                                    className="overflow-visible"
                                >
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer border transform -translate-x-1/2 -translate-y-1/2
                                        ${isSelected ? 'bg-blue-600 border-white' : 'bg-red-500 border-white'}
                                    `}>
                                        {arrow.label}
                                        {isSelected && (
                                            <div 
                                                className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-4 h-4 flex items-center justify-center border shadow-sm hover:scale-110"
                                                onClick={(e) => deleteArrow(arrow.id, e)}
                                            >
                                                <X className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}

                    {/* Current Drawing Arrow */}
                    {isDrawing && currentArrow && currentArrow.start && currentArrow.end && (
                        <line 
                            x1={`${currentArrow.start.x}%`} y1={`${currentArrow.start.y}%`} 
                            x2={`${currentArrow.end.x}%`} y2={`${currentArrow.end.y}%`} 
                            stroke="#ef4444" 
                            strokeWidth="2" 
                            strokeDasharray="4"
                        />
                    )}
                </svg>
            )}
        </div>
    </div>
  );
}
