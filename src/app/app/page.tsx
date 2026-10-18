import Link from "next/link";
import { loadWorkspace } from "@/lib/load";
import { countBy, fitTotal, overview, pct, returnMatrix } from "@/lib/analytics";
import { BarList, StackedBars, heat } from "@/components/charts";
import { ConsistencyBadge } from "@/components/StatusBadge";
import { CATEGORIES, FEEDBACK_CATEGORIES } from "@/lib/types";

export const metadata = { title: "Fit insights" };

export default async function InsightsPage() {
  const { products, feedback, sales, consistency } = await loadWorkspace();
  const o = overview(products, feedback, sales);
  const byId = new Map(products.map((p) => [p.id, p]));
  const fitOnly = FEEDBACK_CATEGORIES.filter((c) => c !== "not_fit_related");

  const byProduct = countBy(feedback, (f) => f.productId);
  const productRows = products
    .map((p) => ({ key: p.id, label: p.name, counts: byProduct.get(p.id)! }))
    .filter((r) => r.counts)
    .sort((a, b) => fitTotal(b.counts) - fitTotal(a.counts));

  const byCat = countBy(feedback, (f) => byId.get(f.productId)?.category ?? null);
  const bySize = countBy(feedback, (f) => f.size);
  const flagged = consistency.filter((c) => c.status !== "consistent");
  const matrix = returnMatrix(products, sales);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Fit insights dashboard</div>
          <h1>Where fit is going wrong</h1>
          <p>Patterns in classified return feedback, return rates by size, and products whose measurements or feedback drift from your established sizing.</p>
        </div>
        <Link href="/app/feedback/import" className="btn">Import feedback</Link>
      </div>

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div className="card kpi">
          <div className="label">Return rate (all units)</div>
          <div className="value">{pct(o.returnRate, 1)}</div>
          <div className="delta">{o.unitsReturned.toLocaleString()} of {o.unitsSold.toLocaleString()} units</div>
        </div>
        <div className="card kpi">
          <div className="label">Feedback that is fit-related</div>
          <div className="value">{pct(o.fitShare)}</div>
          <div className="delta">of {o.feedbackCount - o.unclassified} classified comments</div>
        </div>
        <div className="card kpi">
          <div className="label">Products flagged</div>
          <div className="value">{flagged.length}</div>
          <div className="delta">{consistency.filter((c) => c.status === "potential_inconsistency").length} corroborated by feedback</div>
        </div>
        <div className="card kpi">
          <div className="label">Awaiting classification / review</div>
          <div className="value">
            {o.unclassified}
            <span className="muted" style={{ fontSize: "1.4rem" }}> / {o.needsReview}</span>
          </div>
          <div className="delta">
            <Link href="/app/feedback?filter=pending" className="burgundy">Open review queue →</Link>
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="panel-title">
            <h3>Sizing signals to review</h3>
            <Link href="/app/consistency" className="small burgundy">All consistency checks →</Link>
          </div>
          <div className="stack">
            {flagged
              .sort((a, b) => (a.status === "potential_inconsistency" ? -1 : b.status === "potential_inconsistency" ? 1 : 0))
              .map((c) => (
                <div key={c.productId} className="row between" style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div style={{ flex: "1 1 420px" }}>
                    <Link href={`/app/consistency#${c.productId}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                      {byId.get(c.productId)?.name}
                    </Link>{" "}
                    <span className="muted small">{byId.get(c.productId)?.sku}</span>
                    <p className="small muted" style={{ margin: "4px 0 0" }}>{c.summary}</p>
                  </div>
                  <ConsistencyBadge status={c.status} />
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="grid g2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="panel-title">
            <h3>Fit feedback by product</h3>
            <span className="tiny muted">classified comments</span>
          </div>
          <StackedBars rows={productRows} include={fitOnly} />
        </div>
        <div className="card">
          <div className="panel-title">
            <h3>Fit feedback by size</h3>
            <span className="tiny muted">all products</span>
          </div>
          <StackedBars
            rows={["XS", "S", "M", "L", "XL"].filter((s) => bySize.has(s)).map((s) => ({ key: s, label: s, counts: bySize.get(s)! }))}
            include={fitOnly}
          />
          <hr className="rule" style={{ margin: "22px 0 18px" }} />
          <div className="panel-title">
            <h3>By garment category</h3>
          </div>
          <BarList
            rows={CATEGORIES.filter((c) => byCat.has(c)).map((c) => ({
              key: c,
              label: c[0].toUpperCase() + c.slice(1),
              value: fitTotal(byCat.get(c)!),
              tip: `${c}: ${fitTotal(byCat.get(c)!)} fit-related comments`,
            }))}
          />
        </div>
      </div>

      <div className="card">
        <div className="panel-title">
          <h3>Return rate by product and size</h3>
          <span className="tiny muted">darker = higher return rate · all return reasons</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                {["XS", "S", "M", "L", "XL"].map((s) => (
                  <th key={s} className="num">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ product, cells }) => (
                <tr key={product.id}>
                  <td>
                    <Link href={`/app/products/${product.id}`}>{product.name}</Link>
                  </td>
                  {cells.map((c) => (
                    <td
                      key={c.size}
                      className="num mono"
                      style={heat(c.rate)}
                      data-tip={`${product.name} · ${c.size}\n${c.returned} returned of ${c.sold} sold (${pct(c.rate, 1)})`}
                    >
                      {pct(c.rate)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
