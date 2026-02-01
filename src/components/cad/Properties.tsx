'use client';

import { Calculator, Scaling, Scissors, Ruler, MoveHorizontal, Activity, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { distance, getCubicBezierLength } from '@/lib/cad/geometry';

export default function PropertiesPanel({ selectedObjects }: { selectedObjects: any[] }) {
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
      <aside className="w-72 border-l bg-slate-50 p-6 flex flex-col gap-6 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
        <h2 className="font-bold text-xs uppercase tracking-widest text-slate-400">Properties</h2>
        <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <Ruler className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs italic">Select an object or 2 nodes</p>
        </div>
      </aside>
    );
  }

  // DETECT NODES
  const selectedNodes = selectedObjects.filter(o => (o as any).handleType === 'anchor');
  const isNodeSelected = selectedNodes.length > 0;
  const areTwoNodesSelected = selectedNodes.length === 2;
  
  let segmentInfo = null;
  if (areTwoNodesSelected) {
      const idxA = (selectedObjects[0] as any).cmdIndex;
      const idxB = (selectedObjects[1] as any).cmdIndex;
      const startIdx = Math.min(idxA, idxB);
      const endIdx = Math.max(idxA, idxB);

      // Check if they are adjacent
      if (endIdx - startIdx === 1) {
          const editor = (selectedObjects[0] as any).patternEditor;
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
        {areTwoNodesSelected && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                    {segmentInfo?.isCurve ? <Activity className="w-3 h-3" /> : <MoveHorizontal className="w-3 h-3" />} 
                    {segmentInfo ? 'Precision Length' : 'Straight Distance'}
                </h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>CURRENT</span>
                        <span>{Math.round(segmentInfo ? segmentInfo.currentLen : distance({x: selectedObjects[0].left!, y: selectedObjects[0].top!}, {x: selectedObjects[1].left!, y: selectedObjects[1].top!}))}mm</span>
                    </div>
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
                                    if (segmentInfo) {
                                        segmentInfo.editor.setSegmentLength(segmentInfo.endIdx, val);
                                    } else {
                                        const editor = (selectedObjects[0] as any).patternEditor;
                                        editor.adjustDistance((selectedObjects[0] as any).cmdIndex, (selectedObjects[1] as any).cmdIndex, val);
                                    }
                                }}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-blue-700 transition-colors"
                            >
                                Apply
                            </button>
                        </div>
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
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Industrial Grading
                </h3>
                <div className="grid grid-cols-4 gap-2">
                    {['S', 'M', 'L', 'XL'].map(size => (
                        <button 
                            key={size}
                            onClick={() => (selectedObject as any)._editor.grade(size)}
                            className="py-2 bg-white hover:bg-purple-600 hover:text-white border border-purple-200 rounded text-[10px] font-black transition-all"
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-purple-400 font-medium italic">* Grades based on Standard T-Shirt Sloper deltas</p>
            </div>
        )}

        {isPattern && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                <h3 className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                    <Scaling className="w-3 h-3" /> Smart Gen (mm)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.keys(measurements).map(key => (
                        <div key={key} className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">{key}</label>
                            <input 
                                type="number"
                                className="w-full bg-white border border-blue-200 rounded px-2 py-1 text-xs font-bold text-slate-700"
                                value={(measurements as any)[key]}
                                onChange={(e) => setMeasurements({...measurements, [key]: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    ))}
                </div>
                <button 
                    onClick={() => (selectedObject as any)._editor.applyParametricMeasurements(measurements)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-[10px] font-black transition-all shadow-md mt-2"
                >
                    Drive Pattern Logic
                </button>
            </div>
        )}

        {/* TRANSFORMS */}
        {!areTwoNodesSelected && selectedObject && (
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
