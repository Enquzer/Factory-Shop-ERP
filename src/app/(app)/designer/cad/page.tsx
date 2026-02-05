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
import { ChevronDown, Folder, Sparkles, Layers, Scaling } from 'lucide-react';
import { MeasurementPopup } from '@/components/cad/MeasurementPopup';
import NestingDialog from '@/components/cad/NestingDialog';

const getSceneSpacePath = (obj: any): any[][] | null => {
    if (!obj) return null;
    let pathArr: any[] | null = null;
    
    if (obj.type === 'path' || obj instanceof fabric.Path) pathArr = obj.path;
    else if (obj.type === 'rect' || obj.type === 'polygon') pathArr = obj.toPath?.().path;
    else if (obj.type === 'group') return null; 

    if (!pathArr) return null;

    // Use calcTransformMatrix and invert the viewport transform if necessary
    // to get true scene/design space coordinates.
    const matrix = obj.calcTransformMatrix();
    const canvas = obj.canvas;
    let finalMatrix = matrix;
    
    if (canvas && canvas.viewportTransform) {
        // If the matrix already includes viewport, we'd need to subtract it.
        // Usually calcTransformMatrix does NOT include viewport unless specified.
        // However, we want to be absolutely sure we're in "Scene Space".
    }

    const offset = obj.pathOffset || { x: 0, y: 0 };
    
    return pathArr.map((cmd: any) => {
        const newCmd = [...cmd];
        for (let i = 1; i < cmd.length; i += 2) {
            const point = fabric.util.transformPoint({ 
                x: cmd[i] - offset.x, 
                y: cmd[i+1] - offset.y 
            } as any, matrix);
            newCmd[i] = point.x;
            newCmd[i+1] = point.y;
        }
        return newCmd;
    });
};

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
  const [popupData, setPopupData] = useState<{ endIdx: number, currentLen: number, pos: { x: number, y: number }, editor: PatternEditor } | null>(null);

  // Snapping & Grid State
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [snappingConfig, setSnappingConfig] = useState({
    grid: true,
    points: true,
    segments: true,
    gridSize: 20
  });

  const [isNestingOpen, setIsNestingOpen] = useState(false);
  const [showGradingNest, setShowGradingNest] = useState(false);
  const [patternLibrary, setPatternLibrary] = useState<any[]>([]);
  const [activeGradingSize, setActiveGradingSize] = useState('M');

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


  };

  // Drawing State (Refs)
  const draftCommands = useRef<any[]>([]); // Stores {type: 'M'|'L'|'Q', x, y, cx?, cy?}
  const curveState = useRef<{ step: number, p1?: {x:number, y:number}, p2?: {x:number, y:number} }>({ step: 0 });
  const tempPath = useRef<fabric.Path | null>(null);
  const designateCollection = useRef<fabric.Object[]>([]);
  const snapMarker = useRef<fabric.Circle | null>(null);

  // Drawing Logic Hook
  useEffect(() => {
      if (!canvasInstance) return;

      const updateTempPath = (cursorPos?: {x: number, y: number}) => {
        if (!canvasInstance || draftCommands.current.length === 0) return;
        
        let d = '';
        draftCommands.current.forEach(cmd => {
            if (cmd.type === 'M') d += `M ${cmd.x} ${cmd.y} `;
            else if (cmd.type === 'L') d += `L ${cmd.x} ${cmd.y} `;
            else if (cmd.type === 'Q') d += `Q ${cmd.cx} ${cmd.cy} ${cmd.x} ${cmd.y} `;
        });
        
        // Ghost Segment
        if (cursorPos) {
            const lastCmd = draftCommands.current[draftCommands.current.length - 1];
            const startX = lastCmd.x;
            const startY = lastCmd.y;

            if (activeTool === 'curve') {
                if (curveState.current.step === 1) { // Waiting for End Point (Click 2)
                    d += `L ${cursorPos.x} ${cursorPos.y}`;
                } else if (curveState.current.step === 2 && curveState.current.p2) { // Adjusting Control (Click 3)
                    const p2 = curveState.current.p2;
                    d += `Q ${cursorPos.x} ${cursorPos.y} ${p2.x} ${p2.y}`;
                }
            } else {
                 d += `L ${cursorPos.x} ${cursorPos.y}`;
            }
        }

        if (tempPath.current) canvasInstance.remove(tempPath.current);
        
        tempPath.current = new fabric.Path(d, {
            stroke: '#3b82f6',
            strokeWidth: 2,
            fill: 'transparent', // Wireframe preview
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5]
        });
        (tempPath.current as any).isTemp = true;
        canvasInstance.add(tempPath.current);
        canvasInstance.requestRenderAll();
    };

    const finishDrawing = () => {
        if (draftCommands.current.length < 2) {
             draftCommands.current = [];
             curveState.current = { step: 0 };
             if (tempPath.current) canvasInstance.remove(tempPath.current);
             return;
        }

        if (draftCommands.current.length === 0) return;

        // --- Manual Normalization Strategy ---
        // 1. Find the top-left bounds of the user's drawing (Scene Coordinates)
        let minX = Infinity, minY = Infinity;
        draftCommands.current.forEach(pt => {
             if (pt.x < minX) minX = pt.x;
             if (pt.y < minY) minY = pt.y;
             if (pt.type === 'Q' && pt.cx !== undefined && pt.cy !== undefined) {
                 if (pt.cx < minX) minX = pt.cx;
                 if (pt.cy < minY) minY = pt.cy;
             }
        });

        // 2. Generate Path Data relative to this Top-Left (Local Coordinates)
        let pathString = '';
        draftCommands.current.forEach(cmd => {
            if (cmd.type === 'M') pathString += `M ${cmd.x} ${cmd.y} `;
            if (cmd.type === 'M') {
                pathString += `M ${cmd.x - minX} ${cmd.y - minY} `;
            } else if (cmd.type === 'L') {
                pathString += `L ${cmd.x - minX} ${cmd.y - minY} `;
            } else if (cmd.type === 'Q') {
                pathString += `Q ${cmd.cx! - minX} ${cmd.cy! - minY} ${cmd.x - minX} ${cmd.y - minY} `;
            } else if (cmd.type === 'Z') {
                pathString += 'Z ';
            }
        });

        // Close path - add line back to start if close to starting point
        const first = draftCommands.current[0];
        const last = draftCommands.current[draftCommands.current.length-1];
        const distanceToStart = Math.hypot(first.x - last.x, first.y - last.y);
        
        if (distanceToStart < 15 && distanceToStart > 0.1) {
            // Add explicit line back to start point for proper closure
            pathString += `L ${first.x - minX} ${first.y - minY} `;
        }
        
        // Add Z command to close the path
        if (draftCommands.current.length > 2) {
             pathString += 'Z';
        }

        // 3. Create Path explicitely at that position
        const path = new fabric.Path(pathString, {
            left: minX,
            top: minY,
            fill: 'transparent',
            stroke: '#2563eb',
            strokeWidth: 2,
            objectCaching: false,
            // Force origin to match our logic
            originX: 'left',
            originY: 'top'
        });

        const id = Math.random().toString(36).substr(2, 9);
        (path as any).id = id;
        
        // Initialize editor - this will automatically ground the path
        const editor = new PatternEditor(canvasInstance, path, {}, []);
        editors.current.set(id, editor);
        
        // Add to canvas
        canvasInstance.add(path);
        
        // Clean up drawing state
        draftCommands.current = [];
        curveState.current = { step: 0 };
        if (tempPath.current) canvasInstance.remove(tempPath.current);
        tempPath.current = null;
        
        // Finalize position
        path.setCoords();
        canvasInstance.requestRenderAll();
        
        // Defer selection to prevent accidental drag from the final click
        setTimeout(() => {
            canvasInstance.setActiveObject(path);
            setActiveTool('select');
            canvasInstance.requestRenderAll();
        }, 50);
    };

    const finalizeDesignation = () => {
        if (!canvasInstance || designateCollection.current.length === 0) return;

        const name = prompt("Enter Pattern Panel Name (e.g. Front Panel, Sleeve):", "Front Panel");
        if (name === null) { 
            designateCollection.current.forEach(o => {
                if ((o as any).isDesignatedCell) {
                    canvasInstance.remove(o);
                } else {
                    const isEdited = (o as any)._editor;
                    o.set({ fill: 'transparent', stroke: isEdited ? '#2563eb' : (o.stroke || '#666666'), backgroundColor: '' });
                }
            });
            designateCollection.current = [];
            canvasInstance.requestRenderAll();
            return; 
        }
        
        const sizeRaw = prompt("Enter Size (S, M, L, XL):", "S");
        if (sizeRaw === null) {
            designateCollection.current.forEach(o => {
                if ((o as any).isDesignatedCell) {
                    canvasInstance.remove(o);
                } else {
                    const isEdited = (o as any)._editor;
                    o.set({ fill: 'transparent', stroke: isEdited ? '#2563eb' : (o.stroke || '#666666'), backgroundColor: '' });
                }
            });
            designateCollection.current = [];
            canvasInstance.requestRenderAll();
            return;
        }
        const sizeInput = sizeRaw.toUpperCase();
        
        const sizeColors: Record<string, string> = {
            'S': '#3b82f6', 'M': '#10b981', 'L': '#f59e0b', 'XL': '#ef4444'
        };
        const color = sizeColors[sizeInput] || '#64748b';

        const getPathData = (obj: any): any[] | null => {
            if (obj instanceof fabric.Path) return obj.path as any[];
            if (obj.toPath) return (obj as any).toPath().path as any[];
            return null;
        };

        const allPaths = designateCollection.current.map((o: any) => getPathData(o)).filter((p: any) => !!p) as any[][];
        
        if (allPaths.length > 0) {
            const resultPathStr = BooleanTools.unionMultiple(allPaths);
            if (resultPathStr) {
                const finishedPath = new fabric.Path(resultPathStr, {
                    fill: color, opacity: 0.5, stroke: color, strokeWidth: 2, strokeUniform: true, objectCaching: false
                });

                const center = finishedPath.getCenterPoint();
                const label = new fabric.Text(`${name}\n(${sizeInput})`, {
                    left: center.x, top: center.y, fontSize: 18, fontWeight: 'bold', fill: 'white', backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 8, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Inter, sans-serif'
                } as any);

                setPatternLibrary(prev => [...prev, {
                    id: Math.random().toString(36).substr(2, 9),
                    name,
                    size: sizeInput,
                    path: resultPathStr,
                    color
                }]);

                designateCollection.current.forEach((o: any) => {
                    if (o._editor) o._editor.dispose();
                    canvasInstance.remove(o);
                });
                
                // Remove the hover helper too
                const hover = canvasInstance.getObjects().find((obj: any) => obj.id === 'designate-hover');
                if (hover) canvasInstance.remove(hover);
                
                alert(`Pattern "${name}" saved to library!`);
            }
        }

        designateCollection.current = [];
        setActiveTool('select');
        canvasInstance.requestRenderAll();
    };
    
    const findBestSnapPoint = (ptr: {x: number, y: number}, radius: number): {x: number, y: number} | null => {
        if (!canvasInstance) return null;

        let bestPoint: {x: number, y: number} | null = null;
        let minDist = Infinity;

        const checkPoint = (px: number, py: number) => {
            const dist = Math.hypot(px - ptr.x, py - ptr.y);
            if (dist < radius && dist < minDist) {
                minDist = dist;
                bestPoint = { x: px, y: py };
            }
        };

        const traverse = (objs: any[]) => {
            objs.forEach(o => {
                if (o.isGrid || o.isTemp || o.isHandle || (o as any).id === 'designate-hover') return;
                
                if (o.type === 'group') {
                    traverse(o.getObjects());
                    return;
                }

                const path = getSceneSpacePath(o);
                if (path) {
                    path.forEach(cmd => {
                        if (cmd.length >= 3) {
                             checkPoint(cmd[cmd.length-2], cmd[cmd.length-1]);
                        }
                    });
                }
            });
        };

        traverse(canvasInstance.getObjects());

        const anchorHandles = canvasInstance.getObjects().filter((o: any) => o.handleType === 'anchor');
        anchorHandles.forEach((h: any) => {
            checkPoint(h.left, h.top);
        });

        return bestPoint;
    };

    const handleDown = (opt: any) => {
        // Right Click to Finish Drawing
        if (opt.e.button === 2) {
             if (activeTool === 'pen' || activeTool === 'curve') {
                 finishDrawing();
                 return;
             }
        }

        if (activeTool === 'grade' && opt.target && (opt.target as any).handleType === 'segment') {
            const editor = (opt.target as any).patternEditor as PatternEditor;
            const [startIdx, endIdx] = (opt.target as any).indices;
            const offsetStr = prompt(`Grading Offset for Size [${activeGradingSize}] (mm):`, "5");
            if (offsetStr !== null) {
                const dist = parseFloat(offsetStr);
                if (!isNaN(dist)) {
                    editor.makeParallel(endIdx, dist);
                    canvasInstance.requestRenderAll();
                }
            }
            return;
        }

        if (activeTool === 'notch' && opt.target && (opt.target as any).patternEditor) {
            const editor = (opt.target as any).patternEditor as PatternEditor;
            const cmdIndex = (opt.target as any).cmdIndex;
            if (cmdIndex !== undefined) {
                editor.addNotchAt(cmdIndex);
                canvasInstance.requestRenderAll();
            }
            return;
        }

        if (activeTool === 'designate') {
            // UNSELECT Logic: Did we click an existing blue cell?
            if (opt.target && (opt.target as any).isDesignatedCell) {
                const target = opt.target;
                canvasInstance.remove(target);
                designateCollection.current = designateCollection.current.filter(o => o !== target);
                canvasInstance.requestRenderAll();
                return;
            }

            const ptr = canvasInstance.getScenePoint(opt.e);
            
            // Collect all path-like objects, including those inside groups if needed
            const allObjs = canvasInstance.getObjects().filter((o: any) => 
                !o.isHandle && !o.isTemp && !(o as any).isDesignatedCell && (o as any).id !== 'designate-hover'
            );
            
            const allPaths: any[][][] = [];
            allObjs.forEach((o: any) => {
                if (o.type === 'group') {
                    o.getObjects().forEach((child: any) => {
                         const p = getSceneSpacePath(child);
                         if (p) allPaths.push(p);
                    });
                } else {
                    const p = getSceneSpacePath(o);
                    if (p) allPaths.push(p);
                }
            });

            const flatPaths = allPaths.filter((p: any) => !!p);
            const cellPathStr = BooleanTools.findClosedRegionAt(flatPaths, ptr);
            if (cellPathStr) {
                const newCell = new fabric.Path(cellPathStr, {
                    fill: 'rgba(59, 130, 246, 0.4)', 
                    stroke: '#2563eb', 
                    strokeWidth: 1, 
                    selectable: true, 
                    evented: true
                });
                // @ts-ignore
                newCell.isDesignatedCell = true;
                canvasInstance.add(newCell);
                designateCollection.current.push(newCell);
                canvasInstance.requestRenderAll();
            }
            return;
        }

        if ((activeTool === 'pen' || activeTool === 'curve')) {
            // Ignore if panning (Alt or Middle Click)
            if (opt.e.altKey || opt.e.buttons === 4) return;

            // Get Scene coordinates correctly for Fabric v6
            const ptr = opt.scenePoint || canvasInstance.getScenePoint(opt.e);
            if (!ptr) return;
            
            let x = ptr.x;
            let y = ptr.y;

            // --- Enhanced Snapping ---
            const snapRadius = 15 / (canvasInstance.getZoom() || 1);
            const snappedPoint = findBestSnapPoint(ptr, snapRadius);

            if (snappedPoint) {
                x = snappedPoint.x;
                y = snappedPoint.y;
            } else if (showGrid) {
                x = Math.round(x / gridSize) * gridSize;
                y = Math.round(y / gridSize) * gridSize;
            }
            
            if (draftCommands.current.length > 0) {
                const start = draftCommands.current[0];
                if (Math.hypot(start.x - x, start.y - y) < 15) {
                    finishDrawing();
                    return;
                }
            }

            if (draftCommands.current.length === 0) {
                draftCommands.current.push({ type: 'M', x, y });
                if (activeTool === 'curve') curveState.current = { step: 1 };
                updateTempPath();
                return;
            }

            if (activeTool === 'pen') {
                draftCommands.current.push({ type: 'L', x, y });
                updateTempPath();
            } else if (activeTool === 'curve') {
                if (curveState.current.step === 1) {
                    curveState.current.p2 = { x, y };
                    curveState.current.step = 2;
                    updateTempPath();
                } else if (curveState.current.step === 2) {
                    if (curveState.current.p2) {
                        draftCommands.current.push({ 
                            type: 'Q', cx: x, cy: y, x: curveState.current.p2.x, y: curveState.current.p2.y 
                        });
                        finishDrawing();
                        return;
                    }
                }
            }
        }
    };

    const handleMove = (opt: any) => {
        const ptr = opt.scenePoint || canvasInstance.getScenePoint(opt.e);
        if (!ptr) return;
        
        let x = ptr.x;
        let y = ptr.y;

        if (activeTool === 'designate') {
            const allObjs = canvasInstance.getObjects().filter((o: any) => 
                !o.isHandle && !o.isTemp && !(o as any).isDesignatedCell && (o as any).id !== 'designate-hover'
            );
            
            const allPaths: any[][][] = [];
            allObjs.forEach((o: any) => {
                if (o.type === 'group') {
                    o.getObjects().forEach((child: any) => {
                         const p = getSceneSpacePath(child);
                         if (p) allPaths.push(p);
                    });
                } else {
                    const p = getSceneSpacePath(o);
                    if (p) allPaths.push(p);
                }
            });

            const flatPaths = allPaths.filter((p: any) => !!p);
            const cellPathStr = BooleanTools.findClosedRegionAt(flatPaths, ptr);

            // Remove existing hover
            const existingHover = canvasInstance.getObjects().find((o: any) => o.id === 'designate-hover');
            if (existingHover) canvasInstance.remove(existingHover);

            if (cellPathStr) {
                const hoverPath = new fabric.Path(cellPathStr, {
                    fill: 'rgba(59, 130, 246, 0.15)', 
                    stroke: '#3b82f6', 
                    strokeWidth: 1, 
                    selectable: false, 
                    evented: false, 
                    opacity: 0.6
                });
                (hoverPath as any).id = 'designate-hover';
                canvasInstance.add(hoverPath);
            }
            canvasInstance.requestRenderAll();
            return;
        }

        if ((activeTool === 'pen' || activeTool === 'curve') && draftCommands.current.length > 0) {
            // --- Enhanced Snapping Preview ---
            const snapRadius = 15 / (canvasInstance.getZoom() || 1);
            const snappedPoint = findBestSnapPoint(ptr, snapRadius);
            
            // Manage Snap Marker
            if (snappedPoint) {
                x = snappedPoint.x;
                y = snappedPoint.y;
                
                if (!snapMarker.current) {
                    snapMarker.current = new fabric.Circle({
                        radius: 5,
                        fill: 'transparent',
                        stroke: '#ec4899', // Pink snap color
                        strokeWidth: 2,
                        selectable: false,
                        evented: false,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvasInstance.add(snapMarker.current);
                }
                snapMarker.current.set({ left: x, top: y, visible: true });
                (snapMarker.current as any).bringToFront();
            } else {
                 if (snapMarker.current) {
                    snapMarker.current.set({ visible: false });
                 }
                 if (showGrid) {
                    x = Math.round(x / gridSize) * gridSize;
                    y = Math.round(y / gridSize) * gridSize;
                 }
            }

            updateTempPath({x, y});
        } else {
             // Hide marker if not drawing or no snap
             if (snapMarker.current) snapMarker.current.set({ visible: false });
        }
    };

    const handleDblClick = () => {
        if (activeTool === 'pen' || activeTool === 'curve') finishDrawing();
        if (activeTool === 'designate') finalizeDesignation();
    };

    const handleMouseOver = (opt: any) => {
        // Handled by handleMove for designate tool
    };

    const handleMouseOut = (opt: any) => {
        // Handled by handleMove for designate tool
    };

    canvasInstance.on('mouse:down', handleDown);
    canvasInstance.on('mouse:move', handleMove);
    canvasInstance.on('mouse:dblclick', handleDblClick);
    canvasInstance.on('mouse:over', handleMouseOver);
    canvasInstance.on('mouse:out', handleMouseOut);

    return () => {
        canvasInstance.off('mouse:down', handleDown);
        canvasInstance.off('mouse:move', handleMove);
        canvasInstance.off('mouse:dblclick', handleDblClick);
        canvasInstance.off('mouse:over', handleMouseOver);
        canvasInstance.off('mouse:out', handleMouseOut);
    };
  }, [canvasInstance, activeTool, showGrid, gridSize]);

  const handleToolSelect = (tool: string) => {
    setActiveTool(tool);
    if (!canvasInstance) return;

    canvasInstance.isDrawingMode = false;
    canvasInstance.selection = true;

    if (tool === 'rect') {
        const vpt = canvasInstance.viewportTransform;
        const center = canvasInstance.getCenterPoint();
        const rect = new fabric.Rect({ 
            left: center.x, 
            top: center.y, 
            fill: '#cccccc', width: 100, height: 100, opacity: 0.8, stroke: '#666666', strokeWidth: 1,
            originX: 'center', originY: 'center'
        });
        canvasInstance.add(rect);
        canvasInstance.setActiveObject(rect);
        setActiveTool('select');
    } else if (tool === 'mirror') {
        const activeObj = canvasInstance.getActiveObject();
        if (activeObj && (activeObj as any)._editor) (activeObj as any)._editor.mirror();
        setActiveTool('select');
    } else if (tool === 'parallel') {
        const distStr = prompt("Enter distance for parallel line (mm):", "20");
        if (distStr === null) {
            setActiveTool('select');
            return;
        }
        const distance = parseFloat(distStr);
        if (isNaN(distance) || distance === 0) {
            setActiveTool('select');
            return;
        }

        let created = false;
        for (const [id, editor] of editors.current.entries()) {
            if (editor.selectedSegment !== null && editor.selectedSegment !== undefined) {
                 editor.makeParallel(editor.selectedSegment, distance);
                 created = true;
                 break;
            }
        }
        
        if (!created) alert("Select a segment first using Direct Selection tool (A) before making parallel.");
        setActiveTool('select');
    } else if (tool === 'grade') {
        canvasInstance.discardActiveObject();
        // Enable edit mode handles for all patterns to show segments
        canvasInstance.getObjects().forEach((o: any) => {
            if (o instanceof fabric.Path && (o as any)._editor) {
                if (!(o as any).isEditing) (o as any)._editor.toggleEditMode();
            }
        });
        canvasInstance.requestRenderAll();
    } else if (tool === 'designate') {
        canvasInstance.discardActiveObject();
        // Clear artifacts
        canvasInstance.getObjects().forEach((o: any) => {
            if (o.isDesignatedCell || o.id === 'designate-hover') canvasInstance.remove(o);
        });
        designateCollection.current = [];
        canvasInstance.requestRenderAll();
    } else if (tool === 'pen' || tool === 'curve') {
        // Cleanup designate artifacts if switching away
        if (activeTool === 'designate') {
            canvasInstance.getObjects().forEach((o: any) => {
                if (o.isDesignatedCell || o.id === 'designate-hover') canvasInstance.remove(o);
            });
            designateCollection.current = [];
        }
        canvasInstance.isDrawingMode = false;
        canvasInstance.selection = false;
        canvasInstance.discardActiveObject();
        canvasInstance.requestRenderAll();
    } else if (tool === 'union' || tool === 'subtract') {
        // Cleanup designate artifacts if switching away
        if (activeTool === 'designate') {
            canvasInstance.getObjects().forEach((o: any) => {
                if (o.isDesignatedCell || o.id === 'designate-hover') canvasInstance.remove(o);
            });
            designateCollection.current = [];
        }
        handleBooleanOperation(tool);
        setActiveTool('select');
    } else if (tool === 'zoom-in' || tool === 'zoom-out' || tool === 'fit-all' || tool === 'delete' || tool === 'clear') {
        // Cleanup designate artifacts for all other tools if switching away
        if (activeTool === 'designate') {
            canvasInstance.getObjects().forEach((o: any) => {
                if (o.isDesignatedCell || o.id === 'designate-hover') canvasInstance.remove(o);
            });
            designateCollection.current = [];
        }
        
        // Re-routing to specific tool logic to keep it simple but correct
        if (tool === 'zoom-in') {
            canvasInstance.setZoom(canvasInstance.getZoom() * 1.2);
        } else if (tool === 'zoom-out') {
            canvasInstance.setZoom(canvasInstance.getZoom() / 1.2);
        } else if (tool === 'fit-all') {
            const objects = canvasInstance.getObjects().filter((o: any) => !o.isGrid);
            if (objects.length > 0) {
                const group = new fabric.Group(objects);
                const rect = group.getBoundingRect();
                const zoom = Math.min(canvasInstance.width / (rect.width * 1.2), canvasInstance.height / (rect.height * 1.2));
                canvasInstance.setZoom(zoom);
                const vpt = canvasInstance.viewportTransform;
                vpt[4] = (canvasInstance.width / 2) - (rect.left + rect.width / 2) * zoom;
                vpt[5] = (canvasInstance.height / 2) - (rect.top + rect.height / 2) * zoom;
            }
        } else if (tool === 'delete') {
            const activeObj = canvasInstance.getActiveObject();
            if (activeObj && !(activeObj as any).isHandle) {
                const editor = (activeObj as any)._editor;
                if (editor) {
                    editor.dispose();
                    for (const [k, v] of editors.current.entries()) if (v === editor) { editors.current.delete(k); break; }
                } else canvasInstance.remove(activeObj);
                canvasInstance.discardActiveObject();
            }
        } else if (tool === 'clear') {
            if (confirm('Clear canvas?')) {
                canvasInstance.getObjects().forEach((obj: any) => { if (!obj.isGrid) canvasInstance.remove(obj); });
                editors.current.clear();
            }
        }
        setActiveTool('select');
    }
  };

  const handleApplyPreset = (preset: Preset, key: string) => {
    if (!canvasInstance) return;

    let pathString = '';
    const pointLabels: Record<number, string> = {};

    preset.path.forEach((p: any, i: number) => {
        if (p.type === 'M') pathString += `M ${p.x} ${p.y} `;
        else if (p.type === 'L') pathString += `L ${p.x} ${p.y} `;
        else if (p.type === 'C') pathString += `C ${p.cp1x} ${p.cp1y} ${p.cp2x} ${p.cp2y} ${p.x} ${p.y} `;
        else if (p.type === 'Z') pathString += 'Z';
        if (p.label) pointLabels[i] = p.label;
    });

    const path = new fabric.Path(pathString, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        pathOffset: { x: 0, y: 0 }
    });
    const id = Math.random().toString(36).substr(2, 9);
    (path as any).id = id;
    (path as any).presetKey = key;
    (path as any).counterpartId = preset.counterpart ? 
        (Array.from(editors.current.values()).find(e => (e.path as any).presetKey === preset.counterpart)?.path as any)?.id : null;

    const joinPoints: number[] = [];
    preset.path.forEach((p: any, i: number) => {
        if (p.isJoin) joinPoints.push(i);
    });

    const editor = new PatternEditor(canvasInstance, path, pointLabels, joinPoints);
    editor.onSegmentClick = (data) => setPopupData({ ...data, editor });
    (path as any)._editor = editor;
    editors.current.set(id, editor);
    
    const center = canvasInstance.getCenterPoint();
    path.set({ left: center.x, top: center.y, originX: 'center', originY: 'center' }); 
    path.setCoords();
    canvasInstance.add(path);
    (path as any)._toggleEdit = () => editor.toggleEditMode();
    canvasInstance.setActiveObject(path);
    canvasInstance.requestRenderAll();
  };

  const handleBooleanOperation = (type: 'union' | 'subtract') => {
      const activeObjects = canvasInstance.getActiveObjects();
      if (activeObjects.length < 2) return alert('Select 2 shapes');
      
      const [objA, objB] = activeObjects;
      
      // Extract path data more robustly
      let pathA: any[] | undefined;
      let pathB: any[] | undefined;
      
      if (objA instanceof fabric.Path) {
          pathA = objA.path as any[];
      } else if ((objA as any).toPath) {
          const converted = (objA as any).toPath();
          pathA = converted.path as any[];
      }
      
      if (objB instanceof fabric.Path) {
          pathB = objB.path as any[];
      } else if ((objB as any).toPath) {
          const converted = (objB as any).toPath();
          pathB = converted.path as any[];
      }
      
      if (!pathA || !pathB) {
          return alert('Selected objects must be paths. Please select valid pattern shapes.');
      }
      
      // Validate path data
      if (!Array.isArray(pathA) || !Array.isArray(pathB)) {
          return alert('Invalid path data. Please ensure both shapes have valid geometry.');
      }
      
      const resultPathStr = type === 'union' ? BooleanTools.union(pathA, pathB) : BooleanTools.subtract(pathA, pathB);
      
      if (resultPathStr) {
          const newPath = new fabric.Path(resultPathStr, {
              fill: 'transparent', // Wireframe - no fill
              stroke: '#2563eb', // Blue stroke for visibility
              strokeWidth: 2,
              strokeLineJoin: 'round',
              strokeLineCap: 'round',
              objectCaching: false
          });
          
          (newPath as any).id = Math.random().toString(36).substr(2, 9);
          
           // Re-wrap in PatternEditor to make it editable
          const editor = new PatternEditor(canvasInstance, newPath, {}, []);
          editors.current.set((newPath as any).id, editor);

          canvasInstance.remove(objA);
          canvasInstance.remove(objB);
          canvasInstance.add(newPath);
          canvasInstance.setActiveObject(newPath);
          canvasInstance.requestRenderAll();
      } else {
          alert('Boolean operation failed. The shapes may not overlap or have invalid geometry.');
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
                 // Prevent deletion of handles (vertices/control points)
                 if ((activeObj as any).isHandle || (activeObj as any).handleType) {
                     return; // Don't delete handles
                 }
                 
                 const editor = (activeObj as any)._editor;
                 if (editor) {
                     editor.dispose();
                     // Remove from map
                     for (const [k, v] of editors.current.entries()) {
                         if (v === editor) { editors.current.delete(k); break; }
                     }
                 } else {
                     canvasInstance.remove(activeObj);
                 }
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

  // Grading Nest Logic
  useEffect(() => {
      if (!canvasInstance) return;

      // 1. Clear existing nest
      canvasInstance.getObjects().forEach((obj: any) => {
          if (obj.isGradingNest) canvasInstance.remove(obj);
      });

      if (!showGradingNest) {
          canvasInstance.requestRenderAll();
          return;
      }

      // 2. Generate Nest for all Patterns
      const patterns = canvasInstance.getObjects().filter((o: any) => o._editor instanceof PatternEditor);
      
      patterns.forEach((patternObj: any) => {
          const editor = patternObj._editor as PatternEditor;
          
          const sizes = [
              { size: 'S', color: '#3b82f6', strokeWidth: 1.5 },
              { size: 'L', color: '#22c55e', strokeWidth: 1.5 },
              { size: 'XL', color: '#f97316', strokeWidth: 1.5 }
          ];

          sizes.forEach(({ size, color, strokeWidth }) => {
              const gradedPath = editor.getGradedPath(size);
              // Convert path array to path string for fabric
              let pathStr = '';
              gradedPath.forEach((cmd: any[]) => {
                 if (cmd[0] === 'M') pathStr += `M ${cmd[1]} ${cmd[2]} `;
                 else if (cmd[0] === 'L') pathStr += `L ${cmd[1]} ${cmd[2]} `;
                 else if (cmd[0] === 'C') pathStr += `C ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]} ${cmd[5]} ${cmd[6]} `;
                 else if (cmd[0] === 'Q') pathStr += `Q ${cmd[1]} ${cmd[2]} ${cmd[3]} ${cmd[4]} `;
                 else if (cmd[0] === 'Z') pathStr += `Z `;
              });

              const nestPath = new fabric.Path(pathStr, {
                  fill: '',
                  stroke: color,
                  strokeWidth: strokeWidth,
                  strokeDashArray: [5, 5],
                  selectable: false,
                  evented: false,
                  opacity: 0.8
              } as any);

              (nestPath as any).isGradingNest = true;
              
              // Copy transform from base pattern
              nestPath.set({
                  left: patternObj.left,
                  top: patternObj.top,
                  scaleX: patternObj.scaleX,
                  scaleY: patternObj.scaleY,
                  angle: patternObj.angle,
                  originX: patternObj.originX,
                  originY: patternObj.originY
              });

              canvasInstance.add(nestPath);
              (nestPath as any).sendToBack?.(); // Keep behind control handles
          });
      });

      canvasInstance.requestRenderAll();

  }, [showGradingNest, canvasInstance, selectedObjects]); // Re-render when selection changes (potentially triggers updates) or toggle


  const handlePullPattern = (pattern: any) => {
    if (!canvasInstance) return;
    const path = new fabric.Path(pattern.path, {
        fill: pattern.color, 
        opacity: 0.5, 
        stroke: pattern.color, 
        strokeWidth: 2, 
        strokeUniform: true,
        objectCaching: false,
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top'
    });
    
    const center = path.getCenterPoint();
    const label = new fabric.Text(`${pattern.name}\n(${pattern.size})`, {
        left: center.x, top: center.y, fontSize: 18, fontWeight: 'bold', fill: 'white', backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8, originX: 'center', originY: 'center', textAlign: 'center', fontFamily: 'Inter, sans-serif'
    } as any);

    const group = new fabric.Group([path, label], { 
        left: 200, top: 200,
        // @ts-ignore
        isFinishedPattern: true, panelName: pattern.name, panelSize: pattern.size
    });

    canvasInstance.add(group);
    
    // Auto-enable editor for grading if tool is active
    if (activeTool === 'grade') {
        setTimeout(() => {
            const editor = new PatternEditor(canvasInstance, path as any);
            editors.current.set((path as any).id || Math.random().toString(), editor);
            editor.toggleEditMode();
            canvasInstance.requestRenderAll();
        }, 100);
    }

    canvasInstance.setActiveObject(group);
    canvasInstance.requestRenderAll();
  };

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
                    onClick={() => setShowGradingNest(!showGradingNest)}
                    className={`px-5 py-2 text-xs border rounded-full font-bold transition-all shadow-sm flex items-center gap-2 ${
                        showGradingNest 
                        ? 'bg-purple-600 border-purple-500 text-white shadow-purple-200' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" /> Grading Nest
                </button>

                <button 
                    onClick={() => setIsNestingOpen(true)}
                    className="px-5 py-2 text-xs bg-green-600 hover:bg-green-700 text-white border border-green-500 rounded-full font-bold transition-all shadow-sm flex items-center gap-2"
                >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-Nest Optimization
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
                      // Use the editor reference from popupData
                      if (popupData.editor) {
                        popupData.editor.setSegmentLength(popupData.endIdx, newVal);
                      }
                      setPopupData(null);
                  }}
                  onCancel={() => setPopupData(null)}
              />
          )}
        </div>
        <PropertiesPanel 
            selectedObjects={selectedObjects} 
            gridSettings={{ showGrid, gridSize, snappingConfig }}
            onGridSettingChange={(key, val) => {
                if (key === 'showGrid') setShowGrid(val);
                if (key === 'gridSize') { setGridSize(val); setSnappingConfig(prev => ({ ...prev, gridSize: val })); }
                if (key === 'snapping') setSnappingConfig(prev => ({ ...prev, ...val }));
            }}
            patternLibrary={patternLibrary}
            onPullPattern={handlePullPattern}
            activeGradingSize={activeGradingSize}
            onGradingSizeChange={setActiveGradingSize}
        />
      </main>

      <NestingDialog 
        isOpen={isNestingOpen} 
        onClose={() => setIsNestingOpen(false)} 
        canvas={canvasInstance}
      />
    </div>
  );
}
