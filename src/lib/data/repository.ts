import type { Classification, CustomerProfile, DemoRequest, FeedbackRecord, Pom, Product, SalesFigure, Size, SizeChart } from "../types";

export type Measurements = Record<Size, Partial<Record<Pom, number>>>;

export interface Repository {
  readonly kind: "memory" | "postgres";

  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(p: Product): Promise<void>;
  updateProduct(id: string, patch: Partial<Omit<Product, "id" | "measurements">>): Promise<void>;
  saveMeasurements(productId: string, m: Measurements, editedBy: string): Promise<void>;

  listSizeCharts(): Promise<SizeChart[]>;
  getSizeChart(id: string): Promise<SizeChart | null>;
  saveSizeChart(c: SizeChart): Promise<void>;

  listFeedback(): Promise<FeedbackRecord[]>;
  addFeedback(records: FeedbackRecord[]): Promise<void>;
  setClassification(id: string, c: Classification, reviewed: boolean): Promise<void>;

  listSales(): Promise<SalesFigure[]>;
  listProfiles(): Promise<CustomerProfile[]>;

  addDemoRequest(r: DemoRequest): Promise<void>;
  listDemoRequests(): Promise<DemoRequest[]>;
}
