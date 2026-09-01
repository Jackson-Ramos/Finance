/**
 * Subconjunto SÍNCRONO do `SQLiteDatabase` do expo-sqlite de que a
 * infraestrutura (migrator, backup) precisa.
 *
 * Existe para que o migrator possa rodar tanto sobre o expo-sqlite no aparelho
 * quanto sobre o `node:sqlite` embutido no Node dentro do Vitest — é assim que
 * o critério "migrations rodam do zero e são reversíveis" vira teste de verdade,
 * sem adicionar nenhuma dependência nativa ao projeto.
 */

export type ValorBind = string | number | null;

export interface BancoSQLite {
  /** Executa um ou mais comandos sem parâmetros. Não escapa nada. */
  execSync(sql: string): void;
  /** Executa comando parametrizado de escrita. */
  runSync(sql: string, params?: readonly ValorBind[]): { changes: number; lastInsertRowId: number };
  /** Consulta parametrizada. */
  getAllSync<T = Record<string, unknown>>(sql: string, params?: readonly ValorBind[]): T[];
}

/**
 * Adapta o `SQLiteDatabase` do expo-sqlite (que recebe params como varargs)
 * para a interface acima (que recebe array).
 */
export function adaptarExpoSQLite(db: {
  execSync(sql: string): void;
  runSync(sql: string, ...params: unknown[]): { changes: number; lastInsertRowId: number };
  getAllSync<T>(sql: string, ...params: unknown[]): T[];
}): BancoSQLite {
  return {
    execSync: (sql) => db.execSync(sql),
    runSync: (sql, params = []) => db.runSync(sql, ...params),
    getAllSync: <T,>(sql: string, params: readonly ValorBind[] = []) => db.getAllSync<T>(sql, ...params),
  };
}
