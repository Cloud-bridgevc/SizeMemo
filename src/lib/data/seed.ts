import { classifyWithRules } from "../ai/rules";
import type { CustomerProfile, FeedbackRecord, Pom, Product, SalesFigure, Size, SizeChart } from "../types";

/*
 * Entirely fictional demonstration data for "Maison Halden", an imaginary
 * apparel label. No real brand, product, customer or order is represented.
 *
 * The dataset is built to tell three stories:
 *   1. Linden Oxford Shirt is cut ~5 cm narrower at the chest than the brand's
 *      regular shirt block, and its returns say "tight across the chest".
 *      → potential sizing inconsistency (both signals agree).
 *   2. Ellis Pleated Trouser has a longer inseam than the block but customers
 *      rarely complain → measurement-only (likely an intentional design choice).
 *   3. Mara Wide-Leg Jean is on spec but returns say the waist gapes
 *      → feedback-only (look at fabric / stretch recovery, not grading).
 */

export const DEMO_BRAND = "Maison Halden";
const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];

type Spec = Partial<Record<Pom, number[]>>; // one value per size, XS..XL

function toSpecs(spec: Spec): Record<Size, Partial<Record<Pom, number>>> {
  const out: Record<Size, Partial<Record<Pom, number>>> = {};
  SIZES.forEach((size, i) => {
    out[size] = {};
    for (const [pom, values] of Object.entries(spec) as [Pom, number[]][]) out[size][pom] = values[i];
  });
  return out;
}

/** Apply per-POM offsets (cm) to a block, optionally only for some sizes. */
function fromBlock(
  block: SizeChart,
  offsets: Partial<Record<Pom, number>> = {},
  onlySizes?: Size[],
  jitter: Partial<Record<Pom, number[]>> = {},
): Record<Size, Partial<Record<Pom, number>>> {
  const out: Record<Size, Partial<Record<Pom, number>>> = {};
  SIZES.forEach((size, i) => {
    out[size] = {};
    for (const [pom, v] of Object.entries(block.specs[size]) as [Pom, number][]) {
      const apply = !onlySizes || onlySizes.includes(size);
      out[size][pom] = Math.round((v + (apply ? offsets[pom] ?? 0 : 0) + (jitter[pom]?.[i] ?? 0)) * 10) / 10;
    }
  });
  return out;
}

function omit(m: Record<Size, Partial<Record<Pom, number>>>, pom: Pom) {
  for (const size of Object.keys(m)) delete m[size][pom];
  return m;
}

export const SIZE_CHARTS: SizeChart[] = [
  {
    id: "chart-tops-regular",
    name: "Shirting & tops — Regular block",
    category: "tops",
    fitIntent: "regular",
    sizes: SIZES,
    specs: toSpecs({
      chest: [92, 98, 104, 110, 116],
      waist: [86, 92, 98, 104, 110],
      shoulder: [42, 43.5, 45, 46.5, 48],
      length: [70, 72, 74, 76, 78],
      sleeve: [61, 62.5, 64, 65.5, 67],
    }),
    tolerances: { chest: 2, waist: 2.5, shoulder: 1, length: 1.5, sleeve: 1.5 },
    notes: "Graded 6 cm chest / 1.5 cm shoulder per size. Base size M.",
  },
  {
    id: "chart-tops-relaxed",
    name: "Shirting & tops — Relaxed block",
    category: "tops",
    fitIntent: "relaxed",
    sizes: SIZES,
    specs: toSpecs({
      chest: [100, 106, 112, 118, 124],
      waist: [96, 102, 108, 114, 120],
      shoulder: [45, 46.5, 48, 49.5, 51],
      length: [72, 74, 76, 78, 80],
      sleeve: [59, 60.5, 62, 63.5, 65],
    }),
    tolerances: { chest: 2.5, waist: 3, shoulder: 1.5, length: 1.5, sleeve: 1.5 },
    notes: "Dropped shoulder; sleeve measured from shoulder seam, so shorter than regular.",
  },
  {
    id: "chart-bottoms-regular",
    name: "Trousers & denim — Regular block",
    category: "bottoms",
    fitIntent: "regular",
    sizes: SIZES,
    specs: toSpecs({
      waist: [72, 77, 82, 87, 92],
      hip: [94, 99, 104, 109, 114],
      rise: [26, 26.5, 27, 27.5, 28],
      inseam: [80, 81, 81, 82, 82],
    }),
    tolerances: { waist: 1.5, hip: 2, rise: 1, inseam: 1.5 },
    notes: "Waist measured relaxed along the top of the waistband.",
  },
  {
    id: "chart-outerwear-regular",
    name: "Outerwear — Regular block",
    category: "outerwear",
    fitIntent: "regular",
    sizes: SIZES,
    specs: toSpecs({
      chest: [102, 108, 114, 120, 126],
      waist: [98, 104, 110, 116, 122],
      shoulder: [44, 45.5, 47, 48.5, 50],
      length: [92, 94, 96, 98, 100],
      sleeve: [63, 64.5, 66, 67.5, 69],
    }),
    tolerances: { chest: 2.5, waist: 3, shoulder: 1, length: 2, sleeve: 1.5 },
    notes: "Sized to layer over knitwear.",
  },
  {
    id: "chart-dresses-regular",
    name: "Dresses — Regular block",
    category: "dresses",
    fitIntent: "regular",
    sizes: SIZES,
    specs: toSpecs({
      chest: [84, 89, 94, 100, 106],
      waist: [68, 73, 78, 84, 90],
      hip: [92, 97, 102, 108, 114],
      length: [104, 105, 106, 107, 108],
    }),
    tolerances: { chest: 2, waist: 2, hip: 2, length: 2 },
    notes: "Length measured from high point shoulder.",
  },
];

const chart = (id: string) => SIZE_CHARTS.find((c) => c.id === id)!;

function product(p: Omit<Product, "sizes" | "status" | "imageKey" | "imageRightsConfirmed"> & Partial<Product>): Product {
  return { sizes: SIZES, status: "active", imageKey: null, imageRightsConfirmed: false, ...p };
}

export const PRODUCTS: Product[] = [
  product({
    id: "p-linden",
    sku: "MH-SH-014",
    name: "Linden Oxford Shirt",
    category: "tops",
    fitIntent: "regular",
    fabric: "100% cotton oxford",
    stretch: false,
    colourway: "Chalk blue",
    sizeChartId: "chart-tops-regular",
    // Narrow pattern from a new factory: chest −5 cm and waist −4 cm from S upwards.
    measurements: fromBlock(chart("chart-tops-regular"), { chest: -5, waist: -4 }, ["S", "M", "L", "XL"], {
      chest: [-0.5, 0, 0.5, 0, -0.5],
      length: [0.5, 0, -0.5, 0, 0.5],
    }),
  }),
  product({
    id: "p-arden",
    sku: "MH-SH-009",
    name: "Arden Poplin Shirt",
    category: "tops",
    fitIntent: "regular",
    fabric: "100% cotton poplin",
    stretch: false,
    colourway: "Optic white",
    sizeChartId: "chart-tops-regular",
    measurements: fromBlock(chart("chart-tops-regular"), {}, undefined, { chest: [0.5, 0, -0.5, 0.5, 0], sleeve: [0, 0.5, 0, -0.5, 0] }),
  }),
  product({
    id: "p-calder",
    sku: "MH-KN-021",
    name: "Calder Merino Crew",
    category: "tops",
    fitIntent: "regular",
    fabric: "100% extra-fine merino, 12gg",
    stretch: true,
    colourway: "Oat marl",
    sizeChartId: "chart-tops-regular",
    measurements: fromBlock(chart("chart-tops-regular"), { chest: 1, length: -1 }),
  }),
  product({
    id: "p-wren",
    sku: "MH-JE-003",
    name: "Wren Pima Tee",
    category: "tops",
    fitIntent: "regular",
    fabric: "Pima cotton jersey, 180 gsm",
    stretch: true,
    colourway: "Ecru",
    sizeChartId: "chart-tops-regular",
    // Short-sleeved: sleeve is not tracked against the long-sleeve block.
    measurements: omit(fromBlock(chart("chart-tops-regular"), { length: -1 }), "sleeve"),
  }),
  product({
    id: "p-fenwick",
    sku: "MH-OS-006",
    name: "Fenwick Twill Overshirt",
    category: "tops",
    fitIntent: "relaxed",
    fabric: "Brushed cotton twill, 320 gsm",
    stretch: false,
    colourway: "Tobacco",
    sizeChartId: "chart-tops-relaxed",
    measurements: fromBlock(chart("chart-tops-relaxed"), {}, undefined, { chest: [0, 0.5, 0, -0.5, 0.5] }),
  }),
  product({
    id: "p-harlow",
    sku: "MH-TR-011",
    name: "Harlow Straight Trouser",
    category: "bottoms",
    fitIntent: "regular",
    fabric: "Wool-blend tropical, 2% elastane",
    stretch: false,
    colourway: "Charcoal",
    sizeChartId: "chart-bottoms-regular",
    measurements: fromBlock(chart("chart-bottoms-regular"), {}, undefined, { hip: [0, 0.5, 0, 0, -0.5] }),
  }),
  product({
    id: "p-ellis",
    sku: "MH-TR-015",
    name: "Ellis Pleated Trouser",
    category: "bottoms",
    fitIntent: "relaxed",
    fabric: "Cotton gabardine",
    stretch: false,
    colourway: "Stone",
    sizeChartId: "chart-bottoms-regular",
    // Deliberately long, unfinished hem — designed to be tailored.
    measurements: fromBlock(chart("chart-bottoms-regular"), { inseam: 3.5, hip: 1.5 }),
  }),
  product({
    id: "p-mara",
    sku: "MH-DN-002",
    name: "Mara Wide-Leg Jean",
    category: "bottoms",
    fitIntent: "relaxed",
    fabric: "Stretch denim, 3% elastane",
    stretch: true,
    colourway: "Mid indigo",
    sizeChartId: "chart-bottoms-regular",
    measurements: fromBlock(chart("chart-bottoms-regular"), { hip: 1 }),
  }),
  product({
    id: "p-corin",
    sku: "MH-OW-004",
    name: "Corin Wool Coat",
    category: "outerwear",
    fitIntent: "regular",
    fabric: "Recycled wool melton",
    stretch: false,
    colourway: "Camel",
    sizeChartId: "chart-outerwear-regular",
    measurements: fromBlock(chart("chart-outerwear-regular"), {}, undefined, { length: [0, 0.5, 0, 0.5, 0] }),
  }),
  product({
    id: "p-isla",
    sku: "MH-DR-007",
    name: "Isla Bias Slip Dress",
    category: "dresses",
    fitIntent: "slim",
    fabric: "Viscose satin, bias cut",
    stretch: false,
    colourway: "Burgundy",
    sizeChartId: "chart-dresses-regular",
    measurements: fromBlock(chart("chart-dresses-regular"), { hip: -1 }),
  }),
];

// ---------------------------------------------------------------- feedback

/** Small deterministic PRNG so the seed is identical every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261018);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

const TEXT = {
  chestTight: [
    "Tight across the chest, buttons pull when I sit down.",
    "Usually a size M in this brand but the chest was too tight on this one.",
    "Fits at the shoulders but way too snug across the chest.",
    "Buttons gape and pull across the chest. Runs small compared to my other shirts.",
    "Couldn't button it comfortably over the chest. Had to return.",
    "Chest too tight, the placket pulls open.",
    "Runs small, especially through the chest and stomach.",
  ],
  generalSmall: ["Too small overall, should have sized up.", "Bit tight for me, exchanging for the next size."],
  generalLarge: ["Too big overall, swimming in it.", "Too loose, will size down.", "Baggy around the waist."],
  waistGape: [
    "Waist gapes at the back even though the hips fit.",
    "Waistband too loose after an hour of wear, gaping at the back.",
    "Gaping at the waist, had to wear a belt.",
    "Fits the hips but the waist is too big and stretches out by the afternoon.",
  ],
  long: ["Legs are too long, they puddle at the ankle.", "Had to hem them, too long for me."],
  short: ["Too short in the body, rides up when I reach up.", "Sleeves are too short."],
  unexpected: [
    "Boxy shape, not as pictured on the model.",
    "Clings in places I didn't expect — fit is strange through the hips.",
    "Didn't drape the way the photos showed, a bit shapeless.",
    "Odd proportions, the cut is off for me.",
  ],
  notFit: [
    "Colour is different from the website.",
    "Arrived damaged with a small hole.",
    "Changed my mind, found something else.",
    "Fabric feels scratchy.",
    "Delivery was late so I no longer need it.",
  ],
};

type Mix = { texts: string[]; count: number; sizes: Size[] };

const FEEDBACK_MIX: Record<string, Mix[]> = {
  "p-linden": [
    { texts: TEXT.chestTight, count: 26, sizes: ["M", "L", "XL", "M", "L", "S"] },
    { texts: TEXT.generalSmall, count: 4, sizes: ["M", "L"] },
    { texts: TEXT.generalLarge, count: 2, sizes: ["XS", "S"] },
    { texts: TEXT.notFit, count: 5, sizes: SIZES },
  ],
  "p-arden": [
    { texts: TEXT.generalSmall, count: 3, sizes: SIZES },
    { texts: TEXT.generalLarge, count: 3, sizes: SIZES },
    { texts: TEXT.short, count: 1, sizes: ["L"] },
    { texts: TEXT.notFit, count: 5, sizes: SIZES },
  ],
  "p-calder": [
    { texts: TEXT.generalLarge, count: 3, sizes: SIZES },
    { texts: TEXT.notFit, count: 6, sizes: SIZES },
  ],
  "p-wren": [
    { texts: TEXT.generalSmall, count: 2, sizes: SIZES },
    { texts: TEXT.short, count: 2, sizes: ["M", "L"] },
    { texts: TEXT.notFit, count: 4, sizes: SIZES },
  ],
  "p-fenwick": [
    { texts: TEXT.generalLarge, count: 4, sizes: SIZES },
    { texts: TEXT.unexpected.slice(0, 1), count: 2, sizes: ["S", "M"] },
    { texts: TEXT.notFit, count: 3, sizes: SIZES },
  ],
  "p-harlow": [
    { texts: TEXT.generalSmall, count: 2, sizes: SIZES },
    { texts: TEXT.long, count: 2, sizes: SIZES },
    { texts: TEXT.notFit, count: 3, sizes: SIZES },
  ],
  "p-ellis": [
    { texts: TEXT.long, count: 2, sizes: ["XS", "S"] },
    { texts: TEXT.generalLarge, count: 2, sizes: SIZES },
    { texts: TEXT.notFit, count: 3, sizes: SIZES },
  ],
  "p-mara": [
    { texts: TEXT.waistGape, count: 18, sizes: ["S", "M", "L", "M"] },
    { texts: TEXT.long, count: 3, sizes: SIZES },
    { texts: TEXT.notFit, count: 4, sizes: SIZES },
  ],
  "p-corin": [
    { texts: TEXT.generalSmall, count: 2, sizes: SIZES },
    { texts: TEXT.generalLarge, count: 2, sizes: SIZES },
    { texts: TEXT.notFit, count: 4, sizes: SIZES },
  ],
  "p-isla": [
    { texts: TEXT.unexpected.slice(1), count: 7, sizes: SIZES },
    { texts: TEXT.generalSmall, count: 3, sizes: ["M", "L"] },
    { texts: TEXT.notFit, count: 3, sizes: SIZES },
  ],
};

const SOURCES: FeedbackRecord["source"][] = ["returns_portal", "returns_portal", "returns_portal", "support_ticket", "review"];
const START = Date.parse("2026-07-01T09:00:00Z");
const DAY = 86_400_000;

function buildFeedback(): FeedbackRecord[] {
  const out: FeedbackRecord[] = [];
  let n = 1;
  for (const [productId, mixes] of Object.entries(FEEDBACK_MIX)) {
    for (const mix of mixes) {
      for (let i = 0; i < mix.count; i++) {
        const text = pick(mix.texts);
        out.push({
          id: `fb-${String(n).padStart(4, "0")}`,
          productId,
          size: pick(mix.sizes),
          orderRef: `MH-${100400 + n * 7}`,
          text,
          source: pick(SOURCES),
          receivedAt: new Date(START + Math.floor(rand() * 105) * DAY + Math.floor(rand() * DAY)).toISOString(),
          classification: classifyWithRules(text),
          reviewed: rand() < 0.35,
        });
        n++;
      }
    }
  }
  out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  // Leave the most recent dozen unclassified to populate the review queue.
  for (const f of out.slice(-12)) {
    f.classification = null;
    f.reviewed = false;
  }
  return out;
}

export const FEEDBACK: FeedbackRecord[] = buildFeedback();

// ---------------------------------------------------------------- sales

const SIZE_MIX = [0.08, 0.22, 0.32, 0.25, 0.13];
const VOLUME: Record<string, number> = {
  "p-linden": 820, "p-arden": 960, "p-calder": 610, "p-wren": 1400, "p-fenwick": 540,
  "p-harlow": 700, "p-ellis": 380, "p-mara": 650, "p-corin": 310, "p-isla": 420,
};
const RETURN_RATE: Record<string, number[]> = {
  "p-linden": [0.14, 0.22, 0.36, 0.38, 0.35],
  "p-mara": [0.2, 0.31, 0.33, 0.3, 0.22],
  "p-isla": [0.24, 0.26, 0.27, 0.27, 0.25],
};

export const SALES: SalesFigure[] = PRODUCTS.flatMap((p) =>
  SIZES.map((size, i) => {
    const unitsSold = Math.round(VOLUME[p.id] * SIZE_MIX[i]);
    const rate = RETURN_RATE[p.id]?.[i] ?? 0.13 + ((i * 7 + p.id.length) % 5) / 100;
    return { productId: p.id, size, unitsSold, unitsReturned: Math.round(unitsSold * rate) };
  }),
);

// ---------------------------------------------------------------- customers

export const CUSTOMER_PROFILES: CustomerProfile[] = [
  { id: "cp-a", label: "Profile A — shirt shopper", body: { chest: 100, waist: 88, arm: 63 }, preference: "regular", note: "Wears L in Arden Poplin." },
  { id: "cp-b", label: "Profile B — prefers room", body: { chest: 94, waist: 84, arm: 61 }, preference: "relaxed", note: "Likes an easy fit in shirts and knitwear." },
  { id: "cp-c", label: "Profile C — trouser shopper", body: { waist: 80, hip: 98, inseam: 79 }, preference: "fitted", note: "Prefers a close waist, no belt." },
  { id: "cp-d", label: "Profile D — dress shopper", body: { chest: 90, waist: 74, hip: 99 }, preference: "regular", note: "Between S and M in most labels." },
];
