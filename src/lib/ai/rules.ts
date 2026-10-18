import type { BodyArea, Classification, FeedbackCategory } from "../types";

/*
 * Deterministic keyword classifier. Used when Bedrock is disabled, unavailable
 * or returns something unusable. It is deliberately simple and conservative:
 * when nothing matches, it says "unexpected_fit" or "not_fit_related" with low
 * confidence so a person can review it.
 */

const CATEGORY_PATTERNS: [FeedbackCategory, RegExp][] = [
  ["too_small", /\b(too (small|tight|snug|narrow)|tight|snug|runs small|size up|couldn'?t (button|zip|close)|restrict|pull(s|ed|ing)? across|digs? in|cut(s|ting)? in|short in the waist)\b/i],
  ["too_large", /\b(too (big|large|loose|baggy|wide|roomy)|baggy|swim(ming)? in|runs (big|large)|size down|gap(e|es|ing|ping)|falls? off|drown)/i],
  ["too_long", /\b(too long|sleeves? (were |are )?long|puddl|drag(s|ged|ging)? on|had to (hem|roll))/i],
  ["too_short", /\b(too short|cropped more|rides? up|shows? (my )?(midriff|ankles|wrists)|sleeves? (were |are )?short|above the ankle)/i],
  ["unexpected_fit", /\b(boxy|shapeless|weird (fit|shape)|odd (fit|shape|proportion)|not as pictured|different from (photo|picture|model)|unflattering|fit (is|was) strange|cut is off|didn'?t drape)/i],
];

const NOT_FIT = /\b(colou?r|damaged|faulty|stain|hole|late|delivery|changed my mind|gift|duplicate|wrong item|quality|pilling|fabric feels|itchy|scratchy|didn'?t need)\b/i;

const AREA_PATTERNS: [BodyArea, RegExp][] = [
  ["chest", /\b(chest|bust|across the front|buttons? pull|placket|pecs?)\b/i],
  ["shoulder", /\bshoulders?\b/i],
  ["sleeve", /\b(sleeves?|arms?|wrists?|cuffs?)\b/i],
  ["waist", /\b(waist|waistband|belly|stomach|tummy)\b/i],
  ["hip", /\b(hips?|seat|bum|butt|thighs?)\b/i],
  ["inseam", /\b(inseam|leg length|ankles?|hem|puddl)/i],
  ["rise", /\b(rise|crotch)\b/i],
  ["length", /\b(length|long|short|midriff|cropped|torso)\b/i],
];

export function classifyWithRules(text: string): Classification {
  const now = new Date().toISOString();
  const hits = CATEGORY_PATTERNS.filter(([, re]) => re.test(text)).map(([c]) => c);
  let area: BodyArea = "overall";
  for (const [a, re] of AREA_PATTERNS) {
    if (re.test(text)) {
      area = a;
      break;
    }
  }

  if (hits.length === 0) {
    if (NOT_FIT.test(text)) {
      return { category: "not_fit_related", area: "overall", confidence: 0.6, rationale: "Mentions a non-fit reason (colour, quality, delivery or preference).", method: "rules", classifiedAt: now };
    }
    return { category: "unexpected_fit", area, confidence: 0.3, rationale: "No clear fit keyword found; needs human review.", method: "rules", classifiedAt: now };
  }

  // Length complaints should map to a length area if one was named.
  const category = hits[0];
  if ((category === "too_long" || category === "too_short") && area === "overall") area = "length";
  const confidence = hits.length === 1 ? 0.75 : 0.5;
  const rationale =
    hits.length === 1
      ? `Matched "${category.replace("_", " ")}" phrasing${area !== "overall" ? ` referring to the ${area}` : ""}.`
      : `Mixed signals (${hits.join(", ")}); chose the first match. Review recommended.`;
  return { category, area, confidence, rationale, method: "rules", classifiedAt: now };
}
