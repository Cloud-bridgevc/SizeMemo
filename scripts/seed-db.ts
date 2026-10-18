// Loads the fictional Maison Halden demo dataset into PostgreSQL.
// Usage: DATABASE_URL=postgres://... npm run db:migrate && npm run db:seed
import { postgresRepository, pool } from "../src/lib/data/postgres";
import { CUSTOMER_PROFILES, DEMO_BRAND, FEEDBACK, PRODUCTS, SALES, SIZE_CHARTS } from "../src/lib/data/seed";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const org = process.env.SIZEMEMO_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const db = pool();
  await db.query(`INSERT INTO organizations (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [org, `${DEMO_BRAND} (demo)`]);

  for (const c of SIZE_CHARTS) await postgresRepository.saveSizeChart(c);
  for (const p of PRODUCTS) {
    if (await postgresRepository.getProduct(p.id)) continue;
    await postgresRepository.createProduct(p);
  }
  await postgresRepository.addFeedback(FEEDBACK);
  for (const s of SALES) {
    await db.query(
      `INSERT INTO sales_outcomes (product_id, size, units_sold, units_returned) VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, size, period_start) DO UPDATE SET units_sold = EXCLUDED.units_sold, units_returned = EXCLUDED.units_returned`,
      [s.productId, s.size, s.unitsSold, s.unitsReturned],
    );
  }
  for (const cp of CUSTOMER_PROFILES) {
    await db.query(
      `INSERT INTO customer_profiles (id, org_id, label, body, preference, note) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      [cp.id, org, cp.label, JSON.stringify(cp.body), cp.preference, cp.note],
    );
  }
  console.log(`Seeded ${PRODUCTS.length} products, ${SIZE_CHARTS.length} size charts, ${FEEDBACK.length} feedback records.`);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
