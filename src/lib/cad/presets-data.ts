export interface PresetPoint {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number; y?: number;
  cp1x?: number; cp1y?: number;
  cp2x?: number; cp2y?: number;
  label?: string;
  isJoin?: boolean;
}

export interface Preset {
  name: string;
  path: PresetPoint[];
  counterpart?: string;
}

export interface StyleCategory {
    name: string;
    components: Record<string, Preset>;
}

export const GRADING_TABLE: Record<string, Record<string, { dx: number, dy: number }>> = {
  "Center Neck": {
    "S": { dx: 0, dy: 0 },
    "L": { dx: 0, dy: 0 },
    "XL": { dx: 0, dy: 0 }
  },
  "Neck-Shoulder Join": {
    "S": { dx: -5, dy: -5 },
    "L": { dx: 5, dy: 5 },
    "XL": { dx: 10, dy: 10 }
  },
  "Shoulder-Armhole Join": {
    "S": { dx: -12.5, dy: -7.5 },
    "L": { dx: 12.5, dy: 7.5 },
    "XL": { dx: 25, dy: 15 }
  },
  "Underarm": {
    "S": { dx: -30, dy: 25 },
    "L": { dx: 30, dy: -25 },
    "XL": { dx: 60, dy: -50 }
  },
  "Hem-Side": {
    "S": { dx: -30, dy: -50 },
    "L": { dx: 30, dy: 50 },
    "XL": { dx: 60, dy: 100 }
  },
  "Hem-Center": {
    "S": { dx: 0, dy: -50 },
    "L": { dx: 0, dy: 50 },
    "XL": { dx: 0, dy: 100 }
  }
};

export const STYLE_LIBRARY: Record<string, StyleCategory> = {
    "t_shirt": {
        name: "Professional T-Shirt Block",
        components: {
            "front": {
                name: "Front Bodice",
                counterpart: "back",
                path: [
                    { type: 'M', x: 0, y: 0, label: "Center Neck" },
                    { type: 'C', cp1x: 100, cp1y: 0, cp2x: 200, cp2y: 100, x: 230, y: 200, label: "Neck-Shoulder Join", isJoin: true },
                    { type: 'L', x: 500, y: 150, label: "Shoulder-Armhole Join", isJoin: true }, 
                    { type: 'C', cp1x: 500, cp1y: 350, cp2x: 450, cp2y: 750, x: 580, y: 850, label: "Underarm" },
                    { type: 'L', x: 580, y: 1800, label: "Hem-Side" },
                    { type: 'L', x: 0, y: 1800, label: "Hem-Center" },
                    { type: 'Z' }
                ]
            },
            "back": {
                name: "Back Bodice",
                counterpart: "front",
                path: [
                    { type: 'M', x: 0, y: 0, label: "Center Neck" },
                    { type: 'C', cp1x: 100, cp1y: 0, cp2x: 200, cp2y: 20, x: 230, y: 50, label: "Neck-Shoulder Join", isJoin: true },
                    { type: 'L', x: 500, y: 30, label: "Shoulder-Armhole Join", isJoin: true },
                    { type: 'C', cp1x: 500, cp1y: 250, cp2x: 450, cp2y: 750, x: 580, y: 850, label: "Underarm" },
                    { type: 'L', x: 580, y: 1800, label: "Hem-Side" },
                    { type: 'L', x: 0, y: 1800, label: "Hem-Center" },
                    { type: 'Z' }
                ]
            }
        }
    }
};

export const GENERATORS: Record<string, () => Preset> = {
    "block": () => ({
        name: "Parametric Block",
        path: [
            { type: 'M', x: 0, y: 0, label: "Top-Left" },
            { type: 'L', x: 500, y: 0, label: "Top Seam" },
            { type: 'L', x: 500, y: 250, label: "Side Seam" },
            { type: 'L', x: 0, y: 250, label: "Bottom Seam" },
            { type: 'Z' }
        ]
    })
};
