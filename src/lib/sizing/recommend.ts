import type { BodyMeasure, FitPreference, Pom, Product, Size } from "../types";
import {
  CIRCUMFERENCE_POMS,
  EASE_RANGES,
  LENGTH_RANGES,
  POM_TO_BODY,
  STRETCH_ALLOWANCE,
  TIGHT_MULTIPLIER,
  pomWeight,
  type Range,
} from "./ease";

/*
 * Deterministic size matching. No model is involved in choosing a size: every
 * number in the output can be reproduced by hand from the inputs. AI is only
 * used elsewhere to phrase an explanation of this result.
 */

export type PomStatus = "within" | "tight" | "loose" | "short" | "long";

export interface PomEvaluation {
  pom: Pom;
  garment: number;
  /** Body measurement (body mode) or reference garment measurement (reference mode). */
  compareTo: number;
  /** garment − compareTo */
  delta: number;
  target: Range;
  status: PomStatus;
  weight: number;
  penalty: number;
}

export interface SizeEvaluation {
  size: Size;
  evaluations: PomEvaluation[];
  penalty: number;
  /** Conditions that make this size very unlikely to work, regardless of score. */
  hardStops: string[];
}

export type Confidence = "high" | "medium" | "low";

export interface Recommendation {
  mode: "body" | "reference";
  productId: string;
  recommendedSize: Size | null;
  runnerUp: Size | null;
  confidence: Confidence;
  confidenceReasons: string[];
  betweenSizes: boolean;
  sizes: SizeEvaluation[];
  comparedPoms: Pom[];
  missingInputs: string[];
  limitations: string[];
}

export interface BodyInput {
  body: Partial<Record<BodyMeasure, number>>;
  preference: FitPreference;
}

export interface ReferenceInput {
  referenceProduct: Product;
  referenceSize: Size;
}

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

export const STANDARD_LIMITATIONS = [
  "Recommendations compare published garment measurements with the measurements you provide. They do not measure your body.",
  "Self-measurement error of 1–2 cm is common and can change the result near a size boundary.",
  "Fabric drape, stretch recovery, posture and personal taste are not fully captured by measurements.",
  "Garment measurements carry manufacturing tolerances, typically ±1–2 cm per point of measure.",
];

function score(
  delta: number,
  target: Range,
  weight: number,
  isCircumference: boolean,
): { status: PomStatus; penalty: number } {
  const [min, max] = target;
  if (delta < min) {
    const gap = min - delta;
    return {
      status: isCircumference ? "tight" : "short",
      penalty: gap * weight * (isCircumference ? TIGHT_MULTIPLIER : 1),
    };
  }
  if (delta > max) {
    return { status: isCircumference ? "loose" : "long", penalty: (delta - max) * weight };
  }
  return { status: "within", penalty: 0 };
}

function pickBest(sizes: SizeEvaluation[], order: Size[], preferLarger: boolean) {
  const ranked = [...sizes].sort((a, b) => {
    const diff = a.penalty - b.penalty;
    if (Math.abs(diff) > 0.25) return diff;
    // Near-tie: honour the customer's preference for room.
    const ia = order.indexOf(a.size);
    const ib = order.indexOf(b.size);
    return preferLarger ? ib - ia : ia - ib;
  });
  return ranked;
}

function assessConfidence(
  ranked: SizeEvaluation[],
  comparedPoms: Pom[],
  order: Size[],
): Pick<Recommendation, "confidence" | "confidenceReasons" | "betweenSizes" | "runnerUp"> {
  const best = ranked[0];
  const second = ranked[1];
  const margin = second ? second.penalty - best.penalty : Infinity;
  const adjacent = second ? Math.abs(order.indexOf(second.size) - order.indexOf(best.size)) === 1 : false;
  const betweenSizes = adjacent && margin < 1.5;
  const reasons: string[] = [];

  let confidence: Confidence;
  if (comparedPoms.length < 2) {
    confidence = "low";
    reasons.push(`Only ${comparedPoms.length} point of measure could be compared.`);
  } else if (best.hardStops.length > 0) {
    confidence = "low";
    reasons.push("Even the best size has a measurement that is likely too small.");
  } else if (best.penalty === 0 && margin >= 2) {
    confidence = "high";
    reasons.push("Every compared measurement falls inside the target range.");
  } else if (best.penalty <= 4 && margin >= 1) {
    confidence = "medium";
    reasons.push("The best size is close to the target range on most points of measure.");
  } else {
    confidence = "low";
    reasons.push("No size sits comfortably inside the target ranges.");
  }
  if (betweenSizes) {
    reasons.push(`${best.size} and ${second!.size} score within ${round(margin)} points of each other.`);
    if (confidence === "high") confidence = "medium";
  }
  return { confidence, confidenceReasons: reasons, betweenSizes, runnerUp: second?.size ?? null };
}

/** Mode 1: compare garment measurements with the customer's body measurements. */
export function recommendFromBody(product: Product, input: BodyInput): Recommendation {
  const easeTable = EASE_RANGES[product.category];
  const lengthTable = LENGTH_RANGES[product.category] ?? {};
  const candidatePoms = Object.keys(product.measurements[product.sizes[0]] ?? {}) as Pom[];

  const comparedPoms: Pom[] = [];
  const missingInputs: string[] = [];
  for (const pom of candidatePoms) {
    const bodyKey = POM_TO_BODY[pom];
    const hasRange = easeTable[pom] || lengthTable[pom];
    if (!bodyKey || !hasRange || pomWeight(product.category, pom) === 0) continue;
    if (input.body[bodyKey] == null || Number.isNaN(input.body[bodyKey])) {
      missingInputs.push(bodyKey);
      continue;
    }
    comparedPoms.push(pom);
  }

  const sizes: SizeEvaluation[] = product.sizes.map((size) => {
    const evaluations: PomEvaluation[] = [];
    const hardStops: string[] = [];
    for (const pom of comparedPoms) {
      const garment = product.measurements[size]?.[pom];
      if (garment == null) continue;
      const body = input.body[POM_TO_BODY[pom]!]!;
      const isCirc = CIRCUMFERENCE_POMS.includes(pom);
      let target: Range = isCirc ? easeTable[pom]![input.preference] : lengthTable[pom]!;
      if (isCirc && product.stretch) target = [target[0] - STRETCH_ALLOWANCE, target[1]];
      const delta = round(garment - body);
      const weight = pomWeight(product.category, pom);
      const { status, penalty } = score(delta, target, weight, isCirc);
      if (isCirc && delta < (product.stretch ? -STRETCH_ALLOWANCE : 0)) {
        hardStops.push(`${pom} measures ${Math.abs(delta)} cm smaller than the body`);
      }
      evaluations.push({ pom, garment, compareTo: body, delta, target, status, weight, penalty: round(penalty, 2) });
    }
    const penalty = round(evaluations.reduce((s, e) => s + e.penalty, 0), 2);
    return { size, evaluations, penalty, hardStops };
  });

  const ranked = pickBest(sizes, product.sizes, input.preference === "relaxed");
  const conf = assessConfidence(ranked, comparedPoms, product.sizes);
  return {
    mode: "body",
    productId: product.id,
    recommendedSize: comparedPoms.length ? ranked[0].size : null,
    ...conf,
    sizes,
    comparedPoms,
    missingInputs,
    limitations: STANDARD_LIMITATIONS,
  };
}

/** Reference garments are compared within 1 cm before any penalty applies. */
const REFERENCE_TOLERANCE = 1;

/**
 * Mode 2: "fits like the size X I already own". Compares the target product's
 * garment measurements with a reference garment of the same category.
 */
export function recommendFromReference(product: Product, input: ReferenceInput): Recommendation {
  const ref = input.referenceProduct.measurements[input.referenceSize] ?? {};
  const limitations = [
    ...STANDARD_LIMITATIONS.slice(1),
    "Reference matching assumes the reference garment fits you the way you like. Its fit intent and fabric may differ from this product.",
  ];
  if (input.referenceProduct.category !== product.category) {
    return {
      mode: "reference",
      productId: product.id,
      recommendedSize: null,
      runnerUp: null,
      confidence: "low",
      confidenceReasons: ["Reference garment is from a different category, so measurements are not comparable."],
      betweenSizes: false,
      sizes: [],
      comparedPoms: [],
      missingInputs: [],
      limitations,
    };
  }

  const comparedPoms = (Object.keys(ref) as Pom[]).filter(
    (pom) => product.measurements[product.sizes[0]]?.[pom] != null && pomWeight(product.category, pom) > 0,
  );

  const sizes: SizeEvaluation[] = product.sizes.map((size) => {
    const evaluations: PomEvaluation[] = [];
    const hardStops: string[] = [];
    for (const pom of comparedPoms) {
      const garment = product.measurements[size]?.[pom];
      if (garment == null) continue;
      const compareTo = ref[pom]!;
      const delta = round(garment - compareTo);
      const isCirc = CIRCUMFERENCE_POMS.includes(pom);
      const target: Range = [-REFERENCE_TOLERANCE, REFERENCE_TOLERANCE];
      const weight = pomWeight(product.category, pom);
      const { status, penalty } = score(delta, target, weight, isCirc || pom === "shoulder");
      if (isCirc && delta < -4 && !product.stretch) hardStops.push(`${pom} is ${Math.abs(delta)} cm smaller than your reference`);
      evaluations.push({ pom, garment, compareTo, delta, target, status, weight, penalty: round(penalty, 2) });
    }
    const penalty = round(evaluations.reduce((s, e) => s + e.penalty, 0), 2);
    return { size, evaluations, penalty, hardStops };
  });

  const ranked = pickBest(sizes, product.sizes, false);
  const conf = assessConfidence(ranked, comparedPoms, product.sizes);
  return {
    mode: "reference",
    productId: product.id,
    recommendedSize: comparedPoms.length ? ranked[0].size : null,
    ...conf,
    sizes,
    comparedPoms,
    missingInputs: [],
    limitations,
  };
}

/** Plain-language summary built only from the deterministic result. Used when Bedrock is off or fails. */
export function templateExplanation(product: Product, rec: Recommendation): string {
  if (!rec.recommendedSize) {
    return rec.missingInputs.length
      ? `We need your ${rec.missingInputs.join(", ")} measurement to compare against ${product.name}.`
      : `We couldn't compare measurements for ${product.name}. ${rec.confidenceReasons.join(" ")}`;
  }
  const best = rec.sizes.find((s) => s.size === rec.recommendedSize)!;
  const parts = best.evaluations.map((e) => {
    const signed = `${e.delta > 0 ? "+" : ""}${e.delta} cm`;
    const word =
      e.status === "within" ? "within the target" : e.status === "tight" ? "snugger than target" : e.status === "loose" ? "roomier than target" : e.status === "short" ? "shorter than target" : "longer than target";
    return `${e.pom} ${signed} (${word} ${e.target[0]} to ${e.target[1]} cm)`;
  });
  const base =
    rec.mode === "body"
      ? `Size ${rec.recommendedSize} gives the closest match to your measurements and fit preference: ${parts.join("; ")}.`
      : `Size ${rec.recommendedSize} is closest to your reference garment: ${parts.join("; ")}.`;
  const between = rec.betweenSizes && rec.runnerUp ? ` You're between sizes — ${rec.runnerUp} is a close alternative.` : "";
  return `${base}${between} Confidence: ${rec.confidence}.`;
}
