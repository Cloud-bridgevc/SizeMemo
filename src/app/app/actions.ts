"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import type { Measurements } from "@/lib/data/repository";
import { classifyFeedback, explainRecommendation } from "@/lib/ai/bedrock";
import { parseFeedbackCsv } from "@/lib/feedback-import";
import { presignUpload, s3Configured, type FileKind } from "@/lib/integrations/s3";
import { recommendFromBody, recommendFromReference, type BodyInput } from "@/lib/sizing/recommend";
import {
  BODY_AREAS,
  CATEGORY_POMS,
  FEEDBACK_CATEGORIES,
  POMS,
  type BodyArea,
  type Category,
  type FeedbackCategory,
  type FitIntent,
  type Pom,
  type Product,
  type SizeChart,
} from "@/lib/types";

function cleanMeasurements(m: Measurements): Measurements {
  const out: Measurements = {};
  for (const [size, poms] of Object.entries(m)) {
    out[size] = {};
    for (const [pom, v] of Object.entries(poms)) {
      if (!POMS.includes(pom as (typeof POMS)[number])) continue;
      const n = Math.round(Number(v) * 10) / 10;
      if (Number.isFinite(n) && n > 0 && n < 400) out[size][pom as (typeof POMS)[number]] = n;
    }
  }
  return out;
}

export async function saveMeasurementsAction(productId: string, m: Measurements) {
  const repo = await getRepository();
  await repo.saveMeasurements(productId, cleanMeasurements(m), "dashboard-user");
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function createProductAction(form: FormData) {
  const repo = await getRepository();
  const chartId = String(form.get("sizeChartId"));
  const chart = await repo.getSizeChart(chartId);
  if (!chart) return { ok: false as const, error: "Choose a size chart." };
  const name = String(form.get("name") ?? "").trim();
  const sku = String(form.get("sku") ?? "").trim().toUpperCase();
  if (!name || !sku) return { ok: false as const, error: "Name and SKU are required." };
  if ((await repo.listProducts()).some((p) => p.sku === sku)) return { ok: false as const, error: `SKU ${sku} already exists.` };
  const id = `p-${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const product: Product = {
    id,
    sku,
    name,
    category: chart.category,
    fitIntent: (String(form.get("fitIntent")) as FitIntent) || chart.fitIntent,
    fabric: String(form.get("fabric") ?? ""),
    stretch: form.get("stretch") === "on",
    colourway: String(form.get("colourway") ?? ""),
    sizeChartId: chart.id,
    sizes: chart.sizes,
    status: "draft",
    imageKey: null,
    imageRightsConfirmed: false,
    // Start from the brand block; the editor highlights any edits that move off spec.
    measurements: structuredClone(chart.specs),
  };
  await repo.createProduct(product);
  revalidatePath("/app", "layout");
  return { ok: true as const, id };
}

export async function updateProductStatusAction(id: string, status: "active" | "draft") {
  const repo = await getRepository();
  await repo.updateProduct(id, { status });
  revalidatePath("/app", "layout");
}

export async function saveSizeChartAction(chart: SizeChart) {
  const repo = await getRepository();
  const allowed = CATEGORY_POMS[chart.category as Category];
  const specs = cleanMeasurements(chart.specs);
  for (const size of Object.keys(specs))
    for (const pom of Object.keys(specs[size])) if (!allowed.includes(pom as never)) delete specs[size][pom as never];
  const tolerances: SizeChart["tolerances"] = {};
  for (const [pom, v] of Object.entries(chart.tolerances)) {
    const n = Number(v);
    if (allowed.includes(pom as Pom) && n > 0 && n < 20) tolerances[pom as Pom] = n;
  }
  await repo.saveSizeChart({ ...chart, specs, tolerances, name: chart.name.trim() || "Untitled block" });
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function importFeedbackAction(csv: string) {
  const repo = await getRepository();
  const products = await repo.listProducts();
  const { records, errors } = parseFeedbackCsv(csv, products);
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const r of records) r.classification = await classifyFeedback(r.text, byId.get(r.productId));
  await repo.addFeedback(records);
  revalidatePath("/app", "layout");
  return {
    imported: records.length,
    errors,
    results: records.map((r) => ({ id: r.id, sku: byId.get(r.productId)?.sku, size: r.size, text: r.text, classification: r.classification })),
  };
}

export async function classifyPendingAction() {
  const repo = await getRepository();
  const [products, feedback] = await Promise.all([repo.listProducts(), repo.listFeedback()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const pending = feedback.filter((f) => !f.classification);
  for (const f of pending) await repo.setClassification(f.id, await classifyFeedback(f.text, byId.get(f.productId)), false);
  revalidatePath("/app", "layout");
  return { classified: pending.length };
}

export async function reviewClassificationAction(id: string, category: FeedbackCategory, area: BodyArea) {
  if (!FEEDBACK_CATEGORIES.includes(category) || !BODY_AREAS.includes(area)) throw new Error("Invalid classification");
  const repo = await getRepository();
  const existing = (await repo.listFeedback()).find((f) => f.id === id);
  const unchanged = existing?.classification?.category === category && existing.classification.area === area;
  await repo.setClassification(
    id,
    unchanged
      ? { ...existing!.classification! }
      : { category, area, confidence: 1, rationale: "Set by reviewer.", method: "manual", classifiedAt: new Date().toISOString() },
    true,
  );
  revalidatePath("/app", "layout");
}

export async function recommendAction(
  productId: string,
  input: { mode: "body"; body: BodyInput } | { mode: "reference"; referenceProductId: string; referenceSize: string },
) {
  const repo = await getRepository();
  const product = await repo.getProduct(productId);
  if (!product) throw new Error("Unknown product");
  let rec;
  if (input.mode === "body") {
    rec = recommendFromBody(product, input.body);
  } else {
    const ref = await repo.getProduct(input.referenceProductId);
    if (!ref) throw new Error("Unknown reference product");
    rec = recommendFromReference(product, { referenceProduct: ref, referenceSize: input.referenceSize });
  }
  const explanation = await explainRecommendation(product, rec);
  return { rec, explanation };
}

export async function setProductImageAction(productId: string, key: string, rightsConfirmed: boolean) {
  if (!rightsConfirmed) throw new Error("Image rights must be confirmed before an image is attached.");
  const repo = await getRepository();
  await repo.updateProduct(productId, { imageKey: key, imageRightsConfirmed: true });
  revalidatePath(`/app/products/${productId}`);
}

export async function presignUploadAction(kind: FileKind, filename: string, contentType: string) {
  if (!s3Configured()) return { ok: false as const, error: "S3 is not configured in this environment." };
  try {
    return { ok: true as const, ...(await presignUpload(kind, filename, contentType)) };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
