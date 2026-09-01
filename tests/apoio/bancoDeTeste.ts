/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';
import type { BancoSQLite, ValorBind } from '../../src/db/sqlite';

/**
 * Adapta o `node:sqlite` (embutido no Node) para a interface `BancoSQLite`.
 *
 * É o que permite testar migrations e CHECKs contra um SQLite de verdade sem
 * instalar nenhuma dependência nativa. O `expo-sqlite` roda no aparelho e
 * expõe a mesma superfície síncrona.
 */
export function abrirBancoDeTeste(): BancoSQLite & { fechar: () => void; cru: DatabaseSync } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');

  return {
    cru: db,
    execSync: (sql) => {
      db.exec(sql);
    },
    runSync: (sql, params = []) => {
      const r = db.prepare(sql).run(...(params as ValorBind[]));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getAllSync: <T,>(sql: string, params: readonly ValorBind[] = []) =>
      db.prepare(sql).all(...(params as ValorBind[])) as T[],
    fechar: () => db.close(),
  };
}

/** Nomes de tabela criados pela aplicação (ignora internas do SQLite). */
export function tabelas(db: BancoSQLite): string[] {
  return db
    .getAllSync<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name`,
    )
    .map((r) => r.name);
}

export function indices(db: BancoSQLite): string[] {
  return db
    .getAllSync<{ name: string }>(
      `SELECT name FROM sqlite_master
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        ORDER BY name`,
    )
    .map((r) => r.name);
}

/** DDL completo, normalizado — serve de "snapshot" para comparar up/down/up. */
export function esquema(db: BancoSQLite): string {
  return db
    .getAllSync<{ sql: string | null }>(
      `SELECT sql FROM sqlite_master
        WHERE name NOT LIKE 'sqlite_%' AND name <> '__migracoes'
        ORDER BY type, name`,
    )
    .map((r) => (r.sql ?? '').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
    .join('\n');
}
