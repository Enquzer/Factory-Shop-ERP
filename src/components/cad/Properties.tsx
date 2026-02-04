'use client';

import { Calculator, Scaling, Scissors, Ruler, MoveHorizontal, Activity, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { distance, getCubicBezierLength } from '@/lib/cad/geometry';

export default function PropertiesPanel({ 
    selectedObjects, 
    gridSettings = { showGrid: true, gridSize: 20, snappingConfig: { grid: true, points: true, segments: true, gridSize: 20 } },
    onGridSettingChange,
    patternLibrary = [],
    onPullPattern,
    activeGradingSize = 'M',
    onGradingSizeChange
}: { 
    selectedObjects: any[], 
    gridSettings?: any,
    onGridSettingChange?: (key: string, val: any) => void,
    patternLibrary?: any[],
    onPullPattern?: (pattern: any) => void,
    activeGradingSize?: string,
    onGradingSizeChange?: (size: string) => void
}) {
  const [targetDist, setTargetDist] = useState<string>('');
  const [localPosX, setLocalPosX] = useState('');
  const [localPosY, setLocalPosY] = useState('');
  const [localWidth, setLocalWidth] = useState('');
  const [localHeight, setLocalHeight] = useState('');
  const [measurements, setMeasurements] = useState({
      bust: 920,
      waist: 740,
      hip: 980,
      length: 1800
  });

  const selectedObject = selectedObjects[0];

  useEffect(() => {
    if (selectedObject) {
      const activeEl = document.activeElement;
      const isTyping = activeEl instanceof HTMLInputElement && activeEl.type === 'number';
      
      if (!isTyping) {
        setLocalPosX(Math.round(selectedObject.left || 0).toString());
        setLocalPosY(Math.round(selectedObject.top || 0).toString());
        setLocalWidth(Math.round(selectedObject.width * (selectedObject.scaleX || 1)).toString());
        setLocalHeight(Math.round(selectedObject.height * (selectedObject.scaleY || 1)).toString());
      }
    } else {
      setLocalPosX(''); setLocalPosY(''); setLocalWidth(''); setLocalHeight('');
    }
  }, [selectedObject]);

  if (selectedObjects.length === 0) {
    return (
      <aside className="w-80 border-l bg-slate-50 p-5 flex flex-col gap-6 shadow-[-4px_0_10px_rgba(0,0,0,0.02)] overflow-y-auto">
        <div className="space-y-4">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Scaling className="w-3 h-3" /> Grading Rules (Target)
            </h2>
            <div className="grid grid-cols-3 gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                    <button 
                        key={size}
                        onClick={() => onGradingSizeChange?.(size)}
                        className={`py-2 rounded-lg text-[10px] font-black transition-all border shadow-sm ${
                            activeGradingSize === size 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                        }`}
                    >
                        {size}
                    </button>
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Layers className="w-3 h-3" /> Pattern Library ({patternLibrary.length})
            </h2>
            
            {patternLibrary.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-[10px] text-slate-400 italic">No patterns designated yet.<br/>Use 'Designate' tool to save panels.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2">
                    {patternLibrary.map(item => (
                        <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm hover:border-blue-400 transition-all group">
                             <div className="shrink-0 w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 p-1">
                                <svg viewBox="0 0 1000 1000" className="w-full h-full text-blue-500 opacity-60">
                                    <path d={item.path} fill="currentColor" transform="scale(0.5) translate(500, 500)" />
                                </svg>
                             </div>
                             <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 truncate">{item.name}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Size: {item.size}</p>
                             </div>
                             <button 
                                onClick={() => onPullPattern?.(item)}
                                className="hidden group-hover:flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                                title="Pull to Canvas"
                             >
                                <MoveHorizontal className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <h2 className="font-black text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-2">Environment</h2>
        
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Scaling className="w-3 h-3" /> Grid Settings
            </h3>
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Show Grid</span>
                <input 
                    type="checkbox" 
                    checked={gridSettings.showGrid} 
                    onChange={(e) => onGridSettingChange?.('showGrid', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Grid Size (mm)</label>
                <div className="flex gap-2">
                    <input 
                        type="number" 
                        value={gridSettings.gridSize} 
                        onChange={(e) => onGridSettingChange?.('gridSize', parseInt(e.target.value) || 20)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-bold text-slate-700"
                    />
                </div>
            </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3" /> Snapping
            </h3>
            <div className="space-y-3">
                {[
                    { id: 'grid', label: 'Snap to Grid' },
                    { id: 'points', label: 'Snap to Points' },
                    { id: 'segments', label: 'Snap to Segments' }
                ].map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                        <input 
                            type="checkbox" 
                            checked={gridSettings.snappingConfig[item.id]} 
                            onChange={(e) => onGridSettingChange?.('snapping', { [item.id]: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                ))}
            </div>
        </div>

        <div className="mt-auto flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl text-slate-300">
            <Ruler className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] text-center italic">Selection Properties will appear here when an object is active.</p>
        </div>
      </aside>
    );
  }

  const selectedNodes = selectedObjects.filter(o => (o as any).handleType === 'anchor');
  const isNodeSelected = selectedNodes.length > 0;
  const areTwoNodesSelected = selectedNodes.length === 2;
  
  let segmentInfo = null;
  if (areTwoNodesSelected) {
      const idxA = (selectedNodes[0] as any).cmdIndex;
      const idxB = (selectedNodes[1] as any).cmdIndex;
      const startIdx = Math.min(idxA, idxB);
      const endIdx = Math.max(idxA, idxB);

      // Check if they are adjacent
      if (endIdx - startIdx === 1) {
          const editor = (selectedNodes[0] as any).patternEditor;
          const pathArr = editor.path.path as any[];
          const cmd = pathArr[endIdx];
          const prevCmd = pathArr[startIdx];
          const p0 = { x: prevCmd[prevCmd.length-2], y: prevCmd[prevCmd.length-1] };
          const p1 = { x: cmd[cmd.length-2], y: cmd[cmd.length-1] };

          let currentLen = 0;
          let isCurve = false;
          if (cmd[0] === 'L') {
              currentLen = distance(p0, p1);
          } else if (cmd[0] === 'C') {
              isCurve = true;
              currentLen = getCubicBezierLength(p0, {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, p1);
          }

          const labelA = editor.pointLabels[startIdx];
          const labelB = editor.pointLabels[endIdx];
          const segmentLabel = (labelA && labelB) ? `${labelA} to ${labelB}` : (labelB || labelA || 'Custom Segment');

          segmentInfo = { endIdx, currentLen, isCurve, editor, label: segmentLabel };
      }
  }

  const isSegmentHandle = selectedObject && (selectedObject as any).handleType === 'segment';
  if (isSegmentHandle && !segmentInfo) {
      const editor = (selectedObject as any).patternEditor;
      const [startIdx, endIdx] = (selectedObject as any).indices;
      const pathArr = editor.path.path as any[];
      const cmd = pathArr[endIdx];
      const prevCmd = pathArr[startIdx];
      const p0 = { x: prevCmd[prevCmd.length-2], y: prevCmd[prevCmd.length-1] };
      const p1 = { x: cmd[cmd.length-2], y: cmd[cmd.length-1] };

      let currentLen = 0;
      if (cmd[0] === 'L') currentLen = distance(p0, p1);
      else if (cmd[0] === 'C') currentLen = getCubicBezierLength(p0, {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, p1);

      const labelA = editor.pointLabels[startIdx];
      const labelB = editor.pointLabels[endIdx];
      const segmentLabel = (labelA && labelB) ? `${labelA} to ${labelB}` : (labelB || labelA || 'Custom Segment');

      segmentInfo = { endIdx, currentLen, isCurve: cmd[0] === 'C', editor, label: segmentLabel };
  }

  const isPattern = (selectedObject?.type === 'path') && (selectedObject as any)._editor;

  const handleTransformChange = (key: string, value: string) => {
      const val = parseFloat(value);
      if (key === 'left') setLocalPosX(value);
      if (key === 'top') setLocalPosY(value);
      if (key === 'width') setLocalWidth(value);
      if (key === 'height') setLocalHeight(value);

      if (!isNaN(val)) {
          if (key === 'left') selectedObject.set({ left: val });
          else if (key === 'top') selectedObject.set({ top: val });
          else if (key === 'width' && val > 0) {
              if (selectedObject.type === 'rect') selectedObject.set({ width: val / (selectedObject.scaleX || 1) });
              else selectedObject.set({ scaleX: val / selectedObject.width });
          }
          else if (key === 'height' && val > 0) {
              if (selectedObject.type === 'rect') selectedObject.set({ height: val / (selectedObject.scaleY || 1) });
              else selectedObject.set({ scaleY: val / selectedObject.height });
          }
          selectedObject.setCoords();
          selectedObject.canvas?.requestRenderAll();
      }
  };

  return (
    <aside className="w-72 border-l bg-white p-6 flex flex-col gap-6 overflow-y-auto shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
      <div className="space-y-1">
        <h2 className="font-black text-xs uppercase tracking-widest text-slate-400">Inspector</h2>
        <p className="text-sm font-bold text-slate-800 capitalize">
            {segmentInfo ? segmentInfo.label : (areTwoNodesSelected ? 'Distance Tool' : `${selectedObject?.type || 'Unknown'} Object`)}
        </p>
      </div>
      
      <div className="space-y-5">
        {/* SEGMENT / DISTANCE UI */}
        {(areTwoNodesSelected || isSegmentHandle) && segmentInfo && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                    {segmentInfo?.isCurve ? <Activity className="w-3 h-3" /> : <MoveHorizontal className="w-3 h-3" />} 
                    {isSegmentHandle ? 'Segment Info' : 'Precision Length'}
                </h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>CURRENT</span>
                        <span>{Math.round(segmentInfo.currentLen)}mm</span>
                    </div>
                    
                    {!isSegmentHandle && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{segmentInfo?.isCurve ? 'Arc Length (mm)' : 'Target Length (mm)'}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    className="w-full bg-white border border-blue-200 rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                                    value={targetDist}
                                    onChange={(e) => setTargetDist(e.target.value)}
                                    placeholder="e.g. 450"
                                />
                                <button 
                                    onClick={() => {
                                        const val = parseFloat(targetDist);
                                        if (isNaN(val)) return;
                                        segmentInfo.editor.setSegmentLength(segmentInfo.endIdx, val);
                                    }}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => segmentInfo.editor.splitSegment(segmentInfo.endIdx)}
                            className="w-full py-2 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-[9px] font-black transition-all flex items-center justify-center gap-2"
                        >
                            <Scissors className="w-3 h-3" /> Split (Node)
                        </button>
                        <button 
                            onClick={() => {
                                const dist = prompt('Enter Parallel Distance (mm):', '20');
                                if (dist) segmentInfo.editor.makeParallel(segmentInfo.endIdx, parseFloat(dist));
                            }}
                            className="w-full py-2 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-[9px] font-black transition-all flex items-center justify-center gap-2"
                        >
                            <Layers className="w-3 h-3" /> Make Parallel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {isPattern && (
            <div className="space-y-2">
                <button 
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                    onClick={() => (selectedObject as any)._editor.toggleEditMode()}
                >
                    <Scaling className="w-3.5 h-3.5" />
                    {selectedObject.isEditing ? 'Exit Edit Mode' : 'Edit Nodes (A)'}
                </button>
            </div>
        )}

        {isNodeSelected && (
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                    <Activity className="w-3 h-3" /> Node Type
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        className="w-full py-2 bg-white hover:bg-orange-600 hover:text-white border border-orange-200 rounded text-[10px] font-black transition-all flex items-center justify-center gap-2"
                        onClick={() => {
                            selectedNodes.forEach(node => {
                                (node as any).patternEditor.toggleNodeType((node as any).cmdIndex);
                            });
                        }}
                    >
                        Convert to Curve / Straight
                    </button>
                </div>
                <p className="text-[9px] text-orange-400 font-medium italic">Changes the segment leading to the selected node.</p>
            </div>
        )}

        {isPattern && (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Scaling className="w-3 h-3" /> Pattern Engineering
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    <button 
                        className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[11px] font-bold text-slate-700 transition-all flex items-center justify-center gap-2"
                        onClick={() => {
                            const area = (selectedObject as any)._editor.calculateConsumption();
                            alert(`Fabric Consumption: ${area.toFixed(4)} m²`);
                        }}
                    >
                        <Calculator className="w-3 h-3 text-green-500" /> Calc Consumption
                    </button>
                </div>
            </div>
        )}

        {isPattern && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Ruler className="w-3 h-3" /> Stroke Appearance
                </h3>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Stroke Width (px)</label>
                        <input 
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.5"
                            className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-bold text-slate-700"
                            value={selectedObject.strokeWidth || 2}
                            onChange={(e) => {
                                selectedObject.set({ strokeWidth: parseFloat(e.target.value) || 2 });
                                selectedObject.canvas?.requestRenderAll();
                            }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Stroke Color</label>
                        <div className="flex gap-2">
                            <input 
                                type="color"
                                className="w-12 h-8 rounded border border-slate-200 cursor-pointer"
                                value={selectedObject.stroke || '#666666'}
                                onChange={(e) => {
                                    selectedObject.set({ stroke: e.target.value });
                                    selectedObject.canvas?.requestRenderAll();
                                }}
                            />
                            <input 
                                type="text"
                                className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-mono text-slate-700"
                                value={selectedObject.stroke || '#666666'}
                                onChange={(e) => {
                                    selectedObject.set({ stroke: e.target.value });
                                    selectedObject.canvas?.requestRenderAll();
                                }}
                                placeholder="#666666"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TRANSFORMS */}
        {!areTwoNodesSelected && !isSegmentHandle && selectedObject && (
            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Transforms</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">PosX</label>
                        <input type="number" className="w-full bg-slate-50 border border-transparent rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-200 outline-none transition-all" value={localPosX} onChange={(e) => handleTransformChange('left', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">PosY</label>
                        <input type="number" className="w-full bg-slate-50 border border-transparent rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-200 outline-none transition-all" value={localPosY} onChange={(e) => handleTransformChange('top', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Width</label>
                        <input type="number" className="w-full bg-slate-50 border border-transparent rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-200 outline-none transition-all" value={localWidth} onChange={(e) => handleTransformChange('width', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Height</label>
                        <input type="number" className="w-full bg-slate-50 border border-transparent rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-200 outline-none transition-all" value={localHeight} onChange={(e) => handleTransformChange('height', e.target.value)} />
                    </div>
                </div>
            </div>
        )}
      </div>
    </aside>
  );
}
