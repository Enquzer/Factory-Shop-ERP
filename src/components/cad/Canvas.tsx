'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; // Correct import for v6+
import { snapToGrid } from '@/lib/cad/geometry';

interface CanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  showGrid?: boolean;
  gridSize?: number;
  snappingConfig?: {
    grid: boolean;
    points: boolean;
    segments: boolean;
    gridSize: number;
  };
}

export default function Canvas({ onCanvasReady, showGrid = true, gridSize = 20, snappingConfig }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  
  // Refs for drag state to avoid re-renders or stale closures in event handlers
  const isDragging = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#f8fafc',
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Attach snapping config to canvas object for PatternEditor to access
    (canvas as any).snappingConfig = snappingConfig || { grid: true, points: true, segments: true, gridSize: 20 };

    setFabricCanvas(canvas);
    if (onCanvasReady) onCanvasReady(canvas);

    // Initial Grid
    if (showGrid) drawGrid(canvas, gridSize);

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        if (showGrid) drawGrid(canvas, gridSize);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Zoom and Pan Logic
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      
      // Use scene point for precise zoom center
      const point = canvas.getScenePoint(opt.e);
      canvas.zoomToPoint(new fabric.Point(point.x, point.y), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (evt.altKey || evt.buttons === 4) { // Alt or Middle Click
        isDragging.current = true;
        canvas.selection = false;
        lastPosX.current = evt.clientX;
        lastPosY.current = evt.clientY;
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isDragging.current) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        if (!vpt) return;
        
        vpt[4] += e.clientX - lastPosX.current;
        vpt[5] += e.clientY - lastPosY.current;
        canvas.requestRenderAll();
        
        lastPosX.current = e.clientX;
        lastPosY.current = e.clientY;
      }
    });

    canvas.on('mouse:up', () => {
        isDragging.current = false;
        canvas.selection = true;
    });

    // Distance measurement helpers
    let distanceLabel: fabric.Text | null = null;
    let distanceLine: fabric.Line | null = null;

    const clearDistanceIndicators = () => {
        if (distanceLabel) {
            canvas.remove(distanceLabel);
            distanceLabel = null;
        }
        if (distanceLine) {
            canvas.remove(distanceLine);
            distanceLine = null;
        }
    };

    const findNearestParallelEdge = (movingObj: any) => {
        if (!movingObj || movingObj.type !== 'path') return null;
        
        const movingBounds = movingObj.getBoundingRect();
        const movingEdges = [
            { type: 'left', value: movingBounds.left, axis: 'x' },
            { type: 'right', value: movingBounds.left + movingBounds.width, axis: 'x' },
            { type: 'top', value: movingBounds.top, axis: 'y' },
            { type: 'bottom', value: movingBounds.top + movingBounds.height, axis: 'y' }
        ];

        let nearest = { distance: Infinity, edge1: null as any, edge2: null as any };

        canvas.getObjects().forEach((obj: any) => {
            if (obj === movingObj || obj.isGrid || obj.isTemp || (obj as any).handleType || obj === distanceLabel || obj === distanceLine) return;
            if (obj.type !== 'path' && obj.type !== 'rect' && obj.type !== 'line') return;

            const bounds = obj.getBoundingRect();
            const edges = [
                { type: 'left', value: bounds.left, axis: 'x' },
                { type: 'right', value: bounds.left + bounds.width, axis: 'x' },
                { type: 'top', value: bounds.top, axis: 'y' },
                { type: 'bottom', value: bounds.top + bounds.height, axis: 'y' }
            ];

            movingEdges.forEach(e1 => {
                edges.forEach(e2 => {
                    if (e1.axis === e2.axis) {
                        const dist = Math.abs(e1.value - e2.value);
                        if (dist < nearest.distance && dist > 0.1 && dist < 200) {
                            nearest = { distance: dist, edge1: e1, edge2: e2 };
                        }
                    }
                });
            });
        });

        return nearest.distance < Infinity ? nearest : null;
    };

    // Snap to Grid Logic and Distance Measurement
    canvas.on('object:moving', (options: any) => {
        const target = options.target;
        if (!target) return;

        // 1. Apply Movement Constraints (for Parallel lines)
        if (target.movementConstraint) {
            const { normal, baseMidpoint } = target.movementConstraint;
            const currentCenter = target.getCenterPoint();
            
            // Vector from original base to current center
            const vx = currentCenter.x - baseMidpoint.x;
            const vy = currentCenter.y - baseMidpoint.y;
            
            // Project this movement onto the normal vector to restrict to 1D movement
            const dot = (vx * normal.x + vy * normal.y);
            const constrainedX = baseMidpoint.x + dot * normal.x;
            const constrainedY = baseMidpoint.y + dot * normal.y;

            target.setPositionByOrigin(new fabric.Point(constrainedX, constrainedY), 'center', 'center');

            // 2. Update Associated Indicators (if any)
            if (target.indicators) {
                const [dimLine, label] = target.indicators;
                const newCenter = target.getCenterPoint();
                
                dimLine.set({ x2: newCenter.x, y2: newCenter.y });
                
                const zoom = canvas.getZoom();
                const distPX = Math.sqrt(Math.pow(newCenter.x - baseMidpoint.x, 2) + Math.pow(newCenter.y - baseMidpoint.y, 2));
                const distMM = Math.round(distPX / zoom * 10) / 10;
                
                label.set({
                    left: (baseMidpoint.x + newCenter.x) / 2 + 5,
                    top: (baseMidpoint.y + newCenter.y) / 2,
                    text: `${distMM}mm`
                });
            }
        }

        const config = (canvas as any).snappingConfig || { grid: true, gridSize: 20 };
        if (config.grid && target) {
            target.set({
                left: Math.round(target.left! / config.gridSize) * config.gridSize,
                top: Math.round(target.top! / config.gridSize) * config.gridSize
            });
        }

        // Show distance to nearest parallel edge
        clearDistanceIndicators();
        const nearest = findNearestParallelEdge(options.target);
        
        if (nearest) {
            const { distance, edge1, edge2 } = nearest;
            const zoom = canvas.getZoom();
            const distanceMM = Math.round(distance / zoom * 10) / 10;

            // Calculate line position
            let x1, y1, x2, y2, labelX, labelY;
            
            if (edge1.axis === 'x') {
                x1 = x2 = (edge1.value + edge2.value) / 2;
                const bounds = options.target.getBoundingRect();
                y1 = bounds.top + bounds.height / 2 - 30;
                y2 = bounds.top + bounds.height / 2 + 30;
                labelX = x1 + 5;
                labelY = (y1 + y2) / 2;
            } else {
                y1 = y2 = (edge1.value + edge2.value) / 2;
                const bounds = options.target.getBoundingRect();
                x1 = bounds.left + bounds.width / 2 - 30;
                x2 = bounds.left + bounds.width / 2 + 30;
                labelX = (x1 + x2) / 2 + 5;
                labelY = y1 - 5;
            }

            // Draw distance line
            distanceLine = new fabric.Line([x1, y1, x2, y2], {
                stroke: '#ec4899',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                strokeDashArray: [4, 4]
            });

            // Draw distance label
            distanceLabel = new fabric.Text(`${distanceMM}mm`, {
                left: labelX,
                top: labelY,
                fontSize: 12,
                fontWeight: 'bold',
                fill: 'white',
                backgroundColor: '#ec4899',
                padding: 4,
                selectable: false,
                evented: false,
                fontFamily: 'Inter, sans-serif'
            } as any);

            canvas.add(distanceLine);
            canvas.add(distanceLabel);
        }
    });

    canvas.on('object:modified', clearDistanceIndicators);
    canvas.on('selection:cleared', clearDistanceIndicators);

    // Clean up indicators if a constrained object is removed
    canvas.on('object:removed', (opt: any) => {
        if (opt.target && opt.target.indicators) {
            opt.target.indicators.forEach((ind: any) => canvas.remove(ind));
        }
    });

    return () => {
      canvas.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (fabricCanvas) {
        (fabricCanvas as any).snappingConfig = snappingConfig;
        
        // Update Grid
        fabricCanvas.getObjects('line').forEach((obj: any) => {
            if (obj.isGrid) fabricCanvas.remove(obj);
        });
        if (showGrid) drawGrid(fabricCanvas, gridSize);
        fabricCanvas.requestRenderAll();
    }
  }, [showGrid, gridSize, snappingConfig, fabricCanvas]);

  const drawGrid = (canvas: fabric.Canvas, gridSize: number) => {
    const width = 4000;
    const height = 4000;
    const gridColor = '#e2e8f0';
    
    // Vertical lines
    for (let i = -width; i <= width; i += gridSize) {
        const isMajor = (i % (gridSize * 5) === 0);
        const line = new fabric.Line([i, -height, i, height], {
            stroke: isMajor ? '#cbd5e1' : gridColor,
            strokeWidth: isMajor ? 1 : 0.5,
            selectable: false,
            evented: false,
            // @ts-ignore
            isGrid: true
        });
        canvas.add(line);
    }
    
    // Horizontal lines
    for (let i = -height; i <= height; i += gridSize) {
        const isMajor = (i % (gridSize * 5) === 0);
        const line = new fabric.Line([-width, i, width, i], {
            stroke: isMajor ? '#cbd5e1' : gridColor,
            strokeWidth: isMajor ? 1 : 0.5,
            selectable: false,
            evented: false,
             // @ts-ignore
            isGrid: true
        });
        canvas.add(line);
    }
    
    canvas.getObjects().filter((o: any) => o.isGrid).forEach(line => canvas.sendObjectToBack(line));
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  );
}
