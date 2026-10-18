import Link from "next/link";
import { TooltipLayer } from "@/components/TooltipLayer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-nav">
        <div className="container inner">
          <Link href="/" className="wordmark">
            Size<em>Memo</em>
          </Link>
          <nav className="site-links" aria-label="Main">
            <Link href="/use-cases" className="hide-sm">Use cases</Link>
            <Link href="/fit-demo">Fit demo</Link>
            <Link href="/methodology" className="hide-sm">Methodology</Link>
            <Link href="/pricing" className="hide-sm">Pricing</Link>
            <Link href="/app" className="hide-sm">Dashboard</Link>
            <Link href="/request-demo" className="btn sm">Request a demo</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="container grid g4">
          <div>
            <div className="wordmark" style={{ fontSize: 22, color: "var(--ink)" }}>
              Size<em>Memo</em>
            </div>
            <p style={{ marginTop: 8 }}>Fit intelligence for apparel, built on garment measurements.</p>
          </div>
          <div>
            <div className="eyebrow">Product</div>
            <p><Link href="/fit-demo">Fit demonstration</Link><br /><Link href="/methodology">Methodology & limitations</Link><br /><Link href="/pricing">Pricing</Link></p>
          </div>
          <div>
            <div className="eyebrow">For</div>
            <p><Link href="/use-cases#brands">Fashion brands</Link><br /><Link href="/use-cases#retailers">E-commerce retailers</Link><br /><Link href="/use-cases#marketplaces">Marketplaces</Link></p>
          </div>
          <div>
            <div className="eyebrow">Note</div>
            <p>All garments, customers and returns shown on this site are fictional demonstration data for the imaginary label Maison Halden.</p>
          </div>
        </div>
      </footer>
      <TooltipLayer />
    </>
  );
}
