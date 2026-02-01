import ClipperLib from 'clipper-lib';

const SCALE = 1000; // Clipper uses integers, so we scale up

export class BooleanTools {
    /**
     * Performs boolean operations (Union, Difference, Intersection) on two paths.
     */
    static perform(pathA: any[], pathB: any[], type: 'union' | 'subtract' | 'intersect'): string | null {
        const polyA = this.flattenPath(pathA);
        const polyB = this.flattenPath(pathB);

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
        const points: { X: number; Y: number }[] = [];
        let curX = 0, curY = 0;

        path.forEach(cmd => {
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
            }
        });
        return points;
    }

    private static clipperToPathData(paths: any): string | null {
        if (!paths || paths.length === 0) return null;
        let d = '';
        paths.forEach((path: any) => {
            path.forEach((pt: any, i: number) => {
                d += (i === 0 ? 'M ' : 'L ') + (pt.X / SCALE) + ' ' + (pt.Y / SCALE) + ' ';
            });
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
}
