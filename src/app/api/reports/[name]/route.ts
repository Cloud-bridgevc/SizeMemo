import { loadWorkspace } from "@/lib/load";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote, and neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(",")).join("\n");

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { products, feedback, sales, consistency } = await loadWorkspace();
  const byId = new Map(products.map((p) => [p.id, p]));
  let body: string;

  if (name === "feedback") {
    body = csv([
      ["received_at", "sku", "product", "size", "order_ref", "feedback", "category", "area", "confidence", "method", "reviewed"],
      ...feedback.map((f) => [
        f.receivedAt, byId.get(f.productId)?.sku, byId.get(f.productId)?.name, f.size, f.orderRef, f.text,
        f.classification?.category, f.classification?.area, f.classification?.confidence, f.classification?.method, f.reviewed,
      ]),
    ]);
  } else if (name === "consistency") {
    body = csv([
      ["sku", "product", "status", "summary", "systematic_poms", "fit_returns", "dominant_feedback", "return_rate"],
      ...consistency.map((c) => [
        byId.get(c.productId)?.sku, byId.get(c.productId)?.name, c.status, c.summary,
        c.systematicPoms.map((s) => `${s.pom} ${s.meanDeviation}cm (${s.sizes.join("/")})`).join("; "),
        c.feedback.fitReturns, c.feedback.dominant, c.feedback.returnRate.toFixed(3),
      ]),
    ]);
  } else if (name === "returns") {
    body = csv([
      ["sku", "product", "size", "units_sold", "units_returned", "return_rate"],
      ...sales.map((s) => [byId.get(s.productId)?.sku, byId.get(s.productId)?.name, s.size, s.unitsSold, s.unitsReturned, (s.unitsReturned / Math.max(1, s.unitsSold)).toFixed(3)]),
    ]);
  } else {
    return new Response("Unknown report", { status: 404 });
  }
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sizememo-${name}.csv"` },
  });
}
