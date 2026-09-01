/**
 * Ponto único de abertura do banco.
 *
 * Ninguém fora de `db/` e `repositories/` deve importar este módulo — hooks e
 * componentes falam com repositories, nunca com o Drizzle direto (REGRA #3).
 *
 * Este arquivo carrega `expo-sqlite`, ou seja, só roda dentro do app. A lógica
 * que precisa de teste em Node mora em `migrator.ts`, `lib/` e `services/`.
 */

import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { migrar, versaoAtual, type ResultadoMigracao } from './migrator';
import * as schema from './schema';
import { adaptarExpoSQLite, type BancoSQLite } from './sqlite';

export const NOME_BANCO = 'financas.db';

/**
 * `enableChangeListener` liga o `useLiveQuery` do Drizzle: a UI re-renderiza
 * sozinha quando uma tabela muda, sem estado global de "recarregar".
 */
export const sqlite: SQLiteDatabase = openDatabaseSync(NOME_BANCO, {
  enableChangeListener: true,
});

// WAL melhora leitura concorrente; foreign_keys precisa ser ligado por conexão
// (o SQLite vem com ele desligado por padrão, e sem isso o ON DELETE SET NULL
// dos FKs simplesmente não acontece).
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db: ExpoSQLiteDatabase<typeof schema> & { $client: SQLiteDatabase } = drizzle(sqlite, {
  schema,
});

/** Mesmo banco, na interface crua usada pelo migrator e pelo backup. */
export const bancoCru: BancoSQLite = adaptarExpoSQLite(sqlite);

export type Banco = typeof db;
/** Handle de transação do Drizzle — mesma superfície de query do `db`. */
export type Transacao = Parameters<Parameters<Banco['transaction']>[0]>[0];
/**
 * Aceito por todo repository: ou o banco, ou uma transação em andamento.
 * É o que permite compor várias escritas numa transação só.
 */
export type Executor = Banco | Transacao;

/**
 * Abre transação e devolve o resultado. O driver expo-sqlite do Drizzle é
 * SÍNCRONO, então o callback é síncrono e o rollback em erro é automático.
 *
 * REGRA #4: nenhuma escrita fora daqui.
 */
export function escrever<T>(tarefa: (tx: Transacao) => T, executor: Executor = db): T {
  // Já estamos dentro de uma transação: reaproveita em vez de aninhar
  // (o SQLite não tem transação aninhada real).
  if (executor !== db) return tarefa(executor as Transacao);
  return db.transaction(tarefa);
}

/** Sobe o banco até a última migration. Chamado uma vez no boot. */
export function inicializarBanco(): ResultadoMigracao {
  return migrar(bancoCru);
}

export function versaoDoBanco(): number {
  return versaoAtual(bancoCru);
}

export { schema };
