import { Pool } from "pg";
import type { Measurements, Repository } from "./repository";
import type { Classification, CustomerProfile, DemoRequest, FeedbackRecord, Pom, Product, SalesFigure, SizeChart } from "../types";

const g = globalThis as unknown as { __sizememoPool?: Pool };
export function pool() {
  g.__sizememoPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return g.__sizememoPool;
}
const org = () => process.env.SIZEMEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function nest(rows: Row[], key: string, value: string): Map<string, Measurements> {
  const out = new Map<string, Measurements>();
  for (const r of rows) {
    const m = out.get(r[key]) ?? {};
    (m[r.size] ??= {})[r.pom as Pom] = Number(r[value]);
    out.set(r[key], m);
  }
  return out;
}

function toProduct(r: Row, m: Measurements): Product {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    category: r.category,
    fitIntent: r.fit_intent,
    fabric: r.fabric,
    stretch: r.stretch,
    colourway: r.colourway,
    sizeChartId: r.size_chart_id,
    sizes: r.sizes,
    status: r.status,
    imageKey: r.image_key,
    imageRightsConfirmed: r.image_rights_confirmed,
    measurements: m,
  };
}

function toFeedback(r: Row): FeedbackRecord {
  const classification: Classification | null = r.category
    ? {
        category: r.category,
        area: r.area,
        confidence: Number(r.confidence),
        rationale: r.rationale ?? "",
        method: r.method,
        model: r.model ?? undefined,
        classifiedAt: new Date(r.classified_at).toISOString(),
      }
    : null;
  return {
    id: r.id,
    productId: r.product_id,
    size: r.size,
    orderRef: r.order_ref,
    text: r.text,
    source: r.source,
    receivedAt: new Date(r.received_at).toISOString(),
    classification,
    reviewed: r.reviewed,
  };
}

async function listCharts(where = "", params: unknown[] = []): Promise<SizeChart[]> {
  const db = pool();
  const charts = await db.query(`SELECT * FROM size_charts WHERE org_id = $1 ${where} ORDER BY category, name`, [org(), ...params]);
  if (!charts.rows.length) return [];
  const specs = await db.query(`SELECT * FROM size_chart_specs WHERE chart_id = ANY($1)`, [charts.rows.map((c) => c.id)]);
  const byChart = nest(specs.rows, "chart_id", "target_cm");
  return charts.rows.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    fitIntent: c.fit_intent,
    sizes: c.sizes,
    specs: byChart.get(c.id) ?? {},
    tolerances: c.tolerances,
    notes: c.notes,
  }));
}

async function listProductsWhere(where = "", params: unknown[] = []): Promise<Product[]> {
  const db = pool();
  const rows = await db.query(`SELECT * FROM products WHERE org_id = $1 ${where} ORDER BY category, name`, [org(), ...params]);
  if (!rows.rows.length) return [];
  const m = await db.query(`SELECT * FROM garment_measurements WHERE product_id = ANY($1)`, [rows.rows.map((r) => r.id)]);
  const byProduct = nest(m.rows, "product_id", "value_cm");
  return rows.rows.map((r) => toProduct(r, byProduct.get(r.id) ?? {}));
}

export const postgresRepository: Repository = {
  kind: "postgres",

  listProducts: () => listProductsWhere(),
  async getProduct(id) {
    return (await listProductsWhere("AND id = $2", [id]))[0] ?? null;
  },
  async createProduct(p) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO products (id, org_id, sku, name, category, fit_intent, fabric, stretch, colourway, size_chart_id, sizes, status, image_key, image_rights_confirmed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [p.id, org(), p.sku, p.name, p.category, p.fitIntent, p.fabric, p.stretch, p.colourway, p.sizeChartId, p.sizes, p.status, p.imageKey, p.imageRightsConfirmed],
      );
      for (const [size, poms] of Object.entries(p.measurements))
        for (const [pom, v] of Object.entries(poms))
          await client.query(`INSERT INTO garment_measurements (product_id, size, pom, value_cm) VALUES ($1,$2,$3,$4)`, [p.id, size, pom, v]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
  async updateProduct(id, patch) {
    const cols: Record<string, string> = {
      sku: "sku", name: "name", category: "category", fitIntent: "fit_intent", fabric: "fabric", stretch: "stretch",
      colourway: "colourway", sizeChartId: "size_chart_id", sizes: "sizes", status: "status", imageKey: "image_key",
      imageRightsConfirmed: "image_rights_confirmed",
    };
    const sets: string[] = [];
    const vals: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      if (!cols[k]) continue;
      vals.push(v);
      sets.push(`${cols[k]} = $${vals.length + 2}`);
    }
    if (sets.length) await pool().query(`UPDATE products SET ${sets.join(", ")} WHERE org_id = $1 AND id = $2`, [org(), id, ...vals]);
  },
  async saveMeasurements(productId, m, editedBy) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const prev = await client.query(`SELECT size, pom, value_cm FROM garment_measurements WHERE product_id = $1`, [productId]);
      const old = nest(prev.rows.map((r) => ({ ...r, product_id: productId })), "product_id", "value_cm").get(productId) ?? {};
      for (const [size, poms] of Object.entries(m)) {
        for (const [pom, v] of Object.entries(poms)) {
          const before = old[size]?.[pom as Pom];
          if (before === v) continue;
          await client.query(
            `INSERT INTO garment_measurements (product_id, size, pom, value_cm) VALUES ($1,$2,$3,$4)
             ON CONFLICT (product_id, size, pom) DO UPDATE SET value_cm = EXCLUDED.value_cm, updated_at = now()`,
            [productId, size, pom, v],
          );
          await client.query(
            `INSERT INTO measurement_revisions (product_id, size, pom, old_cm, new_cm, edited_by) VALUES ($1,$2,$3,$4,$5,$6)`,
            [productId, size, pom, before ?? null, v, editedBy],
          );
        }
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  listSizeCharts: () => listCharts(),
  async getSizeChart(id) {
    return (await listCharts("AND id = $2", [id]))[0] ?? null;
  },
  async saveSizeChart(c) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO size_charts (id, org_id, name, category, fit_intent, sizes, tolerances, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, fit_intent = EXCLUDED.fit_intent,
           sizes = EXCLUDED.sizes, tolerances = EXCLUDED.tolerances, notes = EXCLUDED.notes, updated_at = now()`,
        [c.id, org(), c.name, c.category, c.fitIntent, c.sizes, JSON.stringify(c.tolerances), c.notes],
      );
      await client.query(`DELETE FROM size_chart_specs WHERE chart_id = $1`, [c.id]);
      for (const [size, poms] of Object.entries(c.specs))
        for (const [pom, v] of Object.entries(poms))
          await client.query(`INSERT INTO size_chart_specs (chart_id, size, pom, target_cm) VALUES ($1,$2,$3,$4)`, [c.id, size, pom, v]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async listFeedback() {
    const r = await pool().query(`SELECT * FROM return_feedback WHERE org_id = $1 ORDER BY received_at`, [org()]);
    return r.rows.map(toFeedback);
  },
  async addFeedback(records) {
    for (const f of records) {
      const c = f.classification;
      await pool().query(
        `INSERT INTO return_feedback (id, org_id, product_id, size, order_ref, text, source, received_at,
           category, area, confidence, rationale, method, model, classified_at, reviewed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO NOTHING`,
        [f.id, org(), f.productId, f.size, f.orderRef, f.text, f.source, f.receivedAt,
         c?.category ?? null, c?.area ?? null, c?.confidence ?? null, c?.rationale ?? null, c?.method ?? null, c?.model ?? null, c?.classifiedAt ?? null, f.reviewed],
      );
    }
  },
  async setClassification(id, c, reviewed) {
    await pool().query(
      `UPDATE return_feedback SET category=$3, area=$4, confidence=$5, rationale=$6, method=$7, model=$8, classified_at=$9, reviewed=$10
       WHERE org_id = $1 AND id = $2`,
      [org(), id, c.category, c.area, c.confidence, c.rationale, c.method, c.model ?? null, c.classifiedAt, reviewed],
    );
  },

  async listSales(): Promise<SalesFigure[]> {
    const r = await pool().query(
      `SELECT s.product_id, s.size, SUM(s.units_sold)::int AS sold, SUM(s.units_returned)::int AS returned
       FROM sales_outcomes s JOIN products p ON p.id = s.product_id WHERE p.org_id = $1 GROUP BY 1, 2`,
      [org()],
    );
    return r.rows.map((x) => ({ productId: x.product_id, size: x.size, unitsSold: x.sold, unitsReturned: x.returned }));
  },
  async listProfiles(): Promise<CustomerProfile[]> {
    const r = await pool().query(`SELECT * FROM customer_profiles WHERE org_id = $1 ORDER BY label`, [org()]);
    return r.rows.map((x) => ({ id: x.id, label: x.label, body: x.body, preference: x.preference, note: x.note }));
  },

  async addDemoRequest(d) {
    await pool().query(
      `INSERT INTO demo_requests (id, name, email, company, role, company_type, sku_count, message, consent, hubspot_sync, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [d.id, d.name, d.email, d.company, d.role, d.companyType, d.skuCount, d.message, d.consent, d.hubspotSync, d.createdAt],
    );
  },
  async listDemoRequests(): Promise<DemoRequest[]> {
    const r = await pool().query(`SELECT * FROM demo_requests ORDER BY created_at DESC LIMIT 200`);
    return r.rows.map((x) => ({
      id: x.id, name: x.name, email: x.email, company: x.company, role: x.role, companyType: x.company_type,
      skuCount: x.sku_count, message: x.message, consent: x.consent, createdAt: new Date(x.created_at).toISOString(), hubspotSync: x.hubspot_sync,
    }));
  },
};
