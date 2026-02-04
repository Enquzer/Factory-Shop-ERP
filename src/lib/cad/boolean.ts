import ClipperLib from 'clipper-lib';

const SCALE = 1000; // Clipper uses integers, so we scale up

export class BooleanTools {
    /**
     * Performs boolean operations (Union, Difference, Intersection) on two paths.
     */
    static perform(pathA: any[], pathB: any[], type: 'union' | 'subtract' | 'intersect'): string | null {
        // Early validation before processing
        if (!pathA || !Array.isArray(pathA) || pathA.length === 0) {
            console.error('BooleanTools.perform: Invalid pathA', pathA);
            return null;
        }
        if (!pathB || !Array.isArray(pathB) || pathB.length === 0) {
            console.error('BooleanTools.perform: Invalid pathB', pathB);
            return null;
        }

        const polyA = this.flattenPath(pathA);
        const polyB = this.flattenPath(pathB);

        if (polyA.length === 0 || polyB.length === 0) {
            console.error('BooleanTools.perform: Flattening produced empty polygons');
            return null;
        }

        const clipper = new ClipperLib.Clipper();
        clipper.AddPaths([polyA], ClipperLib.PolyType.ptSubject, true);
        clipper.AddPaths([polyB], ClipperLib.PolyType.ptClip, true);

        const solution = new ClipperLib.Paths();
        const clipType = type === 'union' ? ClipperLib.ClipType.ctUnion :
                         type === 'subtract' ? ClipperLib.ClipType.ctDifference :
                         ClipperLib.ClipType.ctIntersection;

        clipper.Execute(clipType, solution, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);

        return this.clipperToPathData(solution);
    }

    /**
     * Creates a Seam Allowance (Offset) around a path.
     * @param path Original path
     * @param offsetMM Offset distance in millimeters (e.g., 10 for 10mm)
     */
    static createSeamAllowance(path: any[], offsetMM: number): string | null {
        const poly = this.flattenPath(path);
        const CL: any = ClipperLib;
        const co = new CL.ClipperOffset();
        co.AddPath(poly, CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
        
        const solution = new CL.Paths();
        co.Execute(solution, offsetMM * SCALE);

        return this.clipperToPathData(solution);
    }

    private static flattenPath(path: any[]): { X: number; Y: number }[] {
        if (!path || !Array.isArray(path)) {
            console.error('Invalid path data:', path);
            return [];
        }
        
        const points: { X: number; Y: number }[] = [];
        let curX = 0, curY = 0;

        path.forEach(cmd => {
            if (!cmd || !Array.isArray(cmd)) return;
            const type = cmd[0];
            if (type === 'M' || type === 'L') {
                curX = cmd[1]; curY = cmd[2];
                points.push({ X: curX * SCALE, Y: curY * SCALE });
            } else if (type === 'C') {
                // Adaptive flattening for Bezier (simplified: 10 segments)
                const p0 = { x: curX, y: curY };
                const cp1 = { x: cmd[1], y: cmd[2] };
                const cp2 = { x: cmd[3], y: cmd[4] };
                const p3 = { x: cmd[5], y: cmd[6] };
                
                for (let t = 0.1; t <= 1; t += 0.1) {
                    const x = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * cp1.x + 3 * (1 - t) * Math.pow(t, 2) * cp2.x + Math.pow(t, 3) * p3.x;
                    const y = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * cp1.y + 3 * (1 - t) * Math.pow(t, 2) * cp2.y + Math.pow(t, 3) * p3.y;
                    points.push({ X: x * SCALE, Y: y * SCALE });
                }
                curX = p3.x; curY = p3.y;
            } else if (type === 'Q') {
                // Quadratic Bezier
                const p0 = { x: curX, y: curY };
                const cp = { x: cmd[1], y: cmd[2] };
                const p2 = { x: cmd[3], y: cmd[4] };
                
                for (let t = 0.1; t <= 1; t += 0.1) {
                    const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * cp.x + Math.pow(t, 2) * p2.x;
                    const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * cp.y + Math.pow(t, 2) * p2.y;
                    points.push({ X: x * SCALE, Y: y * SCALE });
                }
                curX = p2.x; curY = p2.y;
            }
        });
        return points;
    }

    private static clipperToPathData(paths: any): string | null {
        if (!paths || paths.length === 0) return null;
        let d = '';
        paths.forEach((path: any) => {
            if (path.length === 0) return;
            const start = path[0];
            d += `M ${start.X / SCALE} ${start.Y / SCALE} `;
            for (let i = 1; i < path.length; i++) {
                d += `L ${path[i].X / SCALE} ${path[i].Y / SCALE} `;
            }
            d += 'Z ';
        });
        return d;
    }

    static union(pathA: any[], pathB: any[]): string | null {
        return this.perform(pathA, pathB, 'union');
    }

    static subtract(pathA: any[], pathB: any[]): string | null {
        return this.perform(pathA, pathB, 'subtract');
    }

    /**
     * Unions multiple paths into a single result.
     */
    static unionMultiple(allPaths: any[][]): string | null {
        if (!allPaths || allPaths.length === 0) return null;
        
        const clipper = new ClipperLib.Clipper();
        allPaths.forEach(p => {
            const poly = this.flattenPath(p);
            if (poly.length > 0) {
                clipper.AddPaths([poly], ClipperLib.PolyType.ptSubject, true);
            }
        });

        const solution = new ClipperLib.Paths();
        clipper.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);

        return this.clipperToPathData(solution);
    }

    /**
     * Inteligent tool to detect a closed region (cell) formed by intersecting paths.
     */
    static findClosedRegionAt(allPaths: any[][], point: {x: number, y: number}): string | null {
        if (allPaths.length === 0) return null;

        const CL: any = ClipperLib;

        // 1. Create a flattened wireframe of all segments
        const offset = new CL.ClipperOffset();
        allPaths.forEach(p => {
            const poly = this.flattenPath(p);
            if (poly.length < 2) return;
            // Add as open path with a tiny buffer to create the "ink"
            offset.AddPath(poly, CL.JoinType.jtMiter, CL.EndType.etOpenSquare);
        });

        const ink = new CL.Paths();
        offset.Execute(ink, 0.2 * SCALE); // 0.2mm "ink" thickness

        // 2. Define a bounding rectangle that covers all paths
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        allPaths.forEach(path => {
            path.forEach(cmd => {
                for (let i = 1; i < cmd.length; i += 2) {
                    minX = Math.min(minX, cmd[i]); minY = Math.min(minY, cmd[i+1]);
                    maxX = Math.max(maxX, cmd[i]); maxY = Math.max(maxY, cmd[i+1]);
                }
            });
        });

        // Expand bounds slightly
        const pad = 50;
        const boundingRect = [
            { X: (minX - pad) * SCALE, Y: (minY - pad) * SCALE },
            { X: (maxX + pad) * SCALE, Y: (minY - pad) * SCALE },
            { X: (maxX + pad) * SCALE, Y: (maxY + pad) * SCALE },
            { X: (minX - pad) * SCALE, Y: (maxY + pad) * SCALE }
        ];

        // 3. Subtract ink from bounding rectangle to get "holes" (closed regions)
        const clipper = new CL.Clipper();
        clipper.AddPath(boundingRect, CL.PolyType.ptSubject, true);
        clipper.AddPaths(ink, CL.PolyType.ptClip, true);
        
        const possibleRegions = new CL.Paths();
        clipper.Execute(CL.ClipType.ctDifference, possibleRegions, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);

        // 4. Find the region that contains the target point
        const pt = { X: point.x * SCALE, Y: point.y * SCALE };
        const totalBoundsWidth = maxX - minX;
        const totalBoundsHeight = maxY - minY;

        for (let i = 0; i < (possibleRegions as any).length; i++) {
            const region = (possibleRegions as any)[i];
            const result = CL.Clipper.PointInPolygon(pt, region);
            if (result !== 0) { 
                // FILTER: Is this the "Background" area?
                // The background area will have bounds almost equal to the boundingRect
                let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
                region.forEach((p: any) => {
                    rMinX = Math.min(rMinX, p.X); rMinY = Math.min(rMinY, p.Y);
                    rMaxX = Math.max(rMaxX, p.X); rMaxY = Math.max(rMaxY, p.Y);
                });

                const rW = (rMaxX - rMinX) / SCALE;
                const rH = (rMaxY - rMinY) / SCALE;

                // The background area will span the padded bounding box width/height.
                // PAD is 50, so the background width is roughly (maxX - minX) + 100.
                // We only skip if the hole is clearly the surrounding empty space.
                const viewportW = (maxX - minX) + (pad * 2);
                const viewportH = (maxY - minY) + (pad * 2);

                if (rW > viewportW * 0.98 && rH > viewportH * 0.98) {
                    continue; 
                }

                return this.clipperToPathData([region]);
            }
        }

        return null;
    }
}
