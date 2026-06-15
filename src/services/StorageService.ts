import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

type DatabaseParam = string | number | null;

const DATABASE_NAME = "sous-chef.db";

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS cookbooks (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      data TEXT NOT NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_cookbooks_parent_id
    ON cookbooks (parent_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY,
      week_start_date TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS budget_periods (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS spend_entries (
      id TEXT PRIMARY KEY,
      period_id TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS pantry (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      expiry_date TEXT
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS waste_log (
      id TEXT PRIMARY KEY,
      pantry_item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      reason TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS cook_logs (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      cooked_at TEXT NOT NULL,
      overall_score INTEGER
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_cook_logs_recipe_id
    ON cook_logs (recipe_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      cook_log_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      score INTEGER NOT NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ratings_cook_log_id
    ON ratings (cook_log_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS rating_categories (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      label TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_rating_categories_recipe_id
    ON rating_categories (recipe_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS cook_notes (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_cook_notes_recipe_id
    ON cook_notes (recipe_id);
  `,
  `
    CREATE TABLE IF NOT EXISTS inspirations (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      hook TEXT NOT NULL,
      payload TEXT NOT NULL,
      source TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      relevance REAL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_inspirations_kind
    ON inspirations (kind);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_inspirations_dedupe_key
    ON inspirations (dedupe_key);
  `,
] as const;

const RESET_TABLES = [
  "inspirations",
  "cook_notes",
  "rating_categories",
  "ratings",
  "cook_logs",
  "waste_log",
  "habits",
  "pantry",
  "spend_entries",
  "budget_periods",
  "meal_plans",
  "cookbooks",
  "recipes",
] as const;

const db = SQLite.openDatabaseSync(DATABASE_NAME);

const wrapSQLiteError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`StorageService SQLite ${operation} failed: ${message}`);
};

const wrapStorageError = (operation: string, error: unknown): Error => {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`StorageService storage ${operation} failed: ${message}`);
};

const runDatabaseTransaction = (
  operation: string,
  callback: () => void,
): void => {
  try {
    db.execSync("BEGIN;");

    try {
      callback();
      db.execSync("COMMIT;");
    } catch (error) {
      db.execSync("ROLLBACK;");
      throw error;
    }
  } catch (error) {
    throw wrapSQLiteError(operation, error);
  }
};

const ensureDatabaseSchema = (): void => {
  runDatabaseTransaction("initializeDatabase", () => {
    for (const statement of SCHEMA_STATEMENTS) {
      db.execSync(statement);
    }
  });
};

export const StorageService = {
  initializeDatabase: (): void => {
    ensureDatabaseSchema();
  },

  resetDatabase: (): void => {
    runDatabaseTransaction("resetDatabase", () => {
      for (const tableName of RESET_TABLES) {
        db.execSync(`DROP TABLE IF EXISTS ${tableName};`);
      }
    });

    ensureDatabaseSchema();
  },

  dbQuery: <T>(sql: string, params: DatabaseParam[] = []): T[] => {
    try {
      return db.getAllSync<T>(sql, params);
    } catch (error) {
      throw wrapSQLiteError("dbQuery", error);
    }
  },

  dbQueryFirst: <T>(
    sql: string,
    params: DatabaseParam[] = [],
  ): T | null => {
    try {
      return db.getFirstSync<T>(sql, params);
    } catch (error) {
      throw wrapSQLiteError("dbQueryFirst", error);
    }
  },

  dbRun: (sql: string, params: DatabaseParam[] = []): void => {
    try {
      db.runSync(sql, params);
    } catch (error) {
      throw wrapSQLiteError("dbRun", error);
    }
  },

  dbExec: (sql: string): void => {
    try {
      db.execSync(sql);
    } catch (error) {
      throw wrapSQLiteError("dbExec", error);
    }
  },

  storageGetItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      throw wrapStorageError(`storageGetItem(${key})`, error);
    }
  },

  storageSetItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      throw wrapStorageError(`storageSetItem(${key})`, error);
    }
  },

  storageRemoveItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw wrapStorageError(`storageRemoveItem(${key})`, error);
    }
  },
};
