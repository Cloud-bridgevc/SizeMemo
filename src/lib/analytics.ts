import { FEEDBACK_CATEGORIES, type FeedbackCategory, type FeedbackRecord, type Product, type SalesFigure } from "./types";

export type CategoryCounts = Record<FeedbackCategory, number>;

export const emptyCounts = (): CategoryCounts =>
  Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c, 0])) as CategoryCounts;

export function countBy<K extends string>(feedback: FeedbackRecord[], key: (f: FeedbackRecord) => K | null) {
  const out = new Map<K, CategoryCounts>();
  for (const f of feedback) {
    if (!f.classification) continue;
    const k = key(f);
    if (k == null) continue;
    const c = out.get(k) ?? emptyCounts();
    c[f.classification.category]++;
    out.set(k, c);
  }
  return out;
}

export const fitTotal = (c: CategoryCounts) => FEEDBACK_CATEGORIES.reduce((a, k) => a + (k === "not_fit_related" ? 0 : c[k]), 0);
export const total = (c: CategoryCounts) => FEEDBACK_CATEGORIES.reduce((a, k) => a + c[k], 0);

export function overview(products: Product[], feedback: FeedbackRecord[], sales: SalesFigure[]) {
  const sold = sales.reduce((a, s) => a + s.unitsSold, 0);
  const returned = sales.reduce((a, s) => a + s.unitsReturned, 0);
  const classified = feedback.filter((f) => f.classification);
  const fit = classified.filter((f) => f.classification!.category !== "not_fit_related");
  return {
    products: products.length,
    activeProducts: products.filter((p) => p.status === "active").length,
    unitsSold: sold,
    unitsReturned: returned,
    returnRate: sold ? returned / sold : 0,
    feedbackCount: feedback.length,
    unclassified: feedback.length - classified.length,
    needsReview: classified.filter((f) => !f.reviewed && f.classification!.confidence < 0.6).length,
    fitShare: classified.length ? fit.length / classified.length : 0,
  };
}

/** Return rate per product × size, for the heat table. */
export function returnMatrix(products: Product[], sales: SalesFigure[]) {
  return products.map((p) => ({
    product: p,
    cells: p.sizes.map((size) => {
      const s = sales.find((x) => x.productId === p.id && x.size === size);
      return { size, sold: s?.unitsSold ?? 0, returned: s?.unitsReturned ?? 0, rate: s && s.unitsSold ? s.unitsReturned / s.unitsSold : 0 };
    }),
  }));
}

/** Weekly counts of fit-related feedback, oldest first. */
export function weeklyFit(feedback: FeedbackRecord[]) {
  const weeks = new Map<string, CategoryCounts>();
  for (const f of feedback) {
    if (!f.classification) continue;
    const d = new Date(f.receivedAt);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    const c = weeks.get(k) ?? emptyCounts();
    c[f.classification.category]++;
    weeks.set(k, c);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export const pct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`;
