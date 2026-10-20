import Link from "next/link";
import { TooltipLayer } from "@/components/TooltipLayer";

const LINKEDIN = "https://www.linkedin.com/company/sizememo/";

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-nav">
        <div className="container inner">
          <Link href="/" className="wordmark" aria-label="SizeMemo home">
            Size<em>Memo</em>
          </Link>
          <nav className="site-links" aria-label="Main">
            <Link href="/use-cases" className="hide-sm">Use cases</Link>
            <Link href="/fit-demo">Fit demo</Link>
            <Link href="/methodology" className="hide-sm">Methodology</Link>
            <Link href="/pricing" className="hide-sm">Pricing</Link>
            <Link href="/#team" className="hide-sm">Team</Link>
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
            <div className="eyebrow">Company</div>
            <p>
              <Link href="/#team">Team</Link>
              <br />
              <Link href="/request-demo">Request a demo</Link>
              <br />
              <a href={LINKEDIN} target="_blank" rel="noopener noreferrer" className="row" style={{ display: "inline-flex", gap: 6 }}>
                <LinkedInIcon />
                LinkedIn
              </a>
            </p>
          </div>
        </div>
        <div className="container row between" style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
          <span>© {new Date().getFullYear()} SizeMemo · sizememo.site</span>
          <span className="tiny">Garments, customers and returns shown are fictional demonstration data for the imaginary label Maison Halden.</span>
        </div>
      </footer>
      <TooltipLayer />
    </>
  );
}
