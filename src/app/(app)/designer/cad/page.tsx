'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import Toolbar from '@/components/cad/Toolbar';
import PropertiesPanel from '@/components/cad/Properties';
import * as fabric from 'fabric';
import { PatternEditor } from '@/lib/cad/PatternEditor';
import { jsPDF } from 'jspdf';
import { BooleanTools } from '@/lib/cad/boolean';
import { STYLE_LIBRARY, GENERATORS, Preset } from '@/lib/cad/presets-data';
import { ChevronDown, Folder, Sparkles } from 'lucide-react';
import { MeasurementPopup } from '@/components/cad/MeasurementPopup';

const Canvas = dynamic(() => import('@/components/cad/Canvas'), {
  ssr: false,
  loading: () => <p className="flex items-center justify-center h-full text-slate-400">Loading CAD Engine...</p>,
});

export default function CADToolPage() {
  const [activeTool, setActiveTool] = useState('select');
  const [selectedObjects, setSelectedObjects] = useState<any[]>([]);
  const [canvasInstance, setCanvasInstance] = useState<any>(null);
   const [activeStyle, setActiveStyle] = useState<string | null>(null);
   const editors = useRef<Map<string, PatternEditor>>(new Map());
   const [popupData, setPopupData] = useState<{ endIdx: number, currentLen: number, pos: { x: number, y: number } } | null>(null);

  const handleCanvasReady = (canvas: any) => {
    setCanvasInstance(canvas);
    const updateSelection = () => {
        const active = canvas.getActiveObjects();
        setSelectedObjects([...active]); // Spread to force new array reference
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setSelectedObjects([]));
    
    // Live updates during transform
    canvas.on('object:moving', updateSelection);
    canvas.on('object:scaling', updateSelection);
    canvas.on('object:rotating', updateSelection);

    canvas.on('mouse:wheel', (opt: any) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    canvas.on('mouse:down', (options: any) => {
        if (activeTool === 'notch' && options.target && (options.target as any).patternEditor) {
            const editor = (options.target as any).patternEditor as PatternEditor;
            const cmdIndex = (options.target as any).cmdIndex;
            if (cmdIndex !== undefined) {
                editor.addNotchAt(cmdIndex);
                canvas.requestRenderAll();
            }
        }
    });
  };

  const handleToolSelect = (tool: string) => {
    setActiveTool(tool);
    if (!canvasInstance) return;

    canvasInstance.isDrawingMode = false;
    canvasInstance.selection = true;

    if (tool === 'rect') {
        const rect = new fabric.Rect({ left: 100, top: 100, fill: '#cccccc', width: 100, height: 100, opacity: 0.8, stroke: '#666666', strokeWidth: 1 });
        canvasInstance.add(rect);
        canvasInstance.setActiveObject(rect);
        setActiveTool('select');
    } else if (tool === 'mirror') {
        const activeObj = canvasInstance.getActiveObject();
        if (activeObj && (activeObj as any)._editor) (activeObj as any)._editor.mirror();
        setActiveTool('select');
    } else if (tool === 'pen') {
        canvasInstance.isDrawingMode = true;
        canvasInstance.freeDrawingBrush = new fabric.PencilBrush(canvasInstance);
        canvasInstance.freeDrawingBrush.width = 2;
        canvasInstance.freeDrawingBrush.color = "black";
    } else if (tool === 'union' || tool === 'subtract') {
        handleBooleanOperation(tool);
        setActiveTool('select');
    } else if (tool === 'zoom-in') {
        const zoom = canvasInstance.getZoom();
        canvasInstance.setZoom(zoom * 1.2);
        setActiveTool('select');
    } else if (tool === 'zoom-out') {
        const zoom = canvasInstance.getZoom();
        canvasInstance.setZoom(zoom / 1.2);
        setActiveTool('select');
    } else if (tool === 'fit-all') {
        const objects = canvasInstance.getObjects();
        if (objects.length > 0) {
            const group = new fabric.Group(objects);
            const rect = group.getBoundingRect();
            const zoom = Math.min(
                canvasInstance.width / (rect.width * 1.2),
                canvasInstance.height / (rect.height * 1.2)
            );
            canvasInstance.setZoom(zoom);
            
            // Center viewport on the bounds
            const vpt = canvasInstance.viewportTransform;
            vpt[4] = (canvasInstance.width / 2) - (rect.left + rect.width / 2) * zoom;
            vpt[5] = (canvasInstance.height / 2) - (rect.top + rect.height / 2) * zoom;
            canvasInstance.requestRenderAll();
        }
        setActiveTool('select');
    } else if (tool === 'delete') {
        const activeObj = canvasInstance.getActiveObject();
        if (activeObj) { canvasInstance.remove(activeObj); canvasInstance.discardActiveObject(); canvasInstance.requestRenderAll(); }
        setActiveTool('select');
    }
  };

  const handleApplyPreset = (preset: Preset, key: string) => {
    if (!canvasInstance) return;

    let pathString = '';
    const pointLabels: Record<number, string> = {};

    preset.path.forEach((p, i) => {
        if (p.type === 'M') pathString += `M ${p.x} ${p.y} `;
        else if (p.type === 'L') pathString += `L ${p.x} ${p.y} `;
        else if (p.type === 'C') pathString += `C ${p.cp1x} ${p.cp1y} ${p.cp2x} ${p.cp2y} ${p.x} ${p.y} `;
        else if (p.type === 'Z') pathString += 'Z';
        if (p.label) pointLabels[i] = p.label;
    });

    const path = new fabric.Path(pathString);
    const id = Math.random().toString(36).substr(2, 9);
    (path as any).id = id;
    (path as any).presetKey = key;
    (path as any).counterpartId = preset.counterpart ? 
        (Array.from(editors.current.values()).find(e => (e.path as any).presetKey === preset.counterpart)?.path as any)?.id : null;

    const joinPoints: number[] = [];
    preset.path.forEach((p, i) => {
        if (p.isJoin) joinPoints.push(i);
    });

    const editor = new PatternEditor(canvasInstance, path, pointLabels, joinPoints);
    editor.onSegmentClick = (data) => setPopupData(data);
    (path as any)._editor = editor;
    editors.current.set(id, editor);
    
    path.set({ left: 300, top: 200 });
    canvasInstance.add(path);
    (path as any)._toggleEdit = () => editor.toggleEditMode();
    canvasInstance.setActiveObject(path);
    canvasInstance.requestRenderAll();
  };

  const handleBooleanOperation = (type: 'union' | 'subtract') => {
      const activeObjects = canvasInstance.getActiveObjects();
      if (activeObjects.length < 2) return alert('Select 2 shapes');
      
      const [objA, objB] = activeObjects;
      const pathA = objA instanceof fabric.Path ? objA.path : (objA as any).toPath?.().path;
      const pathB = objB instanceof fabric.Path ? objB.path : (objB as any).toPath?.().path;
      
      const resultPath = type === 'union' ? BooleanTools.union(pathA as any, pathB as any) : BooleanTools.subtract(pathA as any, pathB as any);
      if (resultPath) {
          const newPath = new fabric.Path(resultPath as any);
          canvasInstance.remove(objA, objB);
          canvasInstance.add(newPath);
          canvasInstance.setActiveObject(newPath);
          canvasInstance.requestRenderAll();
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const key = e.key.toLowerCase();
        if (key === 'v') setActiveTool('select');
        if (key === 'a') setActiveTool('direct');
        if (key === 'p') handleToolSelect('pen');
        if (key === 'delete' || key === 'backspace') {
            const activeObj = canvasInstance?.getActiveObject();
            if (activeObj && !activeObj.isEditing) {
                 canvasInstance.remove(activeObj);
                 canvasInstance.discardActiveObject();
                 canvasInstance.requestRenderAll();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasInstance]);

  useEffect(() => {
    if (!canvasInstance) return;
    if (activeTool === 'direct') {
        const obj = canvasInstance.getActiveObject();
        if (obj && (obj as any)._toggleEdit && !obj.isEditing) (obj as any)._toggleEdit();
    } else {
        canvasInstance.getObjects().forEach((obj: any) => { if (obj.isEditing && obj._toggleEdit) obj._toggleEdit(); });
    }
  }, [activeTool, canvasInstance]);

  const handleSaveAsComponent = async () => {
      if (!canvasInstance || selectedObjects.length === 0) return alert('Select an object to save as component');
      const selectedObject = selectedObjects[0];
      const name = prompt('Enter component name:');
      if (!name) return;
      
      const styleCategory = prompt('Enter Style Category (e.g. T-Shirt, Trousers):', 'General');
      
      try {
          const data = JSON.stringify(selectedObject.toJSON());
          const response = await fetch('/api/cad/components', {
              method: 'POST',
              body: JSON.stringify({ name, data, type: 'custom', category: styleCategory }),
              headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
              alert('Component saved to library!');
              // Refresh custom components
              fetch('/api/cad/components')
                .then(res => res.json())
                .then(data => setCustomComponents(data));
          }
      } catch (e) { alert('Save failed'); }
  };

  const [customComponents, setCustomComponents] = useState<any[]>([]);

  useEffect(() => {
      fetch('/api/cad/components')
        .then(res => res.json())
        .then(data => setCustomComponents(data))
        .catch(e => console.error('Failed to load custom components'));
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans">
      <header className="h-28 border-b bg-white flex flex-col px-6 justify-center shrink-0 shadow-sm z-20">
        <div className="flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-200">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">Carement <span className="text-blue-600">Pro-CAD</span></h1>
                <div className="flex items-center bg-green-50 px-2 py-0.5 rounded border border-green-100 gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Precision Active</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => PatternEditor.nestItems(canvasInstance)}
                    className="px-5 py-2 text-xs bg-green-600 hover:bg-green-700 text-white border border-green-500 rounded-full font-bold transition-all shadow-sm"
                >
                    Auto-Nest Pieces
                </button>
                <button onClick={handleSaveAsComponent} className="px-5 py-2 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-full font-bold transition-all shadow-sm">Save as Component</button>
                <button 
                    onClick={async () => {
                        // Check seam status across all editors
                        let maxDiff = 0;
                        editors.current.forEach(ed => {
                            const stats = ed.getSeamStatus();
                            stats.forEach(s => maxDiff = Math.max(maxDiff, s.diff));
                        });

                        if (maxDiff > 3) {
                            return alert(`EXPORT BLOCKED: Seam mismatch is too high (${maxDiff.toFixed(1)}mm). Please fix the shoulder/armhole alignment first.`);
                        }

                        await PatternEditor.exportToPDF(canvasInstance, 'production_pattern.pdf');
                    }}
                    className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold shadow-md transition-all"
                >
                    Export 1:1 PDF
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-6 overflow-x-auto pb-1 no-scrollbar">
            {Object.keys(STYLE_LIBRARY).map(styleKey => (
                <div key={styleKey} className="relative group">
                    <button 
                        onClick={() => setActiveStyle(activeStyle === styleKey ? null : styleKey)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${activeStyle === styleKey ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'}`}
                    >
                        <Folder className="w-4 h-4" />
                        <span className="text-xs font-bold whitespace-nowrap">{STYLE_LIBRARY[styleKey].name}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${activeStyle === styleKey ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {activeStyle === styleKey && (
                        <div className="absolute top-8 left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="space-y-1">
                                {Object.keys(STYLE_LIBRARY[styleKey].components).map(compKey => {
                                    const comp = STYLE_LIBRARY[styleKey].components[compKey];
                                    return (
                                        <button 
                                            key={compKey} 
                                            onClick={() => { handleApplyPreset(comp, compKey); setActiveStyle(null); }}
                                            className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all"
                                        >
                                            {comp.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="relative group">
                <button 
                    onClick={() => setActiveStyle(activeStyle === 'custom' ? null : 'custom')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${activeStyle === 'custom' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'}`}
                >
                    <Folder className="w-4 h-4" />
                    <span className="text-xs font-bold whitespace-nowrap">Custom Library</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${activeStyle === 'custom' ? 'rotate-180' : ''}`} />
                </button>
                {activeStyle === 'custom' && (
                    <div className="absolute top-8 left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-1">
                            {customComponents.length === 0 && <p className="text-[10px] text-slate-400 p-2 italic">No custom components</p>}
                            {customComponents.map(comp => (
                                <button 
                                    key={comp.id} 
                                    onClick={() => { 
                                        const preset = { name: comp.name, path: JSON.parse(comp.data).path };
                                        handleApplyPreset(preset as any, comp.id); 
                                        setActiveStyle(null); 
                                    }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-all"
                                >
                                    {comp.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter self-center">Smart Gen:</span>
                {Object.keys(GENERATORS).map(genKey => (
                    <button key={genKey} onClick={() => handleApplyPreset(GENERATORS[genKey](), genKey)} className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm uppercase tracking-widest">
                        {genKey}
                    </button>
                ))}
            </div>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
        <div className="flex-1 relative bg-slate-200/40">
          <Canvas onCanvasReady={handleCanvasReady} />
          
          {/* Seam Status Badge Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
              {Array.from(editors.current.values()).map((ed, idx) => {
                  const stats = ed.getSeamStatus();
                  return stats.map((s, sIdx) => (
                      <div key={`${idx}-${sIdx}`} className={`px-4 py-2 rounded-lg shadow-lg border-l-4 font-bold text-[10px] uppercase tracking-wider backdrop-blur-md ${
                          s.status === 'ok' ? 'bg-green-50/80 border-green-500 text-green-700' : 
                          (s.status === 'warn' ? 'bg-orange-50/80 border-orange-500 text-orange-700' : 'bg-red-50/80 border-red-500 text-red-700 animate-pulse')
                      }`}>
                          {s.label}: {s.diff.toFixed(1)}mm {s.status === 'fail' ? '(BLOCKING)' : ''}
                      </div>
                  ));
              })}
          </div>

          {popupData && (
              <MeasurementPopup 
                  initialValue={popupData.currentLen}
                  position={popupData.pos}
                  onConfirm={(newVal) => {
                      const activeObj = canvasInstance.getActiveObject();
                      if (activeObj) {
                        const editor = (activeObj as any)._editor || (activeObj as any).patternEditor;
                        if (editor) editor.setSegmentLength(popupData.endIdx, newVal);
                      }
                      setPopupData(null);
                  }}
                  onCancel={() => setPopupData(null)}
              />
          )}
        </div>
        <PropertiesPanel selectedObjects={selectedObjects} />
      </main>
    </div>
  );
}
