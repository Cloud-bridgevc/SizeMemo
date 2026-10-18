import type { FeedbackRecord, Product } from "./types";

/*
 * Parses a returns export (CSV) into feedback records. Shared by the dashboard
 * import screen and the S3-triggered Lambda.
 *
 * Required columns (case-insensitive): sku, size, feedback
 * Optional: order_ref, received_at, source
 */

export interface ParseResult {
  records: FeedbackRecord[];
  errors: { line: number; message: string }[];
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export function parseFeedbackCsv(text: string, products: Product[], idPrefix = "imp"): ParseResult {
  const rows = parseCsv(text);
  const errors: ParseResult["errors"] = [];
  if (!rows.length) return { records: [], errors: [{ line: 1, message: "File is empty." }] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const [iSku, iSize, iText] = [col("sku"), col("size"), col("feedback")];
  if (iSku < 0 || iSize < 0 || iText < 0) {
    return { records: [], errors: [{ line: 1, message: "Header must include sku, size and feedback columns." }] };
  }
  const bySku = new Map(products.map((p) => [p.sku.toLowerCase(), p]));
  const records: FeedbackRecord[] = [];
  const stamp = Date.now().toString(36);

  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const sku = r[iSku]?.trim().toLowerCase();
    const p = sku ? bySku.get(sku) : undefined;
    const size = r[iSize]?.trim().toUpperCase();
    const text = r[iText]?.trim();
    if (!p) return errors.push({ line, message: `Unknown SKU "${r[iSku] ?? ""}".` });
    if (!size || !p.sizes.includes(size)) return errors.push({ line, message: `Size "${r[iSize] ?? ""}" is not offered for ${p.sku}.` });
    if (!text) return errors.push({ line, message: "Feedback text is empty." });
    const received = col("received_at") >= 0 ? Date.parse(r[col("received_at")]) : NaN;
    const source = col("source") >= 0 ? r[col("source")]?.trim() : "";
    records.push({
      id: `${idPrefix}-${stamp}-${idx + 1}`,
      productId: p.id,
      size,
      orderRef: col("order_ref") >= 0 ? r[col("order_ref")]?.trim() ?? "" : "",
      text: text.slice(0, 4000),
      source: (["returns_portal", "support_ticket", "review"] as const).find((s) => s === source) ?? "csv_import",
      receivedAt: Number.isNaN(received) ? new Date().toISOString() : new Date(received).toISOString(),
      classification: null,
      reviewed: false,
    });
  });
  return { records, errors };
}

export const SAMPLE_CSV = `sku,size,order_ref,received_at,feedback
MH-SH-014,L,MH-209331,2026-10-12,"Lovely fabric but the chest is too tight, buttons pull."
MH-SH-014,M,MH-209402,2026-10-13,Runs small across the chest compared to my Arden shirt.
MH-DN-002,M,MH-209415,2026-10-13,Waist gapes at the back after a few hours.
MH-DR-007,S,MH-209440,2026-10-14,"Clings at the hips, not how it looked on the model."
MH-TR-011,L,MH-209452,2026-10-15,Colour is darker than the photos.
MH-OW-004,M,MH-209460,2026-10-15,Sleeves too long for me.`;
