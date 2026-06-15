import { InspirationSchema } from "../schemas/InspirationSchema";
import type { Inspiration, InspirationKind, InspirationPayload } from "../types";
import { StorageService } from "@/services/StorageService";

const DAY_MS = 24 * 60 * 60 * 1000;

// Per-kind default lifetimes (Discover epic D.0). Each item may override with an
// explicit `ttlMs`. This is the single source of truth for how long an
// inspiration lives before the lazy sweep removes it.
export const INSPIRATION_TTL_MS: Record<InspirationKind, number> = {
  spark: 1 * DAY_MS,
  produce: 31 * DAY_MS, // roughly "to month end"
  theme: 31 * DAY_MS,
  week_plan: 4 * DAY_MS, // until the target week starts
  leftover: 2 * DAY_MS, // leftovers don't keep
  nudge: 1 * DAY_MS,
};

export interface MintInspirationInput {
  kind: InspirationKind;
  title: string;
  hook: string;
  payload: InspirationPayload;
  source: string;
  dedupeKey: string;
  relevance?: number;
  /** Override the per-kind default TTL. */
  ttlMs?: number;
}

export interface GetActiveOptions {
  kind?: InspirationKind;
  limit?: number;
}

interface InspirationRow {
  id: string;
  kind: string;
  title: string;
  hook: string;
  payload: string;
  source: string;
  dedupeKey: string;
  relevance: number | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

const createId = (): string =>
  `insp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class InspirationRepository {
  private mapRow(row: InspirationRow): Inspiration {
    return InspirationSchema.parse({
      id: row.id,
      kind: row.kind,
      title: row.title,
      hook: row.hook,
      payload: JSON.parse(row.payload) as InspirationPayload,
      source: row.source,
      dedupeKey: row.dedupeKey,
      relevance: row.relevance ?? undefined,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt ?? undefined,
    });
  }

  // Remove expired and already-consumed rows. Runs lazily before every read and
  // write so the store stays clean without a background scheduler.
  sweep(now: string = new Date().toISOString()): void {
    StorageService.dbRun(
      "DELETE FROM inspirations WHERE expires_at <= ? OR consumed_at IS NOT NULL",
      [now],
    );
  }

  // Dedupe-aware insert: if a live item already exists for the same dedupeKey,
  // it is reused instead of minting (and paying for) a duplicate. This is what
  // makes the store double as the generation cache.
  mint(input: MintInspirationInput): Inspiration {
    const now = new Date();
    const nowIso = now.toISOString();
    this.sweep(nowIso);

    const existing = StorageService.dbQueryFirst<InspirationRow>(
      `SELECT id, kind, title, hook, payload, source, dedupe_key AS dedupeKey,
              relevance, created_at AS createdAt, expires_at AS expiresAt,
              consumed_at AS consumedAt
       FROM inspirations
       WHERE dedupe_key = ? AND consumed_at IS NULL AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
      [input.dedupeKey, nowIso],
    );
    if (existing) return this.mapRow(existing);

    const ttlMs = input.ttlMs ?? INSPIRATION_TTL_MS[input.kind];
    const inspiration: Inspiration = {
      id: createId(),
      kind: input.kind,
      title: input.title,
      hook: input.hook,
      payload: input.payload,
      source: input.source,
      dedupeKey: input.dedupeKey,
      relevance: input.relevance,
      createdAt: nowIso,
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };

    StorageService.dbRun(
      `INSERT INTO inspirations
         (id, kind, title, hook, payload, source, dedupe_key, relevance, created_at, expires_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        inspiration.id,
        inspiration.kind,
        inspiration.title,
        inspiration.hook,
        JSON.stringify(inspiration.payload),
        inspiration.source,
        inspiration.dedupeKey,
        inspiration.relevance ?? null,
        inspiration.createdAt,
        inspiration.expiresAt,
      ],
    );

    return inspiration;
  }

  // Live items only — never expired, never consumed. Highest relevance first,
  // then most recently minted.
  getActive({ kind, limit }: GetActiveOptions = {}): Inspiration[] {
    const nowIso = new Date().toISOString();
    this.sweep(nowIso);

    const clauses = ["consumed_at IS NULL", "expires_at > ?"];
    const params: (string | number)[] = [nowIso];

    if (kind) {
      clauses.push("kind = ?");
      params.push(kind);
    }

    let sql = `SELECT id, kind, title, hook, payload, source, dedupe_key AS dedupeKey,
                      relevance, created_at AS createdAt, expires_at AS expiresAt,
                      consumed_at AS consumedAt
               FROM inspirations
               WHERE ${clauses.join(" AND ")}
               ORDER BY relevance DESC, created_at DESC`;

    if (typeof limit === "number") {
      sql += " LIMIT ?";
      params.push(limit);
    }

    return StorageService.dbQuery<InspirationRow>(sql, params).map((row) =>
      this.mapRow(row),
    );
  }

  // Mark an item as acted-upon. It disappears from future reads and is removed
  // on the next sweep so picked-up inspiration never lingers or repeats.
  markConsumed(id: string): void {
    StorageService.dbRun(
      "UPDATE inspirations SET consumed_at = ? WHERE id = ?",
      [new Date().toISOString(), id],
    );
  }
}
