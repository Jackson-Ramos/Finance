/**
 * Migrator versionado e REVERSÍVEL.
 *
 * Por que não `drizzle-kit generate` + `useMigrations`: o gerador do Drizzle
 * só produz o SQL de subida. O critério da Fase 1 pede reversibilidade, então
 * as migrations são escritas à mão (`db/migrations/`) e aplicadas por aqui.
 *
 * Garantias:
 * - Cada migration roda dentro de UMA transação (DDL é transacional no SQLite),
 *   junto com a linha de controle. Falhou no meio, não aplicou nada.
 * - `migrar()` é idempotente: só aplica o que ainda não está na tabela de
 *   controle.
 * - `reverter()` desfaz da mais nova para a mais antiga até a versão alvo.
 */

import { MIGRATIONS, validarMigrations, VERSAO_ALVO, type Migration } from './migrations';
import type { BancoSQLite } from './sqlite';

export const TABELA_CONTROLE = '__migracoes';

export interface RegistroMigracao {
  id: number;
  nome: string;
  aplicada_em: string;
}

export interface ResultadoMigracao {
  versaoAnterior: number;
  versaoAtual: number;
  aplicadas: readonly number[];
  revertidas: readonly number[];
}

function criarTabelaControle(db: BancoSQLite): void {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS ${TABELA_CONTROLE} (
       id INTEGER PRIMARY KEY,
       nome TEXT NOT NULL,
       aplicada_em TEXT NOT NULL
     )`,
  );
}

/** Ids já aplicados, em ordem crescente. */
export function migracoesAplicadas(db: BancoSQLite): number[] {
  criarTabelaControle(db);
  return db
    .getAllSync<{ id: number }>(`SELECT id FROM ${TABELA_CONTROLE} ORDER BY id ASC`)
    .map((r) => r.id);
}

/** Histórico completo, para a tela de debug. */
export function historicoMigracoes(db: BancoSQLite): RegistroMigracao[] {
  criarTabelaControle(db);
  return db.getAllSync<RegistroMigracao>(
    `SELECT id, nome, aplicada_em FROM ${TABELA_CONTROLE} ORDER BY id ASC`,
  );
}

/** Versão corrente do banco: maior id aplicado, ou 0 num banco vazio. */
export function versaoAtual(db: BancoSQLite): number {
  const ids = migracoesAplicadas(db);
  return ids.length === 0 ? 0 : ids[ids.length - 1];
}

/**
 * Roda uma função dentro de uma transação, com rollback em qualquer erro.
 * Não usa `withTransactionSync` do expo-sqlite para que o mesmo código sirva
 * ao `node:sqlite` dos testes.
 */
function emTransacao(db: BancoSQLite, tarefa: () => void): void {
  db.execSync('BEGIN');
  try {
    tarefa();
    db.execSync('COMMIT');
  } catch (erro) {
    try {
      db.execSync('ROLLBACK');
    } catch {
      /* rollback já ocorreu (ex.: erro abortou a transação) */
    }
    throw erro;
  }
}

function aplicar(db: BancoSQLite, m: Migration, agora: string): void {
  emTransacao(db, () => {
    for (const sql of m.up) db.execSync(sql);
    db.runSync(`INSERT INTO ${TABELA_CONTROLE} (id, nome, aplicada_em) VALUES (?, ?, ?)`, [
      m.id,
      m.nome,
      agora,
    ]);
  });
}

function desfazer(db: BancoSQLite, m: Migration): void {
  emTransacao(db, () => {
    for (const sql of m.down) db.execSync(sql);
    db.runSync(`DELETE FROM ${TABELA_CONTROLE} WHERE id = ?`, [m.id]);
  });
}

export interface OpcoesMigracao {
  migrations?: readonly Migration[];
  /** Injetável para teste determinístico. */
  agora?: () => string;
}

/**
 * Sobe o banco até a última versão. Seguro de chamar em todo boot.
 */
export function migrar(db: BancoSQLite, opcoes: OpcoesMigracao = {}): ResultadoMigracao {
  const migrations = opcoes.migrations ?? MIGRATIONS;
  const agora = opcoes.agora ?? (() => new Date().toISOString());
  validarMigrations(migrations);

  const jaAplicadas = new Set(migracoesAplicadas(db));
  const versaoAnterior = versaoAtual(db);
  const aplicadas: number[] = [];

  for (const m of migrations) {
    if (jaAplicadas.has(m.id)) continue;
    aplicar(db, m, agora());
    aplicadas.push(m.id);
  }

  return { versaoAnterior, versaoAtual: versaoAtual(db), aplicadas, revertidas: [] };
}

/**
 * Desce o banco até `versaoAlvo` (0 = banco limpo), desfazendo da mais nova
 * para a mais antiga.
 */
export function reverter(
  db: BancoSQLite,
  versaoAlvo = 0,
  opcoes: OpcoesMigracao = {},
): ResultadoMigracao {
  const migrations = opcoes.migrations ?? MIGRATIONS;
  validarMigrations(migrations);

  const versaoAnterior = versaoAtual(db);
  const aplicadasIds = new Set(migracoesAplicadas(db));
  const revertidas: number[] = [];

  for (const m of [...migrations].sort((a, b) => b.id - a.id)) {
    if (m.id <= versaoAlvo) continue;
    if (!aplicadasIds.has(m.id)) continue;
    desfazer(db, m);
    revertidas.push(m.id);
  }

  return { versaoAnterior, versaoAtual: versaoAtual(db), aplicadas: [], revertidas };
}

/** Derruba tudo e sobe de novo. Só para debug/dev — apaga os dados. */
export function recriar(db: BancoSQLite, opcoes: OpcoesMigracao = {}): ResultadoMigracao {
  reverter(db, 0, opcoes);
  return migrar(db, opcoes);
}

export { VERSAO_ALVO };
