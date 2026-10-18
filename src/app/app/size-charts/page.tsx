import Link from "next/link";
import { loadWorkspace } from "@/lib/load";
import { POM_LABELS, type Pom } from "@/lib/types";

export const metadata = { title: "Size charts" };

export default async function SizeChartsPage() {
  const { charts, products } = await loadWorkspace();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Size chart manager</div>
          <h1>Brand blocks</h1>
          <p>
            Each block is the established garment specification for a category and fit. Products are graded from a block, and the
            consistency monitor measures every product against it.
          </p>
        </div>
        <Link href="/app/size-charts/new" className="btn">New block</Link>
      </div>
      <div className="grid g2">
        {charts.map((c) => {
          const poms = Object.keys(c.specs[c.sizes[0]] ?? {}) as Pom[];
          const used = products.filter((p) => p.sizeChartId === c.id);
          return (
            <Link key={c.id} href={`/app/size-charts/${c.id}`} className="card" style={{ textDecoration: "none" }}>
              <div className="row between">
                <span className="eyebrow">{c.category} · {c.fitIntent}</span>
                <span className="tiny muted">{used.length} product{used.length === 1 ? "" : "s"}</span>
              </div>
              <h3 style={{ margin: "8px 0 12px" }}>{c.name}</h3>
              <table className="data" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>cm</th>
                    {c.sizes.map((s) => (
                      <th key={s} className="num">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poms.slice(0, 3).map((p) => (
                    <tr key={p}>
                      <td>{POM_LABELS[p]}</td>
                      {c.sizes.map((s) => (
                        <td key={s} className="num mono">{c.specs[s]?.[p] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tiny muted" style={{ marginTop: 10, marginBottom: 0 }}>{c.notes}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
