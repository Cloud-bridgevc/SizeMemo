# SizeMemo

**https://sizememo.site** · [LinkedIn](https://www.linkedin.com/company/sizememo/)

Apparel sizing and fit intelligence for fashion brands and online retailers: garment measurement management,
deterministic size recommendations, AI-assisted return feedback classification, size consistency monitoring and fit
insights. Includes a public marketing site with a working, measurement-based fit demonstration.

All demo data is fictional ("Maison Halden").

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

With no environment variables the app runs on an in-memory demo dataset and a keyword classifier. Copy
`.env.example` to `.env.local` to enable PostgreSQL, S3, Bedrock and HubSpot.

```bash
npm test           # sizing engine, consistency and classifier tests
npm run typecheck
DATABASE_URL=postgres://… npm run db:migrate && npm run db:seed
```

## Where things are

| Path | What |
|---|---|
| `src/lib/sizing/` | Deterministic recommendation engine (`recommend.ts`, ease targets in `ease.ts`) and consistency monitor |
| `src/lib/ai/` | Bedrock classification + explanation (`bedrock.ts`) and keyword fallback (`rules.ts`) |
| `src/lib/data/` | Repository interface, in-memory and PostgreSQL implementations, fictional seed data |
| `src/app/(site)/` | Public site: home, use cases, fit demo, methodology, pricing, demo request |
| `src/app/app/` | Dashboard: insights, consistency, reports, catalogue, measurement editor, size charts, comparison, recommendations, feedback import/review, demo requests |
| `lambda/handlers.ts` | Background workers (S3 import, backlog classification, nightly consistency snapshot) |
| `db/schema.sql` | PostgreSQL schema |
| `docs/ARCHITECTURE.md` | AWS architecture, data flows, IAM, production checklist |
| `docs/HUBSPOT.md` | CRM properties, pipelines and workflows |

## The demonstration story

- **Recommendation:** Profile A (chest 100, waist 88, arm 63, regular fit) gets **L** in the on-spec Arden shirt
  but **XL** in the Linden shirt, because Linden's chest is cut 5 cm under the block.
- **Consistency:** Linden is flagged as a *potential inconsistency* because measurements and feedback agree
  ("tight across the chest"). Ellis trousers are off-spec but uncontested (*measurement only*); Mara jeans and
  the Isla dress have elevated complaints with on-spec measurements (*feedback only*).

## Limitations

Recommendations compare garment measurements with measurements the shopper enters. SizeMemo does not measure bodies
and does not estimate measurements from photographs. See `/methodology`.

## Launch readiness (glow-up)

- Home page: problem section with three sourced statistics, what-we-solve, comparison table, AI section, founder cards, roadmap and FAQ, with scroll-reveal motion that respects reduced motion. Sections live in `src/components/Glow.tsx` (generated markup), styles in `src/app/glow.css`, motion in `public/glow.js`.
- New routes: `/privacy`, `/terms` (review drafts). Footer credits the founders.
- Ship assets: `opengraph-image.png`, `twitter-image.png`, `apple-icon.png`, `icon.svg`, `public/manifest.webmanifest`, icons, founders JSON-LD; sitemap includes the new routes.
- Fixed a small horizontal overflow of the hero table on phones.

### Content to confirm before launch
- Contact email `hello@sizememo.site` is a placeholder — create the forward or replace it.
- Statistics (Coresight Research; NRF & Happy Returns 2024) — re-check figures and links.
- Founder bios describe roles only; replace with confirmed biographies.
- Privacy notice and terms need operator details and governing law.
