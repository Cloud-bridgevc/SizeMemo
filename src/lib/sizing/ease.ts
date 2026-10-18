import type { BodyMeasure, Category, FitPreference, Pom } from "../types";

/**
 * Ease = garment measurement − body measurement (cm).
 *
 * These ranges describe how much room a person with a given fit preference
 * typically wants at each point of measure. They are editable defaults, not
 * universal truths — a brand should tune them against its own fit sessions.
 */
export type Range = readonly [min: number, max: number];

type EaseTable = Partial<Record<Pom, Record<FitPreference, Range>>>;

export const EASE_RANGES: Record<Category, EaseTable> = {
  tops: {
    chest: { fitted: [4, 9], regular: [9, 15], relaxed: [15, 24] },
    waist: { fitted: [4, 10], regular: [10, 18], relaxed: [16, 30] },
  },
  outerwear: {
    chest: { fitted: [8, 13], regular: [13, 19], relaxed: [19, 28] },
    waist: { fitted: [8, 16], regular: [14, 24], relaxed: [20, 36] },
  },
  dresses: {
    chest: { fitted: [3, 7], regular: [6, 11], relaxed: [10, 18] },
    waist: { fitted: [2, 6], regular: [5, 10], relaxed: [9, 20] },
    hip: { fitted: [4, 8], regular: [7, 12], relaxed: [11, 22] },
  },
  bottoms: {
    waist: { fitted: [0, 2], regular: [1, 3.5], relaxed: [2.5, 5] },
    hip: { fitted: [3, 7], regular: [6, 10], relaxed: [9, 16] },
  },
};

/** Length tolerances: garment length − body length (cm). Preference-independent. */
export const LENGTH_RANGES: Partial<Record<Category, Partial<Record<Pom, Range>>>> = {
  tops: { sleeve: [-1, 2.5] },
  outerwear: { sleeve: [0.5, 4] },
  bottoms: { inseam: [-2.5, 1] },
};

/** Which body measurement each garment point of measure is compared against. */
export const POM_TO_BODY: Partial<Record<Pom, BodyMeasure>> = {
  chest: "chest",
  waist: "waist",
  hip: "hip",
  sleeve: "arm",
  inseam: "inseam",
};

export const CIRCUMFERENCE_POMS: Pom[] = ["chest", "waist", "hip"];

/** Relative importance of each point of measure when scoring a size. */
export function pomWeight(category: Category, pom: Pom): number {
  switch (pom) {
    case "chest":
      return category === "bottoms" ? 0 : 3;
    case "waist":
      return category === "bottoms" ? 3 : category === "dresses" ? 2 : 1;
    case "hip":
      return 2;
    case "shoulder":
      return 2;
    case "inseam":
    case "sleeve":
    case "length":
    case "rise":
      return 1;
  }
}

/** Being too tight is penalised more than being too loose: you can't wear a garment you can't close. */
export const TIGHT_MULTIPLIER = 1.5;

/** Stretch fabrics tolerate this many cm less ease on circumference points. */
export const STRETCH_ALLOWANCE = 3;
