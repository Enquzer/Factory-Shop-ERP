import * as fabric from 'fabric';
import { distance, getCubicBezierLength, getAngle, snapToAngle, Point, pointFromAngle, getPolygonArea, getLineMidpoint, getBezierMidpoint, getLineNormal, getNearestPointOnLine, getNearestPointOnCubicBezier } from './geometry';
import { GRADING_TABLE } from './presets-data';

/**
 * A wrapper class to manage a Pattern (Path) and its editing handles.
 * Supports Moving Anchors and Adjusting Bezier Control Points.
 */
export class PatternEditor {
  canvas: fabric.Canvas;
  path: fabric.Path;
  handles: fabric.Object[];
  segmentHandles: fabric.Path[] = [];
  connectionLines: fabric.Line[];
  labels: fabric.Text[];
  isEditing: boolean;
  pointLabels: Record<number, string>; 
  basePath: any[] | null = null;
  onSegmentClick?: (data: { endIdx: number, currentLen: number, pos: { x: number, y: number } }) => void;
  segmentColors: Record<number, string> = {}; 
  hudLabel: fabric.Text | null = null;
  joinPoints: Set<number> = new Set();
  selectedSegment: number | null = null;
  midpointIndicator: fabric.Object | null = null;
  private lastClickPoint: Point | null = null;

  constructor(canvas: fabric.Canvas, path: fabric.Path, pointLabels: Record<number, string> = {}, joinPoints: number[] = []) {
    this.canvas = canvas;
    this.handles = [];
    this.connectionLines = [];
    this.labels = [];
    this.isEditing = false;
    this.path = path;
    this.pointLabels = pointLabels;
    this.joinPoints = new Set(joinPoints);
    this.basePath = JSON.parse(JSON.stringify(path.path));
    
    if (!(this.path as any).id) (this.path as any).id = Math.random().toString(36).substr(2, 9);
    (this.path as any).notches = (this.path as any).notches || [];
    (this.path as any).grainLine = (this.path as any).grainLine || { angle: 0, length: 100 };
    (this.path as any).pointLabels = pointLabels;
    (this.path as any).isEditing = false;
    (this.path as any)._editor = this;

    // Ensure the path is set up for CAD precision - WIREFRAME MODE
    this.path.set({
      fill: 'transparent', // Wireframe - no fill
      opacity: 1, // Full opacity for stroke
      stroke: '#2563eb', // Blue stroke for visibility
      strokeWidth: 2,
      strokeUniform: true, // Keep stroke width constant when scaling
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      strokeMiterLimit: 2,
      centeredScaling: false,
      objectCaching: false,
      transparentCorners: false,
      cornerColor: 'blue',
      hasBorders: true,
      hasControls: true,
      originX: 'left',
    });

    // this.groundPath(); // DISABLE grounding to allow correct bounding box and selection handles
  }

  // Convert Scene Coordinate -> Path Data Coordinate
  // (Inverse of: PathData - pathOffset -> Transform -> Scene)
  private toPathDataSpace(sceneX: number, sceneY: number): {x: number, y: number} {
      const matrix = this.path.calcTransformMatrix();
      const invMatrix = fabric.util.invertTransform(matrix);
      const local = fabric.util.transformPoint({ x: sceneX, y: sceneY } as any, invMatrix);
      const offset = this.path.pathOffset || { x: 0, y: 0 };
      return { 
          x: local.x + offset.x, 
          y: local.y + offset.y 
      };
  }

  /**
   * Grounds the path to (0,0) in scene space and makes all internal path data absolute.
   * This prevents "Fabric Jumps" caused by auto-centering and relative offsets.
   */
  private groundPath() {
    if (!this.path) return;
    
    const segments = this.path.path as any[];
    if (!segments) return;

    const matrix = this.path.calcTransformMatrix();
    const offset = this.path.pathOffset || { x: 0, y: 0 };
    
    const absoluteSegments = segments.map((cmd: any) => {
        const newCmd = [...cmd];
        for (let i = 1; i < cmd.length; i += 2) {
            const pt = fabric.util.transformPoint({ 
                x: cmd[i] - offset.x, 
                y: cmd[i+1] - offset.y 
            } as any, matrix);
            newCmd[i] = pt.x;
            newCmd[i+1] = pt.y;
        }
        return newCmd;
    });

    this.path.set({
        path: absoluteSegments,
        left: 0,
        top: 0,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        originX: 'left',
        originY: 'top',
        pathOffset: { x: 0, y: 0 },
        dirty: true
    });
    this.path.setCoords();
  }

  toggleEditMode() {
    this.isEditing = !this.isEditing;
    (this.path as any).isEditing = this.isEditing;

    if (this.isEditing) {
        this.path.hasControls = false;
        this.path.hasBorders = false; // Remove selection border
        this.path.selectable = false;
        this.path.evented = false; // Prevent path from being selected
        this.canvas.discardActiveObject(); // Deselect the path
        this.showHandles();
    } else {
        this.path.hasControls = true;
        this.path.hasBorders = true;
        this.path.selectable = true;
        this.path.evented = true;
        this.path.lockMovementX = false;
        this.path.lockMovementY = false;
        this.selectedSegment = null;
        this.hideHandles();
        this.path.setCoords(); 
    }
    this.canvas.requestRenderAll();
  }

  forceCleanRefresh() {
    const pathArr = this.path.path as any[];
    
    // Hard set the path property
    this.path.set({ 
        path: [...pathArr], 
        dirty: true 
    });

    // Force internal geometric update
    if ((this.path as any)._setPath) {
        (this.path as any)._setPath(pathArr);
    }

    // Synchronize bounding box and internal coordinate system
    this.path.setCoords();
  }

  showHandles() {
    this.hideHandles(); 
    this.segmentHandles = [];
    const pathCommands = this.path.path as any[];
    
    pathCommands.forEach((cmd, index) => {
        const type = cmd[0];
        if (type === 'M') {
            this.createAnchorHandle(cmd[1], cmd[2], index, 1, 2);
        } else if (type === 'L') {
            this.createSegmentHandle(index - 1, index);
            this.createAnchorHandle(cmd[1], cmd[2], index, 1, 2);
        } else if (type === 'Q') {
            this.createControlHandle(cmd[1], cmd[2], index, 1, 2, index); 
            this.createAnchorHandle(cmd[3], cmd[4], index, 3, 4);      
        } else if (type === 'C') {
            this.createSegmentHandle(index - 1, index);
            this.createControlHandle(cmd[1], cmd[2], index, 1, 2, index - 1); 
            this.createControlHandle(cmd[3], cmd[4], index, 3, 4, index); 
            this.createAnchorHandle(cmd[5], cmd[6], index, 5, 6);      
        } else if (type === 'Z' && index > 0) {
            // Segment back to start point
            this.createSegmentHandle(index - 1, index);
        }
    });

    this.updateConnectionLines();
    this.updateMeasurements();
    this.drawNotches();
    this.drawGrainLine();

    // Ensure all handles are visible and on top
    this.handles.forEach(h => (h as any).bringToFront?.());
    this.segmentHandles.forEach(s => (s as any).bringToFront?.());
    this.connectionLines.forEach(l => (l as any).bringToFront?.());
  }

  createControlHandle(x: number, y: number, cmdIndex: number, xIndex: number, yIndex: number, anchorCmdIndex: number) {
      this.createHandle(x, y, '#3b82f6', 'circle', cmdIndex, xIndex, yIndex, anchorCmdIndex);
  }

  createAnchorHandle(x: number, y: number, cmdIndex: number, xIndex: number, yIndex: number) {
      this.createHandle(x, y, 'red', 'square', cmdIndex, xIndex, yIndex);
  }

  private handleSegmentClick(opt: any, seg: fabric.Path) {
    const pointer = opt.scenePoint || opt.pointer;
    if (pointer) {
        this.lastClickPoint = { x: pointer.x, y: pointer.y };
    }
    const [startIdx, endIdx] = (seg as any).indices;
    this.selectedSegment = endIdx;
    this.updateSegmentPaths();

    if (this.onSegmentClick && pointer) {
        const pathArr = this.path.path as any[];
        const cmd = pathArr[endIdx];
        const prevCmd = pathArr[startIdx];
        const p0 = { x: prevCmd[prevCmd.length-2], y: prevCmd[prevCmd.length-1] };
        const p1 = { x: cmd[cmd.length-2], y: cmd[cmd.length-1] };

        let currentLen = 0;
        if (cmd[0] === 'L') currentLen = distance(p0, p1);
        else if (cmd[0] === 'C') currentLen = getCubicBezierLength(p0, {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, p1);

        this.onSegmentClick({ 
            endIdx, 
            currentLen, 
            pos: { x: pointer.x, y: pointer.y } 
        });

        // Trigger Custom Event as requested for alternative UI integration
        window.dispatchEvent(new CustomEvent('SHOW_SEGMENT_POPUP', {
            detail: { index: endIdx, pos: pointer, currentLength: currentLen }
        }));
    }

    const nodes = this.handles.filter(h => 
        ((h as any).cmdIndex === startIdx || (h as any).cmdIndex === endIdx) && 
        (h as any).handleType === 'anchor'
    );
    this.canvas.discardActiveObject();
    if (nodes.length > 1) {
        const sel = new fabric.ActiveSelection(nodes, { canvas: this.canvas });
        this.canvas.setActiveObject(sel);
    }
    this.canvas.requestRenderAll();
  }

  private createSegmentHandle(startIdx: number, endIdx: number) {
    const pathArr = this.path.path as any[];
    const startCmd = pathArr[startIdx];
    const endCmd = pathArr[endIdx];
    const offset = this.path.pathOffset;

    let d = `M ${startCmd[startCmd.length-2] - (offset.x || 0)} ${startCmd[startCmd.length-1] - (offset.y || 0)} `;
    if (endCmd[0] === 'L') {
        d += `L ${endCmd[1] - (offset.x || 0)} ${endCmd[2] - (offset.y || 0)}`;
    } else if (endCmd[0] === 'C') {
        d += `C ${endCmd[1] - (offset.x || 0)} ${endCmd[2] - (offset.y || 0)} ${endCmd[3] - (offset.x || 0)} ${endCmd[4] - (offset.y || 0)} ${endCmd[5] - (offset.x || 0)} ${endCmd[6] - (offset.y || 0)}`;
    } else if (endCmd[0] === 'Z') {
        const firstCmd = pathArr[0];
        d += `L ${firstCmd[1] - (offset.x || 0)} ${firstCmd[2] - (offset.y || 0)}`;
    }

    const seg = new fabric.Path(d, {
        stroke: 'rgba(0,0,0,0)', // Completely invisible - no stroke at all
        strokeWidth: 20, 
        fill: 'rgba(0,0,0,0)', // Completely transparent fill
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: 'pointer',
        left: this.path.left,
        top: this.path.top,
        scaleX: this.path.scaleX,
        scaleY: this.path.scaleY,
        angle: this.path.angle,
        originX: this.path.originX,
        originY: this.path.originY,
        perPixelTargetFind: false,
        opacity: 0 // Force complete invisibility
    } as any);

    // Keep segments always invisible, even when selected
    // if (this.selectedSegment === endIdx) {
    //     seg.set('stroke', 'rgba(59, 130, 246, 0.3)');
    // }


    (seg as any).handleType = 'segment';
    (seg as any).indices = [startIdx, endIdx];
    (seg as any).patternEditor = this;

    seg.on('mousedown', (opt: any) => this.handleSegmentClick(opt, seg));
    seg.on('contextmenu', (opt: any) => {
        opt.e.preventDefault();
        this.handleSegmentClick(opt, seg);
    });

    seg.on('mouseover', () => {
        // Subtle visual feedback on hover to help selection
        seg.set({ 
            stroke: this.selectedSegment === endIdx ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.15)',
            opacity: 1 
        });
        (seg as any).bringToFront?.(); // Use optional chaining/cast for safety
        
        // Show Midpoint Indicator
        const [sIdx, eIdx] = (seg as any).indices;
        const pArr = this.path.path as any[];
        const sCmd = pArr[sIdx];
        const eCmd = pArr[eIdx];
        const p0 = { x: sCmd[sCmd.length-2], y: sCmd[sCmd.length-1] };
        
        let mid: Point;
        if (eCmd[0] === 'L') {
            mid = getLineMidpoint(p0, { x: eCmd[1], y: eCmd[2] });
        } else if (eCmd[0] === 'C') {
            mid = getBezierMidpoint(p0, { x: eCmd[1], y: eCmd[2] }, { x: eCmd[3], y: eCmd[4] }, { x: eCmd[5], y: eCmd[6] });
        } else {
            return;
        }
        
        const canvasPt = fabric.util.transformPoint(
            new fabric.Point(mid.x - (this.path.pathOffset.x || 0), mid.y - (this.path.pathOffset.y || 0)),
            this.path.calcTransformMatrix()
        );

        this.midpointIndicator = new fabric.Circle({
            left: canvasPt.x,
            top: canvasPt.y,
            radius: 5,
            fill: '#ec4899', // Pinkish center point
            stroke: 'white',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({ blur: 6, color: 'rgba(0,0,0,0.3)', offsetX: 0, offsetY: 0 })
        });
        this.canvas.add(this.midpointIndicator);
        this.canvas.requestRenderAll();
    });

    seg.on('mouseout', () => {
        // Reset visibility based on selection status
        const isSelected = this.selectedSegment === endIdx;
        seg.set({ 
            stroke: isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(0,0,0,0)',
            opacity: isSelected ? 1 : 0 
        });

        if (this.midpointIndicator) {
            this.canvas.remove(this.midpointIndicator);
            this.midpointIndicator = null;
        }
        this.canvas.requestRenderAll();
    });

    this.segmentHandles.push(seg);
    this.canvas.add(seg);
  }

  private updateSegmentPaths() {
    const pathArr = this.path.path as any[];
    const offset = this.path.pathOffset;

    this.segmentHandles.forEach(seg => {
        const [sIdx, eIdx] = (seg as any).indices;
        const sCmd = pathArr[sIdx];
        const eCmd = pathArr[eIdx];

        let d = `M ${sCmd[sCmd.length-2] - (offset.x || 0)} ${sCmd[sCmd.length-1] - (offset.y || 0)} `;
        if (eCmd[0] === 'L') {
            d += `L ${eCmd[1] - (offset.x || 0)} ${eCmd[2] - (offset.y || 0)}`;
        } else if (eCmd[0] === 'C') {
            d += `C ${eCmd[1] - (offset.x || 0)} ${eCmd[2] - (offset.y || 0)} ${eCmd[3] - (offset.x || 0)} ${eCmd[4] - (offset.y || 0)} ${eCmd[5] - (offset.x || 0)} ${eCmd[6] - (offset.y || 0)}`;
        }
        
        const isSelected = this.selectedSegment === eIdx;
        const colorOverride = this.segmentColors[eIdx];
        const temp = new fabric.Path(d);
        
        // Show highlight if selected
        seg.set({ 
            path: temp.path,
            stroke: isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(0,0,0,0)', // Subtle highlight when selected
            strokeWidth: isSelected ? 8 : 20, // Thinner highlight if selected
            fill: 'rgba(0,0,0,0)',
            opacity: isSelected ? 1 : 0 // Visible if selected
        });
        
        seg.set({
            left: this.path.left,
            top: this.path.top,
            scaleX: this.path.scaleX,
            scaleY: this.path.scaleY,
            angle: this.path.angle,
            originX: this.path.originX,
            originY: this.path.originY
        });
        seg.setCoords();
    });
  }

  createHandle(x: number, y: number, color: string, shape: 'circle' | 'square', cmdIndex: number, xIndex: number, yIndex: number, anchorCmdIndex?: number) {
      const point = fabric.util.transformPoint(
          new fabric.Point(x - (this.path.pathOffset.x || 0), y - (this.path.pathOffset.y || 0)),
          this.path.calcTransformMatrix()
      );

      let handle: fabric.Object;
      const commonProps = {
          left: point.x, top: point.y, 
          fill: 'rgba(255,255,255,0.8)', // Semi-transparent hollow look
          stroke: color, // Red or Blue stroke
          strokeWidth: 1.5,
          hasControls: false, 
          hasBorders: false,
          selectable: true, // Allow dragging
          evented: true, // Allow events
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          originX: 'center', 
          originY: 'center', 
          hoverCursor: 'move', // Show move cursor
          moveCursor: 'move',
          padding: 4,
          data: { cmdIndex, xIndex, yIndex, anchorCmdIndex, handleType: color === 'red' ? 'anchor' : 'control' }
      };
      
      if (shape === 'circle') handle = new fabric.Circle({ ...commonProps, radius: 4 } as any); // Slightly smaller
      else handle = new fabric.Rect({ ...commonProps, width: 8, height: 8 } as any); // Slightly smaller

      (handle as any).cmdIndex = cmdIndex;
      (handle as any).handleType = (commonProps.data as any).handleType;
      (handle as any).patternEditor = this;
      (handle as any).isHandle = true; // Mark as handle for filtering

      handle.on('contextmenu', (opt: any) => {
          opt.e.preventDefault();
          if ((handle as any).handleType !== 'anchor') return;
          this.toggleNodeType((handle as any).cmdIndex);
      });

      handle.on('moving', (opt: any) => {
          const e = opt.e as MouseEvent;
          const scenePt = this.canvas.getScenePoint(e);
          
          let finalX = Math.round(scenePt.x * 10) / 10;
          let finalY = Math.round(scenePt.y * 10) / 10;

          const pointLabel = this.pointLabels[cmdIndex] || "";
          if (pointLabel.toLowerCase().includes("center")) {
              finalX = 0;
          }

          // SNAPPING LOGIC
          const snapConfig = (this.canvas as any).snappingConfig || { grid: true, points: true, segments: true, gridSize: 20 };
          const snapRadius = 12 / (this.canvas.getZoom() || 1);

          if (!e.ctrlKey) {
              let snapped = false;

              // 1. Snap to nearest Anchor Point
              if (snapConfig.points) {
                  const otherAnchors = this.canvas.getObjects().filter(o => 
                      o !== handle && 
                      (o as any).handleType === 'anchor' && 
                      distance(scenePt, {x: o.left!, y: o.top!}) < snapRadius
                  );
                  
                  if (otherAnchors.length > 0) {
                      const target = otherAnchors[0];
                      finalX = Math.round(target.left! * 10) / 10;
                      finalY = Math.round(target.top! * 10) / 10;
                      snapped = true;
                  }
              }

              // 2. Snap to Line/Curve (Synchronous)
              if (!snapped && snapConfig.segments) {
                  const allPaths = this.canvas.getObjects().filter(o => o instanceof fabric.Path && (o as any).id !== (this.path as any).id) as fabric.Path[];
                  for (const p of allPaths) {
                      const pArr = p.path as any[];
                      // Other paths might NOT be grounded, so we need to account for their position
                      const pMatrix = p.calcTransformMatrix();
                      const pOffset = p.pathOffset || { x: 0, y: 0 };

                      for (let i = 1; i < pArr.length; i++) {
                          const cmd = pArr[i];
                          const prev = pArr[i-1];
                          const p0Local = { x: prev[prev.length-2], y: prev[prev.length-1] };
                          
                          if (cmd[0] === 'L') {
                              const p1Local = { x: cmd[1], y: cmd[2] };
                              const c0 = fabric.util.transformPoint({ x: p0Local.x - pOffset.x, y: p0Local.y - pOffset.y } as any, pMatrix);
                              const c1 = fabric.util.transformPoint({ x: p1Local.x - pOffset.x, y: p1Local.y - pOffset.y } as any, pMatrix);
                              
                              const nearest = getNearestPointOnLine(scenePt, c0, c1);
                              const dist = distance(scenePt, nearest);
                              if (dist < snapRadius) {
                                  finalX = Math.round(nearest.x * 10) / 10;
                                  finalY = Math.round(nearest.y * 10) / 10;
                                  snapped = true; break;
                              }
                          } else if (cmd[0] === 'C') {
                              const b1 = { x: cmd[1], y: cmd[2] }, b2 = { x: cmd[3], y: cmd[4] }, b3 = { x: cmd[5], y: cmd[6] };
                              const c0 = fabric.util.transformPoint({ x: p0Local.x - pOffset.x, y: p0Local.y - pOffset.y } as any, pMatrix);
                              const c1 = fabric.util.transformPoint({ x: b1.x - pOffset.x, y: b1.y - pOffset.y } as any, pMatrix);
                              const c2 = fabric.util.transformPoint({ x: b2.x - pOffset.x, y: b2.y - pOffset.y } as any, pMatrix);
                              const c3 = fabric.util.transformPoint({ x: b3.x - pOffset.x, y: b3.y - pOffset.y } as any, pMatrix);
                              
                              const snapResult = getNearestPointOnCubicBezier(scenePt, c0, c1, c2, c3);
                              if (snapResult.distance < snapRadius) {
                                  finalX = Math.round(snapResult.point.x * 10) / 10;
                                  finalY = Math.round(snapResult.point.y * 10) / 10;
                                  snapped = true; break;
                              }
                          }
                      }
                      if (snapped) break;
                  }
              }

              // 3. Snap to Grid
              if (!snapped && snapConfig.grid) {
                  finalX = Math.round(finalX / snapConfig.gridSize) * snapConfig.gridSize;
                  finalY = Math.round(finalY / snapConfig.gridSize) * snapConfig.gridSize;
              }
          }

          if (e.shiftKey && anchorCmdIndex !== undefined) {
              const p = this.path.path as any[];
              const anchor = p[anchorCmdIndex];
              const ax = anchor[anchor.length-2];
              const ay = anchor[anchor.length-1];
              const angle = getAngle({x: ax, y: ay}, {x: finalX, y: finalY});
              const snappedAngle = snapToAngle(angle, 45);
              const dist = distance({x: ax, y: ay}, {x: finalX, y: finalY});
              const snappedPt = pointFromAngle({x: ax, y: ay}, snappedAngle, dist);
              finalX = Math.round(snappedPt.x * 10) / 10;
              finalY = Math.round(snappedPt.y * 10) / 10;
          }

          // Convert Final Scene Coordinates back to Path Data Space
          const localPt = this.toPathDataSpace(finalX, finalY);

          const pathArr = this.path.path as any[];
          pathArr[cmdIndex][xIndex] = localPt.x;
          pathArr[cmdIndex][yIndex] = localPt.y;

          if (this.joinPoints.has(cmdIndex) && (handle as any).handleType === 'anchor') {
              this.ensurePerpendicularJoin(cmdIndex);
          }

          const label = this.pointLabels[cmdIndex];
          if (label && (this.path as any).counterpartId) {
              this.syncCounterpartPoint(label, finalX, finalY);
          }

          this.path.set({ 
              path: [...this.path.path], 
              dirty: true
          }); 
          
          this.forceCleanRefresh();
          this.updateConnectionLines(); 
          this.updateSegmentPaths();
          this.updateMeasurements();
          this.drawNotches();
          this.drawGrainLine();
          this.canvas.requestRenderAll();
          
          if (this.joinPoints.has(cmdIndex)) {
              this.checkSeamSymmetry();
          }

          this.updateHUD(finalX, finalY, cmdIndex);
      });

      handle.on('mouseup', () => {
          if (this.hudLabel) {
              this.canvas.remove(this.hudLabel);
              this.hudLabel = null;
          }
      });

      this.handles.push(handle);
      this.canvas.add(handle);
  }

  private updateHUD(x: number, y: number, cmdIndex: number) {
      if (this.hudLabel) this.canvas.remove(this.hudLabel);
      const pathArr = this.path.path as any[];
      const cmd = pathArr[cmdIndex];
      let length = 0;

      if (cmd[0] === 'L') {
          const p0 = pathArr[cmdIndex-1];
          length = distance({x: p0[p0.length-2], y: p0[p0.length-1]}, {x: cmd[1], y: cmd[2]});
      } else if (cmd[0] === 'C') {
          const p0 = pathArr[cmdIndex-1];
          length = getCubicBezierLength(
              {x: p0[p0.length-2], y: p0[p0.length-1]},
              {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, {x: cmd[5], y: cmd[6]}
          );
      }

      if (length > 0) {
          this.hudLabel = new fabric.Text(`${length.toFixed(1)}mm`, {
              left: x + 20, top: y - 20, fontSize: 14, fontWeight: 'bold', fill: 'white',
              backgroundColor: '#3b82f6', padding: 6, rx: 4, ry: 4, selectable: false, evented: false, fontFamily: 'Inter, sans-serif'
          } as any);
          this.canvas.add(this.hudLabel);
      }
  }

  private ensurePerpendicularJoin(cmdIndex: number) {
      const pathArr = this.path.path as any[];
      const cmd = pathArr[cmdIndex];
      const prevCmd = pathArr[cmdIndex - 1];
      const nextCmd = pathArr[cmdIndex + 1];
      if (!prevCmd || !nextCmd) return;
      
      if (prevCmd[0] === 'L' && nextCmd[0] === 'C') {
          const s = { x: cmd[cmd.length-2], y: cmd[cmd.length-1] };
          const p0 = { x: prevCmd[prevCmd.length-2], y: prevCmd[prevCmd.length-1] };
          const shoulderAngle = getAngle(p0, s);
          const targetAngle = shoulderAngle - 90;
          const dist = distance(s, { x: nextCmd[1], y: nextCmd[2] });
          const newCP = pointFromAngle(s, targetAngle, dist);
          nextCmd[1] = newCP.x;
          nextCmd[2] = newCP.y;
      }
  }

  private syncCounterpartPoint(label: string, x: number, y: number) {
      const counterpart = this.canvas.getObjects().find(o => (o as any).id === (this.path as any).counterpartId) as fabric.Path;
      if (!counterpart) return;
      const labels = (counterpart as any).pointLabels || {};
      const targetIdx = Object.keys(labels).find(k => labels[k] === label);
      if (targetIdx !== undefined) {
          const idx = parseInt(targetIdx);
          const cmd = counterpart.path[idx] as any;
          if (label.toLowerCase().includes("hem")) {
              // Apply Y translation for hem sync
              cmd[cmd.length - 1] = y;
          } else {
              cmd[cmd.length - 2] = x;
              cmd[cmd.length - 1] = y;
          }
          counterpart.set({ path: [...counterpart.path], dirty: true });
          (counterpart as any)._editor?.forceCleanRefresh();
      }
  }

  mirror() {
      const pathData = this.path.path as any[];
      const mirroredData = pathData.map(cmd => {
          const newCmd = [...cmd];
          if (newCmd[0] === 'Z') return newCmd;
          for (let i = 1; i < newCmd.length; i += 2) {
              newCmd[i] = -newCmd[i];
          }
          return newCmd;
      }).reverse();

      const first = mirroredData[0];
      if (first[0] === 'Z') mirroredData.shift(); 
      mirroredData[0][0] = 'M';

      const combined = [...pathData, ...mirroredData];
      this.path.set({ path: combined });
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  addNotchAt(cmdIndex: number) {
      (this.path as any).notches.push({ cmdIndex });
      this.drawNotches();
      const label = this.pointLabels[cmdIndex];
      if (label && (this.path as any).counterpartId) {
          const counterpart = this.canvas.getObjects().find(o => (o as any).id === (this.path as any).counterpartId) as any;
          if (counterpart) {
              const cpLabels = counterpart.pointLabels || {};
              const cpIdx = Object.keys(cpLabels).find(k => cpLabels[k] === label);
              if (cpIdx !== undefined) {
                  counterpart.notches = counterpart.notches || [];
                  counterpart.notches.push({ cmdIndex: parseInt(cpIdx) });
              }
          }
      }
  }

  private notchObjects: fabric.Object[] = [];
  drawNotches() {
      this.notchObjects.forEach(o => this.canvas.remove(o));
      this.notchObjects = [];
      const notches = (this.path as any).notches || [];
      const pathArr = this.path.path as any[];
      const matrix = this.path.calcTransformMatrix();
      const offset = this.path.pathOffset;
      
      notches.forEach((n: any) => {
          const cmd = pathArr[n.cmdIndex];
          const prevCmd = pathArr[n.cmdIndex - 1];
          if (!cmd || !prevCmd) return;

          const p0 = { x: prevCmd[prevCmd.length - 2], y: prevCmd[prevCmd.length - 1] };
          const p1 = { x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] };
          
          let angle = 0;
          if (cmd[0] === 'L') {
              angle = getAngle(p0, p1);
          } else if (cmd[0] === 'C') {
              // Tangent at t=1 (end of curve)
              const tx = 3 * (p1.x - cmd[3]);
              const ty = 3 * (p1.y - cmd[4]);
              angle = Math.atan2(ty, tx) * (180 / Math.PI);
          }

          const pt = fabric.util.transformPoint(new fabric.Point(p1.x - (offset.x || 0), p1.y - (offset.y || 0)), matrix);
          const notchLine = new fabric.Line([0, -5, 0, 5], {
              stroke: '#ef4444',
              strokeWidth: 2.5,
              left: pt.x,
              top: pt.y,
              angle: angle + 90, // Perpendicular
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false
          });
          this.notchObjects.push(notchLine);
          this.canvas.add(notchLine);
      });
  }

  private grainLineObj: fabric.Group | null = null;
  drawGrainLine() {
      if (this.grainLineObj) this.canvas.remove(this.grainLineObj);
      const matrix = this.path.calcTransformMatrix();
      const center = fabric.util.transformPoint(new fabric.Point(0, 0), matrix);
      const line = new fabric.Line([0, -50, 0, 50], { stroke: '#1e293b', strokeWidth: 1.5 });
      const arrowTop = new fabric.Triangle({ width: 8, height: 8, fill: '#1e293b', left: 0, top: -50, originX: 'center', originY: 'bottom' });
      const arrowBottom = new fabric.Triangle({ width: 8, height: 8, fill: '#1e293b', left: 0, top: 50, originX: 'center', originY: 'top', angle: 180 });
      this.grainLineObj = new fabric.Group([line, arrowTop, arrowBottom], {
          left: center.x, top: center.y, angle: (this.path as any).grainLine?.angle || 0, selectable: true, hasControls: true, 
          borderColor: 'transparent', cornerColor: '#3b82f6', cornerSize: 6, transparentCorners: false
      });
      this.canvas.add(this.grainLineObj);
  }

  updateConnectionLines() {
      this.connectionLines.forEach(l => this.canvas.remove(l));
      this.connectionLines = [];
      const pathArr = this.path.path as any[];
      const matrix = this.path.calcTransformMatrix();
      const offset = this.path.pathOffset;
      const getCanvasPoint = (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x - (offset.x || 0), y - (offset.y || 0)), matrix);

      pathArr.forEach((cmd, i) => {
          if (cmd[0] === 'Q') {
              const p0 = pathArr[i-1];
              this.addLine(getCanvasPoint(p0[p0.length-2], p0[p0.length-1]), getCanvasPoint(cmd[1], cmd[2]));
          } else if (cmd[0] === 'C') {
              const p0 = pathArr[i-1];
              this.addLine(getCanvasPoint(p0[p0.length-2], p0[p0.length-1]), getCanvasPoint(cmd[1], cmd[2]));
              this.addLine(getCanvasPoint(cmd[5], cmd[6]), getCanvasPoint(cmd[3], cmd[4]));
          }
      });
  }

  private addLine(p1: fabric.Point, p2: fabric.Point) {
      const line = new fabric.Line([p1.x, p1.y, p2.x, p2.y], { 
          stroke: '#3b82f6', 
          strokeWidth: 2, 
          selectable: false, 
          evented: false, 
          opacity: 0.8, 
          strokeDashArray: [4, 3] 
      });
      this.connectionLines.push(line);
      this.canvas.add(line);
  }

  updateMeasurements() {
      this.labels.forEach(l => this.canvas.remove(l));
      this.labels = [];
      const pathArr = this.path.path as any[];
      const matrix = this.path.calcTransformMatrix();
      const offset = this.path.pathOffset;
      const getCanvasPoint = (x: number, y: number) => fabric.util.transformPoint(new fabric.Point(x - (offset.x || 0), y - (offset.y || 0)), matrix);

      pathArr.forEach((cmd, i) => {
          let length = 0;
          let labelText = this.pointLabels[i] || '';
          let posX = 0, posY = 0;

          if (cmd[0] === 'M') { posX = cmd[1]; posY = cmd[2]; }
          else if (cmd[0] === 'L') {
              const p0 = pathArr[i-1];
              length = distance({x: p0[p0.length-2], y: p0[p0.length-1]}, {x: cmd[1], y: cmd[2]});
              posX = cmd[1]; posY = cmd[2];
          } else if (cmd[0] === 'C') {
              const p0 = pathArr[i-1];
              length = getCubicBezierLength({x: p0[p0.length-2], y: p0[p0.length-1]}, {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, {x: cmd[5], y: cmd[6]});
              posX = cmd[5]; posY = cmd[6];
          }

          if (labelText || length > 0) {
              const cp = getCanvasPoint(posX, posY);
              const text = new fabric.Text(`${labelText ? labelText + ': ' : ''}${length > 0 ? Math.round(length) + 'mm' : ''}`, {
                  left: cp.x + 10, top: cp.y - 10, fontSize: 10, fill: '#64748b', selectable: false, evented: false, fontFamily: 'Inter, sans-serif'
              });
              this.labels.push(text);
              this.canvas.add(text);
          }
      });
  }

  checkSeamSymmetry() {
      const counterpartId = (this.path as any).counterpartId;
      if (!counterpartId) return;
      const counterpart = this.canvas.getObjects().find(o => (o as any).id === counterpartId) as fabric.Path;
      if (!counterpart) return;
      const pathArr = this.path.path as any[];
      const cpPath = counterpart.path as any[];
      const cpLabels = (counterpart as any).pointLabels || {};

      this.updateSegmentPaths();
      this.canvas.requestRenderAll();
  }

  getSeamStatus(): { label: string, diff: number, status: 'ok' | 'fail' | 'warn' }[] {
      const counterpartId = (this.path as any).counterpartId;
      if (!counterpartId) return [];
      const counterpart = this.canvas.getObjects().find(o => (o as any).id === counterpartId) as fabric.Path;
      if (!counterpart) return [];
      const pathArr = this.path.path as any[];
      const cpLabels = (counterpart as any).pointLabels || {};
      const results: { label: string, diff: number, status: 'ok' | 'fail' | 'warn' }[] = [];

      pathArr.forEach((cmd, i) => {
          const label = this.pointLabels[i];
          if (!label || !this.joinPoints.has(i)) return;
          const cpIdx = Object.keys(cpLabels).find(k => cpLabels[k] === label);
          if (cpIdx !== undefined) {
              const idx = parseInt(cpIdx);
              const lenA = this.getSegmentLength(pathArr, i);
              const lenB = this.getSegmentLength(counterpart.path as any[], idx);
              const diff = Math.abs(lenA - lenB);
              results.push({
                  label,
                  diff,
                  status: diff > 3 ? 'fail' : (diff > 1.5 ? 'warn' : 'ok')
              });
          }
      });
      return results;
  }

  getGradedPath(size: string): any[] {
      const pathArr = JSON.parse(JSON.stringify(this.path.path)); // Deep clone
      if (size === 'M') return pathArr; // Base size

      pathArr.forEach((cmd: any[], i: number) => {
          const label = this.pointLabels[i];
          if (!label) return;

          // Find Grading Rule
          const rule = GRADING_TABLE[label]?.[size];
          if (!rule) return;

          let { dx, dy } = rule;

          // Handle Symmetry/Mirroring (if label indicates Left/Right specific or based on pattern side)
          // Assumption: dx in grading table is for the "Right" side (positive X).
          // If the pattern is mirrored (e.g., using "mirror" tool logic, though here we might be grading a base piece).
          // For now, we apply dx directly. Ideally, we need to know if this point is on the "Reflected" side.
          // In standard block patterns, "Side Seam" usually moves OUT.
          
          // Apply Delta to Anchor Point
          // Anchor is always the last 2 params of the command
          const anchorXIdx = cmd.length - 2;
          const anchorYIdx = cmd.length - 1;

          const oldX = cmd[anchorXIdx];
          const oldY = cmd[anchorYIdx];
          
          cmd[anchorXIdx] += dx;
          cmd[anchorYIdx] += dy;

          // Proportional Grading for Control Points
          // If it's a Curve (C or Q), we need to shift control points too.
          // Simple strategy: Shift them by the SAME delta as the anchor.
          // This preserves the "shape" of the curve relative to the anchor.
          if (cmd[0] === 'C') {
              // cp1 (index 1,2) and cp2 (index 3,4)
              // Ideally cp1 moves with the *previous* anchor's delta, and cp2 moves with *this* anchor's delta.
              // But we don't easily have previous delta here without a first pass.
              // SIMPLIFIED STRATEGY for robust MVP: Move CP1 with 50% of previous delta + 50% of current delta?
              // OR: Just move them with the current delta.
              
              // Better Strategy:
              // CP2 is attached to THIS anchor -> Move by (dx, dy)
              cmd[3] += dx;
              cmd[4] += dy;

              // CP1 is attached to PREVIOUS anchor -> We need the previous point's delta.
              // Let's do a two-pass approach or look up previous label.
              const prevLabel = this.pointLabels[i-1];
              if (prevLabel) {
                   const prevRule = GRADING_TABLE[prevLabel]?.[size] || { dx: 0, dy: 0 };
                   cmd[1] += prevRule.dx;
                   cmd[2] += prevRule.dy;
              } else {
                   // If no previous label, maybe it's static? or move with current?
                   // Default to moving with current to avoid wild distortion if unlabelled.
                   cmd[1] += dx; 
                   cmd[2] += dy;
              }
          } else if (cmd[0] === 'Q') {
               // Quad curve: 1 CP. It's usually "between" points.
               // Move by average of previous delta and current delta (if available)
               const prevLabel = this.pointLabels[i-1];
               const prevRule = prevLabel ? (GRADING_TABLE[prevLabel]?.[size] || { dx: 0, dy: 0 }) : { dx, dy };
               
               cmd[1] += (dx + prevRule.dx) / 2;
               cmd[2] += (dy + prevRule.dy) / 2;
          }
      });

      return pathArr;
  }

  setSegmentColorOverride(idx: number, color: string) {
      this.segmentColors[idx] = color;
      this.updateSegmentPaths();
  }

  clearSegmentColorOverride(idx: number) {
      delete this.segmentColors[idx];
      this.updateSegmentPaths();
  }

  getSegmentLength(path: any[], i: number): number {
      const cmd = path[i];
      const p0cmd = path[i-1];
      const p0 = {x: p0cmd[p0cmd.length-2], y: p0cmd[p0cmd.length-1]};
      if (cmd[0] === 'L') return distance(p0, {x: cmd[1], y: cmd[2]});
      if (cmd[0] === 'C') return getCubicBezierLength(p0, {x: cmd[1], y: cmd[2]}, {x: cmd[3], y: cmd[4]}, {x: cmd[5], y: cmd[6]});
      if (cmd[0] === 'Q') return distance(p0, {x: cmd[3], y: cmd[4]}); // Approx for Quad: Linear distance for now or integrate?
      return 0;
  }

  setSegmentLength(cmdIndex: number, newLengthMM: number) {
      const pathArr = this.path.path as any[];
      const cmd = pathArr[cmdIndex];
      const prevCmd = pathArr[cmdIndex-1];
      if (!cmd || !prevCmd) return;

      const p0 = {x: prevCmd[prevCmd.length-2], y: prevCmd[prevCmd.length-1]};
      
      if (cmd[0] === 'L') {
          // Linear: Extend vector from p0
          const currentLen = distance(p0, {x: cmd[1], y: cmd[2]});
          if (currentLen === 0) return;
          const ratio = newLengthMM / currentLen;
          const dx = cmd[1] - p0.x;
          const dy = cmd[2] - p0.y;
          
          cmd[1] = p0.x + (dx * ratio);
          cmd[2] = p0.y + (dy * ratio);
      } else if (cmd[0] === 'C') {
          // Bezier: Scale all control points relative to p0? 
          // Or just move end point and stretch controls?
          // Simplest reliable way: Scale the whole curve relative to Start Point (p0).
          // This preserves shape curvature but changes arc length.
          
          // Iterative approximation for Arc Length scaling?
          // Or geometric scaling of hull.
          // Let's scale the hull points (cp1, cp2, end) from p0.
          const currentLen = this.getSegmentLength(pathArr, cmdIndex);
          if (currentLen === 0) return;
          const ratio = newLengthMM / currentLen;
          
          const scalePt = (pt: {x:number, y:number}) => ({
              x: p0.x + (pt.x - p0.x) * ratio,
              y: p0.y + (pt.y - p0.y) * ratio
          });

          // CP1
          const cp1 = scalePt({x: cmd[1], y: cmd[2]});
          cmd[1] = cp1.x; cmd[2] = cp1.y;

          // CP2
          const cp2 = scalePt({x: cmd[3], y: cmd[4]});
          cmd[3] = cp2.x; cmd[4] = cp2.y;

          // End
          const end = scalePt({x: cmd[5], y: cmd[6]});
          cmd[5] = end.x; cmd[6] = end.y;
      }

      this.path.set({ path: [...pathArr], dirty: true });
      this.forceCleanRefresh();
      this.showHandles(); // Refresh handles
      this.canvas.requestRenderAll();
  }

  calculateConsumption(): number {
      const points: Point[] = [];
      const pathArr = this.path.path as any[];
      pathArr.forEach(cmd => {
          if (cmd[0] !== 'Z') points.push({x: cmd[cmd.length-2], y: cmd[cmd.length-1]});
      });
      const areaMM2 = getPolygonArea(points);
      return areaMM2 / 1000000; 
  }

  grade(targetSize: string) {
      if (!this.basePath) return;
      
      // Reset to Medium (Base) first
      const pathArr = JSON.parse(JSON.stringify(this.basePath));
      
      pathArr.forEach((cmd: any, i: number) => {
          if (cmd[0] === 'Z') return;
          const label = this.pointLabels[i];
          if (!label || !GRADING_TABLE[label]) return;

          const grading = GRADING_TABLE[label][targetSize];
          if (!grading) return;

          // Apply to main anchor
          const xIdx = cmd.length - 2;
          const yIdx = cmd.length - 1;
          cmd[xIdx] += grading.dx;
          cmd[yIdx] += grading.dy;

          // Apply to control points to maintain arc
          if (cmd[0] === 'C') {
              cmd[1] += grading.dx;
              cmd[2] += grading.dy;
              cmd[3] += grading.dx;
              cmd[4] += grading.dy;
          } else if (cmd[0] === 'Q') {
              cmd[1] += grading.dx;
              cmd[2] += grading.dy;
          }
      });
      this.forceCleanRefresh();
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  applyParametricMeasurements(measurements: { bust: number, waist: number, hip: number, length: number }) {
      if (!this.basePath) return;
      const pathArr = JSON.parse(JSON.stringify(this.basePath));
      
      const baseBust = 920; 
      const baseLength = 1800; // From my upscaled Sloper
      
      const bustDelta = (measurements.bust - baseBust) / 4;
      const lengthDelta = measurements.length - baseLength;

      pathArr.forEach((cmd: any, i: number) => {
          const label = this.pointLabels[i] || "";
          
          // Width Drive (X)
          if (label.includes("Underarm") || label.includes("Hem-Side") || label.includes("Shoulder-Armhole")) {
              const xIdx = cmd.length - 2;
              cmd[xIdx] += bustDelta;
              if (cmd[0] === 'C') { cmd[1] += bustDelta; cmd[3] += bustDelta; }
          }

          // Length Drive (Y)
          if (label.includes("Hem")) {
              const yIdx = cmd.length - 1;
              cmd[yIdx] += lengthDelta;
          }
      });

      this.path.set({ path: pathArr, dirty: true });
      this.forceCleanRefresh();
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  applyGrading(deltaX: number, deltaY: number) {
      const pathArr = this.path.path as any[];
      pathArr.forEach(cmd => {
          if (cmd[0] === 'Z') return;
          for (let i = 1; i < cmd.length; i += 2) {
              cmd[i] += deltaX;
              cmd[i+1] += deltaY;
          }
      });
      this.path.set({ path: [...pathArr], dirty: true });
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  toggleNodeType(cmdIndex: number) {
      const pathArr = this.path.path as any[];
      const cmd = pathArr[cmdIndex];
      if (!cmd || cmd[0] === 'M' || cmd[0] === 'Z') return;

      if (cmd[0] === 'L') {
          const prev = pathArr[cmdIndex - 1];
          if (!prev) return;
          const px = prev[prev.length - 2], py = prev[prev.length - 1];
          const cx = cmd[1], cy = cmd[2];
          // Convert to Cubic Bezier with default control points
          pathArr[cmdIndex] = ['C', px + 50, py, cx - 50, cy, cx, cy];
      } else if (cmd[0] === 'C') {
          // Convert back to straight Line
          pathArr[cmdIndex] = ['L', cmd[5], cmd[6]];
      } else if (cmd[0] === 'Q') {
          pathArr[cmdIndex] = ['L', cmd[3], cmd[4]];
      }

      this.path.set({ path: [...pathArr], dirty: true });
      this.forceCleanRefresh();
      this.showHandles();
      this.canvas.requestRenderAll();
  }



  adjustDistance(cmdIdxA: number, cmdIdxB: number, targetMM: number) {
      const pathArr = this.path.path as any[];
      const pA = { x: pathArr[cmdIdxA][pathArr[cmdIdxA].length-2], y: pathArr[cmdIdxA][pathArr[cmdIdxA].length-1] };
      const pB = { x: pathArr[cmdIdxB][pathArr[cmdIdxB].length-2], y: pathArr[cmdIdxB][pathArr[cmdIdxB].length-1] };
      const currentDist = distance(pA, pB);
      if (currentDist === 0) return;
      const ratio = targetMM / currentDist;
      const dx = (pB.x - pA.x) * ratio;
      const dy = (pB.y - pA.y) * ratio;
      pathArr[cmdIdxB][pathArr[cmdIdxB].length-2] = pA.x + dx;
      pathArr[cmdIdxB][pathArr[cmdIdxB].length-1] = pA.y + dy;
      this.path.set({ path: [...pathArr], dirty: true });
      this.forceCleanRefresh();
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  splitSegment(endIdx: number) {
      const pathArr = this.path.path as any[];
      const cmd = pathArr[endIdx];
      const prevCmd = pathArr[endIdx - 1];
      if (!prevCmd || !cmd) return;

      const p0 = { x: prevCmd[prevCmd.length - 2], y: prevCmd[prevCmd.length - 1] };
      const p1 = { x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] };

      if (cmd[0] === 'L') {
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;
          const newCmd = ['L', midX, midY];
          pathArr.splice(endIdx, 0, newCmd);
      } else if (cmd[0] === 'C') {
          // De Casteljau's algorithm to split Cubic Bezier at t=0.5
          const cp1 = { x: cmd[1], y: cmd[2] };
          const cp2 = { x: cmd[3], y: cmd[4] };
          const p3 = p1;

          // Level 1
          const q0 = { x: (p0.x + cp1.x) / 2, y: (p0.y + cp1.y) / 2 };
          const q1 = { x: (cp1.x + cp2.x) / 2, y: (cp1.y + cp2.y) / 2 };
          const q2 = { x: (cp2.x + p3.x) / 2, y: (cp2.y + p3.y) / 2 };

          // Level 2
          const r0 = { x: (q0.x + q1.x) / 2, y: (q0.y + q1.y) / 2 };
          const r1 = { x: (q1.x + q2.x) / 2, y: (q1.y + q2.y) / 2 };

          // Level 3 (The split point)
          const s0 = { x: (r0.x + r1.x) / 2, y: (r0.y + r1.y) / 2 };

          // First half: p0, q0, r0, s0
          const firstHalf = ['C', q0.x, q0.y, r0.x, r0.y, s0.x, s0.y];
          // Second half: s0, r1, q2, p3
          const secondHalf = ['C', r1.x, r1.y, q2.x, q2.y, p3.x, p3.y];

          pathArr[endIdx] = secondHalf;
          pathArr.splice(endIdx, 0, firstHalf);
      } else {
          return;
      }

      // Shift Metadata
      const shiftMetadata = (record: Record<number, any>) => {
          const newRecord: Record<number, any> = {};
          Object.keys(record).forEach(k => {
              const idx = parseInt(k);
              if (idx >= endIdx) newRecord[idx + 1] = record[idx];
              else newRecord[idx] = record[idx];
          });
          return newRecord;
      };

      this.pointLabels = shiftMetadata(this.pointLabels);
      (this.path as any).pointLabels = this.pointLabels;
      
      const newJoinPoints = new Set<number>();
      this.joinPoints.forEach(idx => {
          if (idx >= endIdx) newJoinPoints.add(idx + 1);
          else newJoinPoints.add(idx);
      });
      this.joinPoints = newJoinPoints;

      if ((this.path as any).notches) {
          (this.path as any).notches.forEach((n: any) => {
              if (n.cmdIndex >= endIdx) n.cmdIndex++;
          });
      }

      this.path.set({ 
          path: [...pathArr], 
          dirty: true 
      });
      this.forceCleanRefresh();
      this.showHandles();
      this.canvas.requestRenderAll();
  }

  makeParallel(initialEndIdx: number, distanceMM: number = 20) {
      const pathArr = this.path.path as any[];
      const matrix = this.path.calcTransformMatrix();
      const offset = this.path.pathOffset;
      const zoom = this.canvas.getZoom();
      
      let endIdx = initialEndIdx;

      // 1. IMPROVED: Find the ACTUAL closest segment to the lastClickPoint
      // This bypasses any handle mapping issues and respects the user's intent.
      if (this.lastClickPoint) {
          const invMatrix = fabric.util.invertTransform(matrix);
          const localClick = fabric.util.transformPoint(new fabric.Point(this.lastClickPoint.x, this.lastClickPoint.y), invMatrix);
          
          let minDistance = Infinity;
          let bestIdx = endIdx;

          for (let i = 1; i < pathArr.length; i++) {
              const cmd = pathArr[i];
              const prev = pathArr[i-1];
              const pStart = { x: prev[prev.length-2] - offset.x, y: prev[prev.length-1] - offset.y };
              let dist = Infinity;

              if (cmd[0] === 'L') {
                  const pEnd = { x: cmd[1] - offset.x, y: cmd[2] - offset.y };
                  const nearest = getNearestPointOnLine(localClick, pStart, pEnd);
                  dist = distance(localClick, nearest);
              } else if (cmd[0] === 'C') {
                  const pEnd = { x: cmd[5] - offset.x, y: cmd[6] - offset.y };
                  const result = getNearestPointOnCubicBezier(localClick, pStart, {x: cmd[1]-offset.x, y: cmd[2]-offset.y}, {x: cmd[3]-offset.x, y: cmd[4]-offset.y}, pEnd);
                  dist = result.distance;
              } else if (cmd[0] === 'Z') {
                  const first = pathArr[0];
                  const pEnd = { x: first[1] - offset.x, y: first[2] - offset.y };
                  const nearest = getNearestPointOnLine(localClick, pStart, pEnd);
                  dist = distance(localClick, nearest);
              }

              if (dist < minDistance) {
                  minDistance = dist;
                  bestIdx = i;
              }
          }
          endIdx = bestIdx;
      }

      const cmd = pathArr[endIdx];
      const prevCmd = pathArr[endIdx - 1];
      if (!cmd || !prevCmd) return;

      // 2. Get local points for the targeted segment
      const lp0 = { x: prevCmd[prevCmd.length - 2] - (offset.x || 0), y: prevCmd[prevCmd.length - 1] - (offset.y || 0) };
      let lp1: Point;
      if (cmd[0] === 'Z') {
          const first = pathArr[0];
          lp1 = { x: first[1] - (offset.x || 0), y: first[2] - (offset.y || 0) };
      } else {
          lp1 = { x: cmd[cmd.length - 2] - (offset.x || 0), y: cmd[cmd.length - 1] - (offset.y || 0) };
      }
      
      // 3. Calculate local normal
      const ldx = lp1.x - lp0.x;
      const ldy = lp1.y - lp0.y;
      const llen = Math.sqrt(ldx * ldx + ldy * ldy);
      if (llen === 0) return;
      
      let localNormal = { x: -ldy / llen, y: ldx / llen };
      
      // 4. Side detection in local space (Robust Click Check)
      if (this.lastClickPoint) {
          const invMatrix = fabric.util.invertTransform(matrix);
          const localClick = fabric.util.transformPoint(new fabric.Point(this.lastClickPoint.x, this.lastClickPoint.y), invMatrix);
          const mid = { x: (lp0.x + lp1.x) / 2, y: (lp0.y + lp1.y) / 2 };
          const v = { x: localClick.x - mid.x, y: localClick.y - mid.y };
          // Flip normal if click was on the other side
          if (v.x * localNormal.x + v.y * localNormal.y < 0) {
              localNormal.x *= -1;
              localNormal.y *= -1;
          }
      }

      // 5. Generate scene-space points (ignoring viewport zoom/pan)
      const toScene = (p: Point) => {
          let pt = fabric.util.transformPoint(new fabric.Point(p.x, p.y), matrix);
          if (this.canvas.viewportTransform) {
              pt = fabric.util.transformPoint(pt, fabric.util.invertTransform(this.canvas.viewportTransform));
          }
          return pt;
      };
      
      const c0 = toScene(lp0);
      const c1 = toScene(lp1);
      const cdx = c1.x - c0.x;
      const cdy = c1.y - c0.y;
      const clen = Math.sqrt(cdx * cdx + cdy * cdy);
      const canvasNormal = { x: -cdy / clen, y: cdx / clen };
      
      // Sync canvasNormal with localNormal direction
      const testP = toScene({ x: lp0.x + localNormal.x, y: lp0.y + localNormal.y });
      const testV = { x: testP.x - c0.x, y: testP.y - c0.y };
      if (testV.x * canvasNormal.x + testV.y * canvasNormal.y < 0) {
          canvasNormal.x *= -1; canvasNormal.y *= -1;
      }

      const offsetPX = distanceMM; // Scene space is 1:1 with mm
      const offX = canvasNormal.x * offsetPX;
      const offY = canvasNormal.y * offsetPX;

      // 6. Build the parallel path string
      let d = `M ${c0.x + offX} ${c0.y + offY} `;
      if (cmd[0] === 'L' || cmd[0] === 'Z') {
          d += `L ${c1.x + offX} ${c1.y + offY}`;
      } else if (cmd[0] === 'C') {
          const cp1 = toScene({ x: cmd[1] - (offset.x || 0), y: cmd[2] - (offset.y || 0) });
          const cp2 = toScene({ x: cmd[3] - (offset.x || 0), y: cmd[4] - (offset.y || 0) });
          d += `C ${cp1.x + offX} ${cp1.y + offY} ${cp2.x + offX} ${cp2.y + offY} ${c1.x + offX} ${c1.y + offY}`;
      }

      const newPath = new fabric.Path(d, {
          stroke: '#6366f1',
          strokeWidth: 2,
          fill: 'transparent',
          strokeDashArray: [5, 5],
          opacity: 0.8,
          selectable: true,
          hasControls: true,
          data: { isParallel: true, baseMidpoint: { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 }, normal: canvasNormal }
      } as any);

      (newPath as any).isParallel = true;
      (newPath as any).movementConstraint = {
          normal: canvasNormal,
          baseMidpoint: { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 },
          originalMidpoint: { x: (c0.x + c1.x) / 2 + offX, y: (c0.y + c1.y) / 2 + offY }
      };

      this.canvas.add(newPath);

      // Indicators
      const mid0X = (c0.x + c1.x) / 2;
      const mid0Y = (c0.y + c1.y) / 2;
      const mid1X = mid0X + offX;
      const mid1Y = mid0Y + offY;

      const dimLine = new fabric.Line([mid0X, mid0Y, mid1X, mid1Y], {
          stroke: '#ec4899', strokeWidth: 1.5, strokeDashArray: [2, 2], selectable: false, evented: false, opacity: 0.6
      });
      const label = new fabric.Text(`${distanceMM}mm`, {
          left: (mid0X + mid1X) / 2 + 5, top: (mid0Y + mid1Y) / 2, fontSize: 12, fontWeight: 'bold', fill: 'white', backgroundColor: '#ec4899', padding: 3, rx: 2, ry: 2, selectable: false, evented: false, fontFamily: 'Inter, sans-serif'
      } as any);

      (newPath as any).indicators = [dimLine, label];
      this.canvas.add(dimLine, label);
      this.canvas.setActiveObject(newPath);
      this.canvas.requestRenderAll();
  }

  hideHandles() {
    [...this.handles, ...this.connectionLines, ...this.labels, ...this.notchObjects, this.grainLineObj, this.hudLabel, ...this.segmentHandles].forEach(o => o && this.canvas.remove(o));
    this.handles = []; this.connectionLines = []; this.labels = []; this.notchObjects = []; this.grainLineObj = null; this.hudLabel = null; this.segmentHandles = [];
  }

  dispose() {
      this.hideHandles();
      if (this.path) {
          this.canvas.remove(this.path);
          (this.path as any)._editor = null;
      }
  }

  static nestItems(canvas: fabric.Canvas, fabricWidth: number = 1500, margin: number = 15) {
      const items = canvas.getObjects().filter(o => o.type === 'path' && !o.excludeFromExport) as fabric.Path[];
      let currentX = margin;
      let currentY = margin;
      let maxHeightInRow = 0;

      // Reset rotation to Grain Line (Grain line is 0 deg vertical usually)
      items.forEach(obj => {
          const gl = (obj as any).grainLine?.angle || 0;
          obj.set({ angle: -gl }); 
      });

      items.sort((a, b) => (b.height! * b.scaleY!) - (a.height! * a.scaleY!));

      items.forEach(obj => {
          const w = (obj.width! * obj.scaleX!) + margin;
          const h = (obj.height! * obj.scaleY!) + margin;

          if (currentX + w > fabricWidth) {
              currentX = margin;
              currentY += maxHeightInRow;
              maxHeightInRow = 0;
          }

          obj.set({ 
              left: currentX + (obj.width! * obj.scaleX! / 2) - ((obj as any).pathOffset.x * obj.scaleX!), 
              top: currentY + (obj.height! * obj.scaleY! / 2) - ((obj as any).pathOffset.y * obj.scaleY!)
          });
          
          currentX += w;
          maxHeightInRow = Math.max(maxHeightInRow, h);
          obj.setCoords();
      });
      canvas.requestRenderAll();
  }

  static async exportToPDF(canvas: fabric.Canvas, filename: string = 'pattern.pdf') {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const overlap = 20;
      const scale = 1; // 1:1

      const items = canvas.getObjects().filter(o => o.type === 'path' && !o.excludeFromExport) as fabric.Path[];
      if (items.length === 0) return;

      // Group items to find total bounding box
      const tempGroup = new fabric.Group(items);
      const bounds = tempGroup.getBoundingRect();
      canvas.remove(tempGroup);

      const totalWidth = bounds.width;
      const totalHeight = bounds.height;

      const cols = Math.ceil(totalWidth / (pageWidth - overlap));
      const rows = Math.ceil(totalHeight / (pageHeight - overlap));

      for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
              if (r > 0 || c > 0) doc.addPage();

              // Drawing offset
              const offsetX = -bounds.left - (c * (pageWidth - overlap));
              const offsetY = -bounds.top - (r * (pageHeight - overlap));

              // Calibration Square (100x100mm) on first page
              if (r === 0 && c === 0) {
                  doc.setDrawColor(0);
                  doc.rect(5, 5, 100, 100);
                  doc.setFontSize(8);
                  doc.text('CALIBRATION: 100mm x 100mm', 10, 10);
              }

              // Registration Crosshairs
              doc.setDrawColor(200);
              doc.line(0, 0, 10, 10); doc.line(0, 10, 10, 0); // Corner
              
              items.forEach(item => {
                  const path = item.path as any[];
                  const matrix = item.calcTransformMatrix();
                  
                  doc.setDrawColor(0);
                  doc.setLineWidth(0.5);

                  const pdfPath: { op: string, c: number[] }[] = [];
                  path.forEach(cmd => {
                      const type = cmd[0];
                      const pts: number[] = [];
                      for (let i = 1; i < cmd.length; i += 2) {
                          const p = fabric.util.transformPoint(new fabric.Point(cmd[i] - (item as any).pathOffset.x, cmd[i+1] - (item as any).pathOffset.y), matrix);
                          pts.push(p.x + offsetX, p.y + offsetY);
                      }

                      if (type === 'M') {
                          pdfPath.push({ op: 'm', c: [pts[0], pts[1]] });
                      } else if (type === 'L') {
                          pdfPath.push({ op: 'l', c: [pts[0], pts[1]] });
                      } else if (type === 'C') {
                          pdfPath.push({ op: 'c', c: [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]] });
                      } else if (type === 'Z') {
                          pdfPath.push({ op: 'h', c: [] }); // 'h' is close path in jsPDF
                      }
                  });
                  (doc as any).path(pdfPath);
                  doc.stroke();
              });

              doc.setFontSize(6);
              doc.text(`Page ${r * cols + c + 1} (Row ${r+1}, Col ${c+1})`, pageWidth - 30, 5);
          }
      }

      doc.save(filename);
  }
}
