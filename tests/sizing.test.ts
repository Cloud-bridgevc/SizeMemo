import { describe, expect, it } from "vitest";
import { recommendFromBody, recommendFromReference } from "@/lib/sizing/recommend";
import { assessCatalogue } from "@/lib/sizing/consistency";
import { classifyWithRules } from "@/lib/ai/rules";
import { FEEDBACK, PRODUCTS, SALES, SIZE_CHARTS } from "@/lib/data/seed";

const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

describe("recommendFromBody", () => {
  const profileA = { body: { chest: 100, waist: 88, arm: 63 }, preference: "regular" as const };

  it("recommends L in the on-spec Arden shirt with every POM inside target", () => {
    const rec = recommendFromBody(product("p-arden"), profileA);
    expect(rec.recommendedSize).toBe("L");
    const L = rec.sizes.find((s) => s.size === "L")!;
    expect(L.evaluations.every((e) => e.status === "within")).toBe(true);
    expect(rec.confidence).toBe("high");
  });

  it("recommends XL in the narrow Linden shirt because its chest runs small", () => {
    const rec = recommendFromBody(product("p-linden"), profileA);
    expect(rec.recommendedSize).toBe("XL");
    const L = rec.sizes.find((s) => s.size === "L")!;
    expect(L.evaluations.find((e) => e.pom === "chest")!.status).toBe("tight");
  });

  it("is deterministic", () => {
    expect(recommendFromBody(product("p-linden"), profileA)).toEqual(recommendFromBody(product("p-linden"), profileA));
  });

  it("reports missing inputs and returns no size when nothing can be compared", () => {
    const rec = recommendFromBody(product("p-harlow"), { body: {}, preference: "regular" });
    expect(rec.recommendedSize).toBeNull();
    expect(rec.missingInputs).toEqual(expect.arrayContaining(["waist", "hip", "inseam"]));
  });

  it("flags a hard stop when the garment is smaller than the body", () => {
    const rec = recommendFromBody(product("p-arden"), { body: { chest: 130, waist: 120 }, preference: "regular" });
    expect(rec.confidence).toBe("low");
    expect(rec.sizes.find((s) => s.size === rec.recommendedSize)!.hardStops.length).toBeGreaterThan(0);
  });

  it("relaxed preference never recommends a smaller size than fitted", () => {
    const sizes = product("p-arden").sizes;
    for (const chest of [88, 94, 100, 106]) {
      const fitted = recommendFromBody(product("p-arden"), { body: { chest }, preference: "fitted" }).recommendedSize!;
      const relaxed = recommendFromBody(product("p-arden"), { body: { chest }, preference: "relaxed" }).recommendedSize!;
      expect(sizes.indexOf(relaxed)).toBeGreaterThanOrEqual(sizes.indexOf(fitted));
    }
  });
});

describe("recommendFromReference", () => {
  it("maps Arden L to Linden XL", () => {
    const rec = recommendFromReference(product("p-linden"), { referenceProduct: product("p-arden"), referenceSize: "L" });
    expect(rec.recommendedSize).toBe("XL");
  });

  it("refuses cross-category references", () => {
    const rec = recommendFromReference(product("p-harlow"), { referenceProduct: product("p-arden"), referenceSize: "M" });
    expect(rec.recommendedSize).toBeNull();
  });
});

describe("consistency", () => {
  const results = new Map(assessCatalogue(PRODUCTS, SIZE_CHARTS, FEEDBACK, SALES).map((r) => [r.productId, r]));

  it("flags Linden as a potential inconsistency corroborated by feedback", () => {
    const r = results.get("p-linden")!;
    expect(r.status).toBe("potential_inconsistency");
    expect(r.systematicPoms.find((s) => s.pom === "chest")?.direction).toBe("smaller");
    expect(r.feedback.dominant).toBe("too_small");
  });

  it("treats Ellis as measurement-only and Mara as feedback-only", () => {
    expect(results.get("p-ellis")!.status).toBe("measurement_only");
    expect(results.get("p-mara")!.status).toBe("feedback_only");
  });

  it("leaves on-spec products consistent", () => {
    for (const id of ["p-arden", "p-harlow", "p-corin", "p-calder"]) expect(results.get(id)!.status).toBe("consistent");
  });
});

describe("rules classifier", () => {
  it.each([
    ["Tight across the chest, buttons pull when I sit down.", "too_small", "chest"],
    ["Waist gapes at the back even though the hips fit.", "too_large", "waist"],
    ["Legs are too long, they puddle at the ankle.", "too_long", "inseam"],
    ["Sleeves are too short.", "too_short", "sleeve"],
    ["Boxy shape, not as pictured on the model.", "unexpected_fit", "overall"],
    ["Colour is different from the website.", "not_fit_related", "overall"],
  ])("%s", (text, category, area) => {
    const c = classifyWithRules(text);
    expect(c.category).toBe(category);
    expect(c.area).toBe(area);
  });
});
