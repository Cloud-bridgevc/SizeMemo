import { POM_LABELS, type BodyArea, type FeedbackCategory, type FeedbackRecord, type Pom, type Product, type SalesFigure, type Size, type SizeChart } from "../types";

/*
 * Size consistency monitoring.
 *
 * Signal 1 (deterministic): each product's garment measurements are compared
 * with the brand block (size chart) it is graded from. Deviations beyond the
 * chart's tolerance are flagged.
 *
 * Signal 2 (feedback): classified return feedback for the product. Classification
 * may come from Bedrock, but the aggregation below is plain counting.
 *
 * A product is only labelled a *potential* inconsistency when both signals point
 * the same way. A person should always confirm against a physical sample.
 */

export interface Deviation {
  size: Size;
  pom: Pom;
  measured: number;
  spec: number;
  deviation: number;
  tolerance: number;
  outside: boolean;
}

export interface FeedbackSignal {
  fitReturns: number;
  totalFeedback: number;
  byCategory: Record<FeedbackCategory, number>;
  topArea: BodyArea | null;
  topAreaCount: number;
  dominant: FeedbackCategory | null;
  dominantShare: number;
  unitsSold: number;
  unitsReturned: number;
  returnRate: number;
  fitReturnRate: number;
}

export type ConsistencyStatus = "consistent" | "measurement_only" | "feedback_only" | "potential_inconsistency";

export interface ProductConsistency {
  productId: string;
  chartId: string;
  deviations: Deviation[];
  outside: Deviation[];
  /** Points of measure outside tolerance in at least two sizes. */
  systematicPoms: { pom: Pom; direction: "smaller" | "larger"; sizes: Size[]; meanDeviation: number }[];
  feedback: FeedbackSignal;
  status: ConsistencyStatus;
  summary: string;
}

const round = (n: number) => Math.round(n * 10) / 10;

const emptyCounts = (): Record<FeedbackCategory, number> => ({
  too_small: 0,
  too_large: 0,
  too_long: 0,
  too_short: 0,
  unexpected_fit: 0,
  not_fit_related: 0,
});

export function compareToChart(product: Product, chart: SizeChart): Deviation[] {
  const out: Deviation[] = [];
  for (const size of product.sizes) {
    const spec = chart.specs[size];
    const actual = product.measurements[size];
    if (!spec || !actual) continue;
    for (const pom of Object.keys(spec) as Pom[]) {
      const s = spec[pom];
      const m = actual[pom];
      if (s == null || m == null) continue;
      const tolerance = chart.tolerances[pom] ?? 1.5;
      const deviation = round(m - s);
      out.push({ size, pom, measured: m, spec: s, deviation, tolerance, outside: Math.abs(deviation) > tolerance });
    }
  }
  return out;
}

export function feedbackSignal(productId: string, feedback: FeedbackRecord[], sales: SalesFigure[]): FeedbackSignal {
  const mine = feedback.filter((f) => f.productId === productId && f.classification);
  const byCategory = emptyCounts();
  const areas = new Map<BodyArea, number>();
  for (const f of mine) {
    const c = f.classification!;
    byCategory[c.category]++;
    if (c.category !== "not_fit_related") areas.set(c.area, (areas.get(c.area) ?? 0) + 1);
  }
  const fitReturns = mine.length - byCategory.not_fit_related;
  let dominant: FeedbackCategory | null = null;
  let dominantCount = 0;
  for (const [cat, n] of Object.entries(byCategory) as [FeedbackCategory, number][]) {
    if (cat !== "not_fit_related" && n > dominantCount) {
      dominant = cat;
      dominantCount = n;
    }
  }
  let topArea: BodyArea | null = null;
  let topAreaCount = 0;
  for (const [a, n] of areas) if (n > topAreaCount) [topArea, topAreaCount] = [a, n];

  const s = sales.filter((x) => x.productId === productId);
  const unitsSold = s.reduce((a, x) => a + x.unitsSold, 0);
  const unitsReturned = s.reduce((a, x) => a + x.unitsReturned, 0);
  return {
    fitReturns,
    totalFeedback: mine.length,
    byCategory,
    topArea,
    topAreaCount,
    dominant,
    dominantShare: fitReturns ? dominantCount / fitReturns : 0,
    unitsSold,
    unitsReturned,
    returnRate: unitsSold ? unitsReturned / unitsSold : 0,
    fitReturnRate: unitsSold && mine.length ? (unitsReturned * (fitReturns / mine.length)) / unitsSold : 0,
  };
}

/** Which feedback category a measurement deviation would be expected to produce. */
function expectedComplaint(pom: Pom, direction: "smaller" | "larger"): FeedbackCategory {
  const isLength = pom === "length" || pom === "sleeve" || pom === "inseam" || pom === "rise";
  if (isLength) return direction === "smaller" ? "too_short" : "too_long";
  return direction === "smaller" ? "too_small" : "too_large";
}

export function assessProduct(
  product: Product,
  chart: SizeChart,
  feedback: FeedbackRecord[],
  sales: SalesFigure[],
  /** Mean fit-return rate across the product's category, for comparison. */
  categoryFitReturnRate: number,
): ProductConsistency {
  const deviations = compareToChart(product, chart);
  const outside = deviations.filter((d) => d.outside);

  const byPom = new Map<Pom, Deviation[]>();
  for (const d of outside) byPom.set(d.pom, [...(byPom.get(d.pom) ?? []), d]);
  const systematicPoms: ProductConsistency["systematicPoms"] = [];
  for (const [pom, ds] of byPom) {
    const smaller = ds.filter((d) => d.deviation < 0);
    const larger = ds.filter((d) => d.deviation > 0);
    const group = smaller.length >= larger.length ? smaller : larger;
    if (group.length < 2) continue;
    systematicPoms.push({
      pom,
      direction: group === smaller ? "smaller" : "larger",
      sizes: group.map((d) => d.size),
      meanDeviation: round(group.reduce((a, d) => a + d.deviation, 0) / group.length),
    });
  }

  const fb = feedbackSignal(product.id, feedback, sales);
  const feedbackElevated =
    fb.fitReturns >= 5 && fb.dominantShare >= 0.5 && fb.fitReturnRate >= categoryFitReturnRate * 1.4;

  const corroborated = systematicPoms.find((s) => {
    const expected = expectedComplaint(s.pom, s.direction);
    const areaMatches = fb.topArea === s.pom || fb.topArea === "overall";
    return fb.dominant === expected && fb.dominantShare >= 0.4 && fb.fitReturns >= 5 && areaMatches;
  });

  let status: ConsistencyStatus;
  let summary: string;
  if (corroborated) {
    status = "potential_inconsistency";
    summary =
      `${POM_LABELS[corroborated.pom]} measures on average ${Math.abs(corroborated.meanDeviation)} cm ${corroborated.direction} than the ${chart.name} ` +
      `in sizes ${corroborated.sizes.join(", ")}, and ${Math.round(fb.dominantShare * 100)}% of fit-related returns are classified "${fb.dominant?.replace("_", " ")}" ` +
      `(most often at the ${fb.topArea}). Recommend checking a physical sample against spec.`;
  } else if (systematicPoms.length) {
    status = "measurement_only";
    const s = systematicPoms[0];
    summary = `${POM_LABELS[s.pom]} is ${Math.abs(s.meanDeviation)} cm ${s.direction} than spec in ${s.sizes.length} sizes. Return feedback does not yet corroborate this; it may be an intentional design choice.`;
  } else if (feedbackElevated) {
    status = "feedback_only";
    summary = `Fit-related returns are elevated and skew "${fb.dominant?.replace("_", " ")}", but measurements are within tolerance of the block. Review fabric, cut or product copy rather than grading.`;
  } else {
    status = "consistent";
    summary = outside.length
      ? `${outside.length} isolated measurement(s) outside tolerance; no systematic pattern.`
      : "All measurements within tolerance of the brand block.";
  }

  return { productId: product.id, chartId: chart.id, deviations, outside, systematicPoms, feedback: fb, status, summary };
}

export function assessCatalogue(
  products: Product[],
  charts: SizeChart[],
  feedback: FeedbackRecord[],
  sales: SalesFigure[],
): ProductConsistency[] {
  const chartById = new Map(charts.map((c) => [c.id, c]));
  const signals = new Map(products.map((p) => [p.id, feedbackSignal(p.id, feedback, sales)]));
  const mean = (ps: Product[]) => ps.reduce((a, p) => a + signals.get(p.id)!.fitReturnRate, 0) / Math.max(ps.length, 1);
  const overall = mean(products);
  const categoryRate = new Map<string, number>();
  for (const cat of new Set(products.map((p) => p.category))) {
    const ps = products.filter((p) => p.category === cat);
    // Too few peers to form a category baseline: compare with the whole catalogue.
    categoryRate.set(cat, ps.length >= 3 ? mean(ps) : overall);
  }
  return products
    .filter((p) => chartById.has(p.sizeChartId))
    .map((p) => assessProduct(p, chartById.get(p.sizeChartId)!, feedback, sales, categoryRate.get(p.category) ?? 0));
}
