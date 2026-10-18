import type { Repository } from "./repository";
import { memoryRepository } from "./memory";

let repo: Repository | null = null;

/** PostgreSQL when DATABASE_URL is set; otherwise the in-memory demo dataset. */
export async function getRepository(): Promise<Repository> {
  if (repo) return repo;
  if (process.env.DATABASE_URL) {
    const { postgresRepository } = await import("./postgres");
    repo = postgresRepository;
  } else {
    repo = memoryRepository;
  }
  return repo;
}
