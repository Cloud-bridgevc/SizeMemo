import { loadWorkspace } from "@/lib/load";
import { countBy, fitTotal, pct, total, weeklyFit } from "@/lib/analytics";
import { CategoryLegend, catColor } from "@/components/charts";
import { CATEGORIES, FEEDBACK_CATEGORIES, FEEDBACK_LABELS } from "@/lib/types";

export const metadata = { title: "Analytics & reports" };

export default async function ReportsPage() {
  const { products, feedback, sales, consistency } = await loadWorkspace();
  const weeks = weeklyFit(feedback);
  const fitCats = FEEDBACK_CATEGORIES.filter((c) => c !== "not_fit_related");
  const maxWeek = Math.max(1, ...weeks.map(([, c]) => fitTotal(c)));
  const byId = new Map(products.map((p) => [p.id, p]));
  const byCat = countBy(feedback, (f) => byId.get(f.productId)?.category ?? null);

  const catRows = CATEGORIES.map((cat) => {
    const ps = products.filter((p) => p.category === cat);
    const s = sales.filter((x) => ps.some((p) => p.id === x.productId));
    const sold = s.reduce((a, x) => a + x.unitsSold, 0);
    const ret = s.reduce((a, x) => a + x.unitsReturned, 0);
    const c = byCat.get(cat);
    return { cat, products: ps.length, sold, ret, counts: c, flagged: consistency.filter((x) => ps.some((p) => p.id === x.productId) && x.status !== "consistent").length };
  }).filter((r) => r.products);

  const chartH = 180;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Analytics and reports</div>
          <h1>Reports</h1>
          <p>Trends in fit-related feedback and a category summary. Download any report as CSV for merchandising or production meetings.</p>
        </div>
        <div className="row">
          <a className="btn ghost sm" href="/api/reports/feedback">Feedback CSV</a>
          <a className="btn ghost sm" href="/api/reports/consistency">Consistency CSV</a>
          <a className="btn ghost sm" href="/api/reports/returns">Returns by size CSV</a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="panel-title">
          <h3>Fit-related feedback per week</h3>
          <span className="tiny muted">week starting (Monday)</span>
        </div>
        <CategoryLegend include={fitCats} />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: chartH + 28, overflowX: "auto", paddingBottom: 4 }} role="img" aria-label="Weekly fit feedback, stacked by category">
          {weeks.map(([week, c]) => {
            const t = fitTotal(c);
            return (
              <div key={week} style={{ flex: "1 0 26px", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ height: chartH, display: "flex", flexDirection: "column-reverse", gap: 2 }}>
                  {fitCats
                    .filter((k) => c[k])
                    .map((k, i, arr) => (
                      <span
                        key={k}
                        style={{ height: (c[k] / maxWeek) * (chartH - arr.length * 2), background: catColor(k), borderRadius: i === arr.length - 1 ? "4px 4px 0 0" : 0 }}
                        data-tip={`Week of ${week}\n${FEEDBACK_LABELS[k]}: ${c[k]} of ${t}`}
                      />
                    ))}
                </div>
                <div className="tiny muted" style={{ textAlign: "center", marginTop: 6, whiteSpace: "nowrap" }}>{week.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="panel-title">
          <h3>Category summary</h3>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Products</th>
                <th className="num">Units sold</th>
                <th className="num">Return rate</th>
                <th className="num">Fit share of feedback</th>
                {fitCats.map((k) => (
                  <th key={k} className="num">{FEEDBACK_LABELS[k]}</th>
                ))}
                <th className="num">Flagged</th>
              </tr>
            </thead>
            <tbody>
              {catRows.map((r) => (
                <tr key={r.cat}>
                  <td style={{ textTransform: "capitalize", fontWeight: 500 }}>{r.cat}</td>
                  <td className="num mono">{r.products}</td>
                  <td className="num mono">{r.sold.toLocaleString()}</td>
                  <td className="num mono">{pct(r.sold ? r.ret / r.sold : 0, 1)}</td>
                  <td className="num mono">{r.counts ? pct(fitTotal(r.counts) / Math.max(1, total(r.counts))) : "—"}</td>
                  {fitCats.map((k) => (
                    <td key={k} className="num mono">{r.counts?.[k] ?? 0}</td>
                  ))}
                  <td className="num mono">{r.flagged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card beige small">
        <h3>How to read these numbers</h3>
        <ul className="muted">
          <li>Return rate counts every returned unit; fit share is based on the subset of returns that left a comment.</li>
          <li>Classification is automated and reviewable. Low-confidence classifications still count here; confirm or correct them in the review queue to improve accuracy.</li>
          <li>The demo dataset is fictional and sized for illustration; real volumes will make small differences less noisy.</li>
        </ul>
      </div>
    </>
  );
}
