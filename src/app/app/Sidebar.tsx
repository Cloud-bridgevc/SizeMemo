"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    title: "Insights",
    links: [
      { href: "/app", label: "Fit insights" },
      { href: "/app/consistency", label: "Size consistency" },
      { href: "/app/reports", label: "Analytics & reports" },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/app/products", label: "Product catalogue" },
      { href: "/app/size-charts", label: "Size charts" },
      { href: "/app/compare", label: "Product comparison" },
    ],
  },
  {
    title: "Fit",
    links: [
      { href: "/app/recommend", label: "Fit recommendation" },
      { href: "/app/feedback", label: "Return feedback" },
      { href: "/app/feedback/import", label: "Import feedback" },
    ],
  },
  {
    title: "Growth",
    links: [{ href: "/app/leads", label: "Demo requests" }],
  },
];

export function Sidebar({ dataMode, aiMode }: { dataMode: string; aiMode: string }) {
  const path = usePathname();
  // The longest link that prefixes the current path wins (so /app/feedback/import doesn't also light /app/feedback).
  const active = GROUPS.flatMap((g) => g.links.map((l) => l.href))
    .filter((href) => (href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === active;
  return (
    <aside className="sidebar">
      <Link href="/" className="wordmark" aria-label="SizeMemo home">
        Size<em>Memo</em>
      </Link>
      <div className="brand">Maison Halden · demo workspace</div>
      {GROUPS.map((g) => (
        <nav className="nav-group" key={g.title} aria-label={g.title}>
          <span className="eyebrow">{g.title}</span>
          {g.links.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link${isActive(l.href) ? " active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      ))}
      <div className="data-mode">
        Data: {dataMode}
        <br />
        Feedback AI: {aiMode}
      </div>
    </aside>
  );
}
