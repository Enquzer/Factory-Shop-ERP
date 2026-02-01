declare module 'clipper-lib' {
    export class Clipper {
        constructor();
        AddPaths(paths: any, polyType: any, closed: boolean): void;
        Execute(clipType: any, solution: any, subjFillType: any, clipFillType: any): boolean;
    }
    export enum ClipType { ctIntersection, ctUnion, ctDifference, ctXor }
    export enum PolyType { ptSubject, ptClip }
    export enum PolyFillType { pftEvenOdd, pftNonZero, pftPositive, pftNegative }
    export class Paths {}
}
