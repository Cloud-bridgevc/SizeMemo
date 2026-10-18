import { getRepository } from "./data";
import { assessCatalogue } from "./sizing/consistency";

/** Loads everything the insight pages need in one go. */
export async function loadWorkspace() {
  const repo = await getRepository();
  const [products, charts, feedback, sales, profiles] = await Promise.all([
    repo.listProducts(),
    repo.listSizeCharts(),
    repo.listFeedback(),
    repo.listSales(),
    repo.listProfiles(),
  ]);
  const consistency = assessCatalogue(products, charts, feedback, sales);
  return { repo, products, charts, feedback, sales, profiles, consistency };
}
