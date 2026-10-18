import type { Repository } from "./repository";
import type { DemoRequest, FeedbackRecord, Product, SizeChart } from "../types";
import { CUSTOMER_PROFILES, FEEDBACK, PRODUCTS, SALES, SIZE_CHARTS } from "./seed";

/*
 * In-memory repository seeded with the fictional Maison Halden dataset.
 * Used when DATABASE_URL is not set, so the product can be explored without
 * infrastructure. State resets when the server restarts.
 */

interface State {
  products: Product[];
  charts: SizeChart[];
  feedback: FeedbackRecord[];
  demoRequests: DemoRequest[];
}

const clone = <T,>(x: T): T => structuredClone(x);

// Survive Next.js dev hot reloads.
const g = globalThis as unknown as { __sizememo?: State };
function state(): State {
  g.__sizememo ??= {
    products: clone(PRODUCTS),
    charts: clone(SIZE_CHARTS),
    feedback: clone(FEEDBACK),
    demoRequests: [],
  };
  return g.__sizememo;
}

export const memoryRepository: Repository = {
  kind: "memory",

  async listProducts() {
    return clone(state().products);
  },
  async getProduct(id) {
    const p = state().products.find((x) => x.id === id);
    return p ? clone(p) : null;
  },
  async createProduct(p) {
    state().products.push(clone(p));
  },
  async updateProduct(id, patch) {
    const p = state().products.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  },
  async saveMeasurements(productId, m) {
    const p = state().products.find((x) => x.id === productId);
    if (p) p.measurements = clone(m);
  },

  async listSizeCharts() {
    return clone(state().charts);
  },
  async getSizeChart(id) {
    const c = state().charts.find((x) => x.id === id);
    return c ? clone(c) : null;
  },
  async saveSizeChart(c) {
    const s = state();
    const i = s.charts.findIndex((x) => x.id === c.id);
    if (i >= 0) s.charts[i] = clone(c);
    else s.charts.push(clone(c));
  },

  async listFeedback() {
    return clone(state().feedback);
  },
  async addFeedback(records) {
    state().feedback.push(...clone(records));
  },
  async setClassification(id, c, reviewed) {
    const f = state().feedback.find((x) => x.id === id);
    if (f) {
      f.classification = clone(c);
      f.reviewed = reviewed;
    }
  },

  async listSales() {
    return clone(SALES);
  },
  async listProfiles() {
    return clone(CUSTOMER_PROFILES);
  },

  async addDemoRequest(r) {
    state().demoRequests.push(clone(r));
  },
  async listDemoRequests() {
    return clone(state().demoRequests);
  },
};
