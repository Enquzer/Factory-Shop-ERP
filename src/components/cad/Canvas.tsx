'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; // Correct import for v6+
import { snapToGrid } from '@/lib/cad/geometry';

interface CanvasProps {
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export default function Canvas({ onCanvasReady }: CanvasProps) {
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
      backgroundColor: '#f0f0f0',
      selection: true,
      preserveObjectStacking: true,
    });

    setFabricCanvas(canvas);
    if (onCanvasReady) onCanvasReady(canvas);

    // Initial Grid
    drawGrid(canvas, 20);

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        canvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        drawGrid(canvas, 20);
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
      
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
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
// ... 
    // Snap to Grid Logic
    canvas.on('object:moving', (options: any) => {
        const gridSize = 20; 
        if (options.target) {
            options.target.set({
                left: snapToGrid(options.target.left || 0, gridSize),
                top: snapToGrid(options.target.top || 0, gridSize)
            });
        }
    });

    return () => {
      canvas.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  const drawGrid = (canvas: fabric.Canvas, gridSize: number) => {
    // Clear previous grid
    // Using a cast to any to access custom property 'isGrid' if TS complains, 
    // or better, filter by a specific property we set.
    canvas.getObjects('line').forEach((obj: any) => {
        if (obj.isGrid) canvas.remove(obj);
    });

    // Simple finite grid for sandbox
    const width = 2000;
    const height = 2000;
    
    // Vertical lines
    for (let i = -width; i <= width; i += gridSize) {
        const line = new fabric.Line([i, -height, i, height], {
            stroke: '#ccc',
            selectable: false,
            evented: false,
            // @ts-ignore
            isGrid: true
        });
        canvas.add(line);
    }
    
    // Horizontal lines
    for (let i = -height; i <= height; i += gridSize) {
        const line = new fabric.Line([-width, i, width, i], {
            stroke: '#ccc',
            selectable: false,
            evented: false,
             // @ts-ignore
            isGrid: true
        });
        canvas.add(line);
    }
    
    // Verify object exists before sending to back
    const lines = canvas.getObjects().filter((o: any) => o.type === 'line');
    if (lines.length > 0) {
        lines.forEach(line => canvas.sendObjectToBack(line));
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  );
}
