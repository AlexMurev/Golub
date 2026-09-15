import Database from 'better-sqlite3';
import { join } from 'path';
import { migrations, Migration } from './migrations';
import { getDataDir } from '../paths';
import { mkdirSync } from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database is not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(): void {
  if (db) return;

  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, 'golub.db');
  console.log('DB path:', dbPath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);

  console.log('Database is ready');
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set<number>(
    (database.prepare('SELECT id FROM _migrations').all() as { id: number }[]).map((r) => r.id)
  );

  const pending = migrations.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    console.log('No pending migrations, schema is up to date');
    return;
  }

  const insertMigration = database.prepare(
    'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)'
  );

  const applyAll = database.transaction((items: Migration[]): void => {
    for (const m of items) {
      console.log(`Applying migration ${m.id}: ${m.name}`);
      database.exec(m.sql);
      insertMigration.run(m.id, m.name, Date.now());
    }
  });

  applyAll(pending);
  console.log(`Successfully applied migrations: ${pending.length}`);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
