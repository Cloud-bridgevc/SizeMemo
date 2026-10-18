import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { BODY_AREAS, FEEDBACK_CATEGORIES, type Classification, type Product } from "../types";
import type { Recommendation } from "../sizing/recommend";
import { classifyWithRules } from "./rules";
import { templateExplanation } from "../sizing/recommend";

/*
 * Amazon Bedrock is a support layer only:
 *   1. classifying unstructured return feedback into fixed categories, and
 *   2. phrasing an explanation of a recommendation that was already computed.
 * It never chooses a size. Every call has a deterministic fallback.
 */

export const bedrockEnabled = () => process.env.BEDROCK_ENABLED === "true";
export const modelId = () => process.env.BEDROCK_MODEL_ID || "anthropic.claude-opus-5-5";

let client: AnthropicBedrockMantle | null = null;
function getClient() {
  client ??= new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION });
  return client;
}

const ClassificationSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  area: z.enum(BODY_AREAS),
  confidence: z.number(),
  rationale: z.string(),
});

const CLASSIFY_SYSTEM = `You classify apparel return feedback for a fashion retailer's fit team.

Categories:
- too_small: garment is tight, narrow or restrictive somewhere (circumference or width).
- too_large: garment is loose, baggy, gaping or oversized somewhere.
- too_long: a length (body, sleeve, inseam) is longer than wanted.
- too_short: a length is shorter than wanted.
- unexpected_fit: the size is broadly right but the shape, proportion or drape is not what the customer expected.
- not_fit_related: the return is about colour, quality, delivery, damage, or a change of mind.

Area is where on the body the issue is felt; use "overall" if unspecified.
Confidence is 0-1 and should be low when the text is ambiguous, mixes several issues, or is very short.
Rationale is one short sentence quoting or paraphrasing the deciding phrase. Do not speculate about the customer's body.`;

export async function classifyFeedback(text: string, product?: Pick<Product, "name" | "category">): Promise<Classification> {
  if (!bedrockEnabled()) return classifyWithRules(text);
  try {
    const response = await getClient().messages.parse({
      model: modelId(),
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(ClassificationSchema) },
      system: CLASSIFY_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Product: ${product?.name ?? "unknown"} (${product?.category ?? "unknown"})\nCustomer feedback: """${text.slice(0, 4000)}"""`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return classifyWithRules(text);
    const out = response.parsed_output;
    return {
      ...out,
      confidence: Math.max(0, Math.min(1, out.confidence)),
      method: "bedrock",
      model: modelId(),
      classifiedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Bedrock classification failed, using rules", err);
    return classifyWithRules(text);
  }
}

const EXPLAIN_SYSTEM = `You explain a size recommendation that has ALREADY been calculated by a deterministic measurement engine.
Rules:
- Use only the numbers provided. Never invent measurements, sizes or statistics.
- Never change the recommended size or the confidence level.
- 2-4 short sentences, warm and plain, for a shopper. Mention the most decisive measurement(s).
- If betweenSizes is true, say so and name the alternative.
- Do not claim to know the shopper's body beyond the measurements they entered.`;

export async function explainRecommendation(product: Product, rec: Recommendation): Promise<{ text: string; method: "bedrock" | "template" }> {
  const fallback = { text: templateExplanation(product, rec), method: "template" as const };
  if (!bedrockEnabled() || !rec.recommendedSize) return fallback;
  try {
    const best = rec.sizes.find((s) => s.size === rec.recommendedSize);
    const payload = {
      product: { name: product.name, category: product.category, fitIntent: product.fitIntent, stretch: product.stretch },
      mode: rec.mode,
      recommendedSize: rec.recommendedSize,
      runnerUp: rec.runnerUp,
      betweenSizes: rec.betweenSizes,
      confidence: rec.confidence,
      evaluations: best?.evaluations,
    };
    const response = await getClient().messages.create({
      model: modelId(),
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: EXPLAIN_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    if (response.stop_reason === "refusal") return fallback;
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    return text ? { text, method: "bedrock" } : fallback;
  } catch (err) {
    console.error("Bedrock explanation failed, using template", err);
    return fallback;
  }
}
