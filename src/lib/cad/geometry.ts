export interface Point {
  x: number;
  y: number;
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Basic Bezier helper (for future use with paper.js logic)
export function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;

  const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

  return { x, y };
}

export function getCubicBezierLength(p0: Point, p1: Point, p2: Point, p3: Point, samples: number = 20): number {
  let length = 0;
  let prevPoint = p0;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const currPoint = getBezierPoint(t, p0, p1, p2, p3);
    length += distance(prevPoint, currPoint);
    prevPoint = currPoint;
  }
  return length;
}

export function getQuadraticBezierLength(p0: Point, p1: Point, p2: Point, samples: number = 20): number {
    let length = 0;
    let prevPoint = p0;
    for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
        const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
        const currPoint = { x, y };
        length += distance(prevPoint, currPoint);
        prevPoint = currPoint;
    }
    return length;
}

export function getAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

export function snapToAngle(angle: number, snapDegrees: number = 45): number {
    return Math.round(angle / snapDegrees) * snapDegrees;
}

export function pointFromAngle(anchor: Point, angle: number, distance: number): Point {
    const rad = angle * (Math.PI / 180);
    return {
        x: anchor.x + Math.cos(rad) * distance,
        y: anchor.y + Math.sin(rad) * distance
    };
}

/**
 * Calculates area of a polygon using the Shoelace formula.
 * Used for fabric consumption calculation (m²).
 */
export function getPolygonArea(points: Point[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

/**
 * Verifies that 1 unit on canvas = 1mm real world.
 */
export function verifyScaleAccuracy(p1: Point, p2: Point, expectedMM: number): boolean {
    const dist = distance(p1, p2);
    const tolerance = 0.001; 
    const isAccurate = Math.abs(dist - expectedMM) < tolerance;
    if (!isAccurate) {
        console.error(`SCALE ERROR: Expected ${expectedMM}mm, got ${dist.toFixed(4)} units`);
    }
    return isAccurate;
}
