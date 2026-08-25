// Curated dot-to-dot shapes, same reasoning as src/lib/clipart.ts: letting an
// AI invent coordinates for a "recognisable shape" has the same reliability
// ceiling as letting it draw a free-form image (see the outline-image saga in
// generate-image/route.ts) — a small hand-picked library of straight-line-
// only point sequences is cheap, always renders correctly, and can grow one
// shape at a time exactly like the clipart set did.
export interface DotToDotShape {
  id: string;
  label: string;
  /** Points in a normalised 0–100 x/y space, walked in connect-the-dots order. */
  points: [number, number][];
  /** Draw a final line from the last point back to the first. Default true. */
  closed?: boolean;
}

export const DOT_TO_DOT_SHAPES: DotToDotShape[] = [
  {
    id: "star",
    label: "Star",
    points: [
      [50, 12], [59, 37], [86, 38], [65, 55], [72, 81],
      [50, 66], [28, 81], [35, 55], [14, 38], [41, 37],
    ],
  },
  {
    id: "heart",
    label: "Heart",
    points: [
      [50, 90], [22, 58], [12, 38], [22, 15], [50, 32], [78, 15], [88, 38], [78, 58],
    ],
  },
  {
    id: "house",
    label: "House",
    points: [[15, 90], [15, 50], [50, 15], [85, 50], [85, 90]],
  },
  {
    id: "fish",
    label: "Fish",
    points: [[20, 50], [35, 35], [60, 30], [85, 50], [60, 70], [35, 65]],
  },
  {
    id: "tree",
    label: "Tree",
    points: [[50, 10], [20, 60], [40, 60], [40, 90], [60, 90], [60, 60], [80, 60]],
  },
  {
    id: "kite",
    label: "Kite",
    points: [[50, 10], [80, 40], [50, 90], [20, 40]],
  },
  {
    id: "umbrella",
    label: "Umbrella",
    points: [[10, 45], [30, 20], [50, 12], [70, 20], [90, 45], [50, 45], [50, 90]],
    closed: false,
  },
  {
    id: "butterfly",
    label: "Butterfly",
    points: [[15, 20], [50, 50], [15, 80], [85, 80], [50, 50], [85, 20]],
  },
];
