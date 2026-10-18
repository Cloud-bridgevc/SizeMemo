import Link from "next/link";
import { loadWorkspace } from "@/lib/load";
import { FEEDBACK_CATEGORIES, FEEDBACK_LABELS } from "@/lib/types";
import { catColor } from "@/components/charts";
import { ClassifyPendingButton, ReviewControls } from "./FeedbackControls";
import { bedrockEnabled } from "@/lib/ai/bedrock";

export const metadata = { title: "Return feedback" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Needs attention" },
  { key: "reviewed", label: "Reviewed" },
] as const;

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ filter?: string; product?: string; category?: string }> }) {
  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const { feedback, products } = await loadWorkspace();
  const byId = new Map(products.map((p) => [p.id, p]));
  const unclassified = feedback.filter((f) => !f.classification).length;

  const list = feedback
    .filter((f) => !sp.product || f.productId === sp.product)
    .filter((f) => !sp.category || f.classification?.category === sp.category)
    .filter((f) =>
      filter === "pending" ? !f.classification || (!f.reviewed && f.classification.confidence < 0.6) : filter === "reviewed" ? f.reviewed : true,
    )
    .reverse();

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `?${p}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Fit issue classification</div>
          <h1>Return feedback</h1>
          <p>
            Free-text return reasons, classified into fit categories {bedrockEnabled() ? "by Amazon Bedrock" : "by the keyword classifier (Bedrock is off)"}.
            Low-confidence classifications are queued for a person to confirm or correct; corrections are kept as the source of truth.
          </p>
        </div>
        <div className="row">
          <ClassifyPendingButton count={unclassified} />
          <Link href="/app/feedback/import" className="btn ghost">Import CSV</Link>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <div className="seg" role="group" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link key={f.key} href={qs({ filter: f.key })} aria-current={filter === f.key ? "page" : undefined}>
              {f.label}
            </Link>
          ))}
        </div>
        <form className="row">
          <input type="hidden" name="filter" value={filter} />
          <select name="product" defaultValue={sp.product ?? ""} aria-label="Product" style={{ maxWidth: 220 }}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" style={{ maxWidth: 180 }}>
            <option value="">All categories</option>
            {FEEDBACK_CATEGORIES.map((c) => (
              <option key={c} value={c}>{FEEDBACK_LABELS[c]}</option>
            ))}
          </select>
          <button className="btn ghost sm">Apply</button>
        </form>
        <span className="small muted">{list.length} comments</span>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Received</th>
              <th>Product / size</th>
              <th style={{ width: "34%" }}>Customer feedback</th>
              <th>Classification</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 150).map((f) => {
              const p = byId.get(f.productId);
              const c = f.classification;
              return (
                <tr key={f.id}>
                  <td className="small mono muted">{f.receivedAt.slice(0, 10)}</td>
                  <td className="small">
                    <Link href={`/app/products/${f.productId}`}>{p?.name}</Link>
                    <div className="tiny muted">Size {f.size} · {f.orderRef} · {f.source.replace("_", " ")}</div>
                  </td>
                  <td className="small">“{f.text}”</td>
                  <td className="small">
                    {c ? (
                      <>
                        <div className="row" style={{ gap: 6 }}>
                          <i className="dot" style={{ background: catColor(c.category) }} />
                          <strong>{FEEDBACK_LABELS[c.category]}</strong>
                          <span className="muted">· {c.area}</span>
                        </div>
                        <div className="tiny muted" data-tip={c.rationale}>
                          {c.method === "manual" ? "Set by reviewer" : `${c.method === "bedrock" ? "Bedrock" : "Rules"} · ${Math.round(c.confidence * 100)}% confidence`}
                          {c.confidence < 0.6 && c.method !== "manual" && !f.reviewed ? " · ▲ low" : ""}
                        </div>
                      </>
                    ) : (
                      <span className="badge warn">Unclassified</span>
                    )}
                  </td>
                  <td>
                    <ReviewControls id={f.id} category={c?.category} area={c?.area} reviewed={f.reviewed} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {list.length > 150 && <p className="small muted">Showing the 150 most recent of {list.length}.</p>}
    </>
  );
}
