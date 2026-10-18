/*
 * AWS Lambda background workers. Bundled with esbuild (see infra/README in
 * docs/ARCHITECTURE.md) and run with DATABASE_URL, AWS_REGION,
 * BEDROCK_ENABLED=true and BEDROCK_MODEL_ID set.
 *
 *   feedbackImport      S3 ObjectCreated on <org>/feedback_csv/*  → parse, classify, insert
 *   classifyBacklog     EventBridge every 15 min                  → classify rows with no category
 *   consistencySnapshot EventBridge nightly                       → store consistency results
 */
import type { EventBridgeEvent, S3Event } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { postgresRepository as repo, pool } from "../src/lib/data/postgres";
import { parseFeedbackCsv } from "../src/lib/feedback-import";
import { classifyFeedback } from "../src/lib/ai/bedrock";
import { assessCatalogue } from "../src/lib/sizing/consistency";
import type { FeedbackRecord, Product } from "../src/lib/types";

const s3 = new S3Client({});
const CONCURRENCY = 4;

async function classifyAll(records: FeedbackRecord[], products: Product[]) {
  const byId = new Map(products.map((p) => [p.id, p]));
  for (let i = 0; i < records.length; i += CONCURRENCY) {
    await Promise.all(
      records.slice(i, i + CONCURRENCY).map(async (r) => {
        r.classification = await classifyFeedback(r.text, byId.get(r.productId));
      }),
    );
  }
}

export async function feedbackImport(event: S3Event) {
  const products = await repo.listProducts();
  for (const rec of event.Records) {
    const Bucket = rec.s3.bucket.name;
    const Key = decodeURIComponent(rec.s3.object.key.replace(/\+/g, " "));
    const obj = await s3.send(new GetObjectCommand({ Bucket, Key }));
    const text = await obj.Body!.transformToString("utf-8");
    const { records, errors } = parseFeedbackCsv(text, products, `s3-${Key.split("/").pop()?.slice(0, 8)}`);
    await classifyAll(records, products);
    await repo.addFeedback(records);
    await pool().query(`UPDATE return_feedback SET import_file_key = $1 WHERE id = ANY($2)`, [Key, records.map((r) => r.id)]);
    console.log(JSON.stringify({ msg: "feedback import", key: Key, imported: records.length, errors }));
  }
}

export async function classifyBacklog(_event: EventBridgeEvent<"Scheduled Event", unknown>) {
  const products = await repo.listProducts();
  const pending = (await repo.listFeedback()).filter((f) => !f.classification).slice(0, 200);
  await classifyAll(pending, products);
  for (const f of pending) await repo.setClassification(f.id, f.classification!, false);
  console.log(JSON.stringify({ msg: "classified backlog", count: pending.length }));
}

export async function consistencySnapshot(_event: EventBridgeEvent<"Scheduled Event", unknown>) {
  const [products, charts, feedback, sales] = await Promise.all([repo.listProducts(), repo.listSizeCharts(), repo.listFeedback(), repo.listSales()]);
  const results = assessCatalogue(products, charts, feedback, sales);
  for (const r of results) {
    await pool().query(
      `INSERT INTO consistency_snapshots (product_id, status, summary, detail) VALUES ($1, $2, $3, $4)`,
      [r.productId, r.status, r.summary, JSON.stringify({ systematicPoms: r.systematicPoms, feedback: r.feedback, outside: r.outside })],
    );
  }
  console.log(JSON.stringify({ msg: "consistency snapshot", products: results.length, flagged: results.filter((r) => r.status !== "consistent").length }));
}
