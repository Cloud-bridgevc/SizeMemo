// Core domain types shared by the app, the Lambda workers and the seed scripts.
// All measurements are stored in centimetres. Circumference points of measure
// (chest, waist, hip) are full circumference, never half / "flat" measurements.

export const CATEGORIES = ["tops", "bottoms", "outerwear", "dresses"] as const;
export type Category = (typeof CATEGORIES)[number];

export const POMS = ["chest", "waist", "hip", "shoulder", "length", "sleeve", "inseam", "rise"] as const;
export type Pom = (typeof POMS)[number];

export const POM_LABELS: Record<Pom, string> = {
  chest: "Chest / bust",
  waist: "Waist",
  hip: "Hip / seat",
  shoulder: "Shoulder width",
  length: "Body length",
  sleeve: "Sleeve length",
  inseam: "Inseam",
  rise: "Front rise",
};

/** Points of measure that are tracked for each category. */
export const CATEGORY_POMS: Record<Category, Pom[]> = {
  tops: ["chest", "waist", "shoulder", "length", "sleeve"],
  outerwear: ["chest", "waist", "shoulder", "length", "sleeve"],
  bottoms: ["waist", "hip", "rise", "inseam"],
  dresses: ["chest", "waist", "hip", "length"],
};

export const FIT_INTENTS = ["slim", "regular", "relaxed"] as const;
export type FitIntent = (typeof FIT_INTENTS)[number];

export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type Size = string;

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Category;
  fitIntent: FitIntent;
  fabric: string;
  /** Meaningful mechanical stretch (elastane, knit). Relaxes the tightness rule. */
  stretch: boolean;
  sizeChartId: string;
  sizes: Size[];
  status: "active" | "draft";
  /** S3 key of a product image. Only set once rights to use the image are confirmed. */
  imageKey: string | null;
  imageRightsConfirmed: boolean;
  colourway: string;
  /** measurements[size][pom] = cm */
  measurements: Record<Size, Partial<Record<Pom, number>>>;
}

/** A brand "block": the established garment spec per size for a category + fit. */
export interface SizeChart {
  id: string;
  name: string;
  category: Category;
  fitIntent: FitIntent;
  sizes: Size[];
  /** specs[size][pom] = target garment measurement in cm */
  specs: Record<Size, Partial<Record<Pom, number>>>;
  /** Allowed deviation from spec before a product is flagged, per POM, in cm. */
  tolerances: Partial<Record<Pom, number>>;
  notes: string;
}

export const FEEDBACK_CATEGORIES = [
  "too_small",
  "too_large",
  "too_long",
  "too_short",
  "unexpected_fit",
  "not_fit_related",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_LABELS: Record<FeedbackCategory, string> = {
  too_small: "Too small",
  too_large: "Too large",
  too_long: "Too long",
  too_short: "Too short",
  unexpected_fit: "Unexpected fit",
  not_fit_related: "Not fit-related",
};

export const BODY_AREAS = ["chest", "waist", "hip", "shoulder", "length", "sleeve", "inseam", "rise", "overall"] as const;
export type BodyArea = (typeof BODY_AREAS)[number];

export type ClassificationMethod = "bedrock" | "rules" | "manual";

export interface Classification {
  category: FeedbackCategory;
  area: BodyArea;
  confidence: number; // 0..1
  rationale: string;
  method: ClassificationMethod;
  model?: string;
  classifiedAt: string;
}

export interface FeedbackRecord {
  id: string;
  productId: string;
  size: Size;
  orderRef: string;
  text: string;
  source: "returns_portal" | "csv_import" | "support_ticket" | "review";
  receivedAt: string;
  classification: Classification | null;
  /** True when a person reviewed (and possibly corrected) the classification. */
  reviewed: boolean;
}

export interface SalesFigure {
  productId: string;
  size: Size;
  unitsSold: number;
  unitsReturned: number;
}

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  companyType: "fashion_brand" | "ecommerce_retailer" | "marketplace" | "other";
  skuCount: string;
  message: string;
  consent: boolean;
  createdAt: string;
  hubspotSync: "synced" | "skipped" | "failed";
}

export interface CustomerProfile {
  id: string;
  label: string;
  body: Partial<Record<BodyMeasure, number>>;
  preference: FitPreference;
  note: string;
}

export const BODY_MEASURES = ["chest", "waist", "hip", "arm", "inseam"] as const;
export type BodyMeasure = (typeof BODY_MEASURES)[number];
export const BODY_MEASURE_LABELS: Record<BodyMeasure, string> = {
  chest: "Chest / bust",
  waist: "Waist",
  hip: "Hip",
  arm: "Arm length (shoulder to wrist)",
  inseam: "Inseam (crotch to ankle)",
};

export type FitPreference = "fitted" | "regular" | "relaxed";
