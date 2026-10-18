import Link from "next/link";
import { loadWorkspace } from "@/lib/load";
import { ConsistencyBadge } from "@/components/StatusBadge";
import { CategoryLegend, catColor } from "@/components/charts";
import { FEEDBACK_CATEGORIES, FEEDBACK_LABELS, POM_LABELS } from "@/lib/types";
import { pct } from "@/lib/analytics";

export const metadata = { title: "Size consistency" };

const ORDER = { potential_inconsistency: 0, measurement_only: 1, feedback_only: 2, consistent: 3 };

export default async function ConsistencyPage() {
  const { products, charts, consistency } = await loadWorkspace();
  const byId = new Map(products.map((p) => [p.id, p]));
  const chartById = new Map(charts.map((c) => [c.id, c]));
  const list = [...consistency].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const fitCats = FEEDBACK_CATEGORIES.filter((c) => c !== "not_fit_related");

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Size consistency monitoring</div>
          <h1>Does each product match your sizing?</h1>
          <p>
            Two independent signals. <strong>Measurements</strong>: each product compared with the block it is graded from, using the
            block&apos;s tolerances. <strong>Feedback</strong>: what customers say when they return it. A product is only marked a{" "}
            <em>potential inconsistency</em> when both point the same way. Always confirm against a physical sample before changing a pattern.
          </p>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 24 }}>
        {(["potential_inconsistency", "measurement_only", "feedback_only", "consistent"] as const).map((s) => (
          <div className="card kpi" key={s}>
            <ConsistencyBadge status={s} />
            <div className="value">{consistency.filter((c) => c.status === s).length}</div>
          </div>
        ))}
      </div>

      <CategoryLegend include={fitCats} />
      <div className="stack">
        {list.map((c) => {
          const p = byId.get(c.productId)!;
          const chart = chartById.get(c.chartId)!;
          const fb = c.feedback;
          return (
            <section className="card" key={c.productId} id={c.productId} style={{ scrollMarginTop: 24 }}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ marginBottom: 2 }}>
                    <Link href={`/app/products/${p.id}`} style={{ textDecoration: "none" }}>{p.name}</Link>
                  </h3>
                  <div className="small muted">{p.sku} · graded from {chart.name}</div>
                </div>
                <ConsistencyBadge status={c.status} />
              </div>
              <p className="small" style={{ margin: "12px 0 16px" }}>{c.summary}</p>

              {c.status !== "consistent" && (
                <div className="grid g2" style={{ alignItems: "start" }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Signal 1 · measurements vs block</div>
                    {c.outside.length ? (
                      <div className="table-wrap">
                        <table className="data" style={{ fontSize: 13 }}>
                          <thead>
                            <tr>
                              <th>POM</th>
                              <th>Size</th>
                              <th className="num">Measured</th>
                              <th className="num">Spec</th>
                              <th className="num">Deviation</th>
                              <th className="num">Tol.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.outside.map((d) => (
                              <tr key={d.size + d.pom}>
                                <td>{POM_LABELS[d.pom]}</td>
                                <td>{d.size}</td>
                                <td className="num mono">{d.measured}</td>
                                <td className="num mono">{d.spec}</td>
                                <td className="num mono" style={{ color: "var(--bad)", fontWeight: 600 }}>
                                  {d.deviation > 0 ? "+" : ""}
                                  {d.deviation}
                                </td>
                                <td className="num mono muted">±{d.tolerance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="small muted">✓ All measurements within tolerance.</p>
                    )}
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Signal 2 · return feedback</div>
                    <div className="small" style={{ marginBottom: 8 }}>
                      {fb.fitReturns} fit-related of {fb.totalFeedback} classified comments · return rate {pct(fb.returnRate, 1)}
                      {fb.topArea ? ` · most mentioned area: ${fb.topArea}` : ""}
                    </div>
                    <div className="stack-track" style={{ height: 18 }}>
                      {fitCats
                        .filter((k) => fb.byCategory[k])
                        .map((k) => (
                          <span key={k} style={{ flex: fb.byCategory[k], background: catColor(k) }} data-tip={`${FEEDBACK_LABELS[k]}: ${fb.byCategory[k]}`} />
                        ))}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 6 }}>
                      {fitCats
                        .filter((k) => fb.byCategory[k])
                        .map((k) => `${FEEDBACK_LABELS[k]} ${fb.byCategory[k]}`)
                        .join(" · ")}
                    </div>
                    <Link href={`/app/feedback?product=${p.id}`} className="small burgundy" style={{ display: "inline-block", marginTop: 10 }}>
                      Read the comments →
                    </Link>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
