import { loadWorkspace } from "@/lib/load";
import { CATEGORY_POMS, POM_LABELS, type Pom } from "@/lib/types";
import { GradingChart } from "./GradingChart";
import { pct } from "@/lib/analytics";

export const metadata = { title: "Product comparison" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string; pom?: string }> }) {
  const sp = await searchParams;
  const { products, charts, sales, consistency } = await loadWorkspace();
  const a = products.find((p) => p.id === sp.a) ?? products.find((p) => p.id === "p-linden")!;
  const peers = products.filter((p) => p.category === a.category && p.id !== a.id);
  const b = peers.find((p) => p.id === sp.b) ?? peers[0] ?? a;
  const poms = CATEGORY_POMS[a.category].filter((p) => a.measurements[a.sizes[0]]?.[p] != null || b.measurements[b.sizes[0]]?.[p] != null);
  const pom = (poms.includes(sp.pom as Pom) ? sp.pom : poms[0]) as Pom;
  const chartA = charts.find((c) => c.id === a.sizeChartId);
  const sizes = a.sizes.filter((s) => b.sizes.includes(s));
  const rate = (id: string) => {
    const s = sales.filter((x) => x.productId === id);
    const sold = s.reduce((t, x) => t + x.unitsSold, 0);
    return sold ? s.reduce((t, x) => t + x.unitsReturned, 0) / sold : 0;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Product comparison</div>
          <h1>Compare garments</h1>
          <p>Side-by-side measurements for two products in the same category, against the brand block. Useful for “fits like” guidance and spotting drift.</p>
        </div>
      </div>

      <form className="row" style={{ marginBottom: 20 }}>
        <label className="field" style={{ minWidth: 240 }}>
          <span>Product A</span>
          <select name="a" defaultValue={a.id}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ minWidth: 240 }}>
          <span>Product B (same category)</span>
          <select name="b" defaultValue={b.id}>
            {peers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="field" style={{ minWidth: 180 }}>
          <span>Point of measure</span>
          <select name="pom" defaultValue={pom}>
            {poms.map((p) => (
              <option key={p} value={p}>{POM_LABELS[p]}</option>
            ))}
          </select>
        </label>
        <button className="btn ghost" style={{ alignSelf: "flex-end" }}>Compare</button>
      </form>

      <div className="grid g2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div className="card">
          <div className="panel-title">
            <h3>{POM_LABELS[pom]} across sizes</h3>
            <span className="tiny muted">cm</span>
          </div>
          <GradingChart
            sizes={sizes}
            series={[
              { key: "a", label: a.name, color: "var(--burgundy)", values: sizes.map((s) => a.measurements[s]?.[pom] ?? null) },
              { key: "b", label: b.name, color: "#2c6fa6", values: sizes.map((s) => b.measurements[s]?.[pom] ?? null) },
              ...(chartA ? [{ key: "spec", label: `Block: ${chartA.name}`, color: "var(--muted)", dashed: true, values: sizes.map((s) => chartA.specs[s]?.[pom] ?? null) }] : []),
            ]}
          />
        </div>
        <div className="card">
          <div className="panel-title">
            <h3>At a glance</h3>
          </div>
          <table className="data">
            <tbody>
              {[a, b].map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div className="tiny muted">{p.fitIntent} · {p.fabric}</div>
                  </td>
                  <td className="small">Return rate {pct(rate(p.id), 1)}</td>
                  <td className="small muted">{consistency.find((c) => c.productId === p.id)?.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 14 }}>
            “Fits like” rule: a shopper who wears size X in {b.name} is offered the {a.name} size whose measurements sit closest, within ±1 cm
            per point of measure (see Fit recommendation → A garment I own).
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Point of measure</th>
              {sizes.map((s) => (
                <th key={s} className="num" colSpan={1}>{s}: A / B / Δ</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {poms.map((p) => (
              <tr key={p}>
                <td>{POM_LABELS[p]}</td>
                {sizes.map((s) => {
                  const va = a.measurements[s]?.[p];
                  const vb = b.measurements[s]?.[p];
                  const d = va != null && vb != null ? Math.round((va - vb) * 10) / 10 : null;
                  return (
                    <td key={s} className="num mono small" style={d != null && Math.abs(d) >= 2 ? { background: "var(--burgundy-tint)" } : undefined}>
                      {va ?? "—"} / {vb ?? "—"} / <strong>{d == null ? "—" : `${d > 0 ? "+" : ""}${d}`}</strong>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tiny muted">Δ = A − B. Shaded where the difference is 2 cm or more.</p>
    </>
  );
}
