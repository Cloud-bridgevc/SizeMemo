import Link from "next/link";
import { loadWorkspace } from "@/lib/load";
import { ConsistencyBadge } from "@/components/StatusBadge";
import { pct } from "@/lib/analytics";
import { NewProductForm } from "./NewProductForm";

export const metadata = { title: "Product catalogue" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const { category, q } = await searchParams;
  const { products, charts, sales, consistency, feedback } = await loadWorkspace();
  const status = new Map(consistency.map((c) => [c.productId, c.status]));
  const chartName = new Map(charts.map((c) => [c.id, c.name]));
  const list = products.filter(
    (p) => (!category || p.category === category) && (!q || `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Garment measurement intelligence</div>
          <h1>Product catalogue</h1>
          <p>Every product, the block it is graded from, and how its measurements and returns compare.</p>
        </div>
      </div>

      <form className="row" style={{ marginBottom: 16 }}>
        <input type="text" name="q" defaultValue={q} placeholder="Search name or SKU" style={{ maxWidth: 260 }} aria-label="Search products" />
        <select name="category" defaultValue={category ?? ""} style={{ maxWidth: 180 }} aria-label="Category">
          <option value="">All categories</option>
          {["tops", "bottoms", "outerwear", "dresses"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn ghost sm" type="submit">Filter</button>
      </form>

      <div className="table-wrap" style={{ marginBottom: 32 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category / fit</th>
              <th>Size chart</th>
              <th className="num">Units sold</th>
              <th className="num">Return rate</th>
              <th className="num">Feedback</th>
              <th>Consistency</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const s = sales.filter((x) => x.productId === p.id);
              const sold = s.reduce((a, x) => a + x.unitsSold, 0);
              const ret = s.reduce((a, x) => a + x.unitsReturned, 0);
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/products/${p.id}`}>{p.name}</Link>
                    {p.status === "draft" && <span className="badge" style={{ marginLeft: 8 }}>Draft</span>}
                    <div className="tiny muted">{p.fabric}</div>
                  </td>
                  <td className="mono small">{p.sku}</td>
                  <td className="small">
                    {p.category} · {p.fitIntent}
                    {p.stretch ? " · stretch" : ""}
                  </td>
                  <td className="small muted">{chartName.get(p.sizeChartId) ?? "—"}</td>
                  <td className="num mono">{sold.toLocaleString()}</td>
                  <td className="num mono">{sold ? pct(ret / sold, 1) : "—"}</td>
                  <td className="num mono">{feedback.filter((f) => f.productId === p.id).length}</td>
                  <td>{status.get(p.id) ? <ConsistencyBadge status={status.get(p.id)!} /> : <span className="muted small">No chart</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card beige" style={{ maxWidth: 760 }}>
        <h3>Add a product</h3>
        <p className="small muted">New products start from the measurements of the block you choose, as a draft. Edit the measurements once the sample is measured.</p>
        <NewProductForm charts={charts.map((c) => ({ id: c.id, name: c.name, fitIntent: c.fitIntent }))} />
      </div>
    </>
  );
}
