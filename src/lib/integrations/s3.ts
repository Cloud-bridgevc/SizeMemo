import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/*
 * Amazon S3 holds permitted product images and supporting files (feedback CSV
 * exports, tech packs). The browser uploads directly with a short-lived
 * presigned PUT; the server never proxies file bytes.
 *
 * Keys: <org>/<kind>/<yyyy-mm>/<uuid>-<safe-name>
 *   feedback_csv uploads trigger the import Lambda via an S3 event notification
 *   on the "*\/feedback_csv/" prefix.
 */

export type FileKind = "product_image" | "feedback_csv" | "tech_pack";

const ALLOWED: Record<FileKind, string[]> = {
  product_image: ["image/jpeg", "image/png", "image/webp"],
  feedback_csv: ["text/csv", "application/vnd.ms-excel"],
  tech_pack: ["application/pdf"],
};

export const s3Configured = () => Boolean(process.env.SIZEMEMO_S3_BUCKET);

let client: S3Client | null = null;
const s3 = () => (client ??= new S3Client({ region: process.env.AWS_REGION }));

export async function presignUpload(kind: FileKind, filename: string, contentType: string) {
  if (!s3Configured()) throw new Error("S3 is not configured (SIZEMEMO_S3_BUCKET).");
  if (!ALLOWED[kind].includes(contentType)) throw new Error(`Content type ${contentType} not allowed for ${kind}.`);
  const org = process.env.SIZEMEMO_ORG_ID || "default";
  const safe = filename.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-").slice(0, 80);
  const key = `${org}/${kind}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}-${safe}`;
  const url = await getSignedUrl(
    s3(),
    // Encryption is enforced by the bucket's default SSE-KMS setting, so the browser needs no extra headers.
    new PutObjectCommand({ Bucket: process.env.SIZEMEMO_S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );
  return { key, url };
}

export async function presignDownload(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: process.env.SIZEMEMO_S3_BUCKET, Key: key }), { expiresIn: 300 });
}
