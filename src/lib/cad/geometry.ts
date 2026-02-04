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
 * Finds the nearest point on a line segment (p1-p2) to point (p0).
 */
export function getNearestPointOnLine(p0: Point, p1: Point, p2: Point): Point {
    const L2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
    if (L2 === 0) return p1;
    let t = ((p0.x - p1.x) * (p2.x - p1.x) + (p0.y - p1.y) * (p2.y - p1.y)) / L2;
    t = Math.max(0, Math.min(1, t));
    return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
    };
}

/**
 * Finds the nearest point on a cubic bezier curve by sampling.
 */
export function getNearestPointOnCubicBezier(p0: Point, b0: Point, b1: Point, b2: Point, b3: Point, samples: number = 20): { point: Point, distance: number } {
    let minDistance = Infinity;
    let nearestPoint = b0;

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const pt = getBezierPoint(t, b0, b1, b2, b3);
        const dist = distance(p0, pt);
        if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = pt;
        }
    }
    return { point: nearestPoint, distance: minDistance };
}

/**
 * Finds the midpoint of a line segment.
 */
export function getLineMidpoint(p1: Point, p2: Point): Point {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

/**
 * Finds the midpoint of a cubic bezier curve (at t=0.5).
 */
export function getBezierMidpoint(p0: Point, p1: Point, p2: Point, p3: Point): Point {
    return getBezierPoint(0.5, p0, p1, p2, p3);
}

/**
 * Gets the normal vector of a line segment.
 */
export function getLineNormal(p1: Point, p2: Point): Point {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: -1 };
    return { x: -dy / len, y: dx / len };
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
