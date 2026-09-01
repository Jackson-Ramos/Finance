/**
 * Repository de objetivos (metas de poupança).
 */

import { asc, eq, sql } from 'drizzle-orm';
import { db, escrever, type Executor } from '../db/client';
import { objetivo, type ObjetivoRow } from '../db/schema';
import { hoje } from '../lib/date';
import { assertCentavos, type Centavos } from '../lib/money';

export type Objetivo = ObjetivoRow;

export interface DadosObjetivo {
  nome: string;
  valorAlvo: Centavos;
  metaMensal?: Centavos | null;
  ativo?: boolean;
}

const bit = (v: boolean | undefined, padrao: 0 | 1): 0 | 1 => (v === undefined ? padrao : v ? 1 : 0);

function validar(dados: Partial<DadosObjetivo>): void {
  if (dados.nome !== undefined && dados.nome.trim() === '') {
    throw new Error('nome do objetivo não pode ser vazio');
  }
  if (dados.valorAlvo !== undefined) {
    assertCentavos(dados.valorAlvo, 'valor_alvo');
    if (dados.valorAlvo < 0) throw new Error('valor_alvo não pode ser negativo');
  }
  if (dados.metaMensal !== undefined && dados.metaMensal !== null) {
    assertCentavos(dados.metaMensal, 'meta_mensal');
    if (dados.metaMensal < 0) throw new Error('meta_mensal não pode ser negativa');
  }
}

export function listar(apenasAtivos = true, executor: Executor = db): Objetivo[] {
  return executor
    .select()
    .from(objetivo)
    .where(apenasAtivos ? eq(objetivo.ativo, 1) : undefined)
    .orderBy(asc(objetivo.nome))
    .all();
}

export function buscarPorId(id: number, executor: Executor = db): Objetivo | undefined {
  return executor.select().from(objetivo).where(eq(objetivo.id, id)).get();
}

export function criar(dados: DadosObjetivo, executor: Executor = db): Objetivo {
  validar(dados);
  return escrever(
    (tx) =>
      tx
        .insert(objetivo)
        .values({
          nome: dados.nome.trim(),
          valorAlvo: dados.valorAlvo,
          metaMensal: dados.metaMensal ?? null,
          ativo: bit(dados.ativo, 1),
          // 'YYYY-MM-DD' como manda a REGRA #2. Ordem intradiária vem do `id`.
          criadoEm: hoje(),
        })
        .returning()
        .get(),
    executor,
  );
}

export function atualizar(
  id: number,
  patch: Partial<DadosObjetivo>,
  executor: Executor = db,
): Objetivo | undefined {
  validar(patch);
  return escrever((tx) => {
    const valores: Partial<typeof objetivo.$inferInsert> = {};
    if (patch.nome !== undefined) valores.nome = patch.nome.trim();
    if (patch.valorAlvo !== undefined) valores.valorAlvo = patch.valorAlvo;
    if (patch.metaMensal !== undefined) valores.metaMensal = patch.metaMensal;
    if (patch.ativo !== undefined) valores.ativo = bit(patch.ativo, 1);
    if (Object.keys(valores).length === 0) return buscarPorId(id, tx);
    return tx.update(objetivo).set(valores).where(eq(objetivo.id, id)).returning().get();
  }, executor);
}

export function concluir(id: number, executor: Executor = db): Objetivo | undefined {
  return atualizar(id, { ativo: false }, executor);
}

/** Remoção real. Os aportes ficam com `objetivo_id = NULL`, mas continuam existindo. */
export function remover(id: number, executor: Executor = db): number {
  return escrever((tx) => tx.delete(objetivo).where(eq(objetivo.id, id)).run().changes, executor);
}

export function contar(executor: Executor = db): number {
  return executor.select({ n: sql<number>`count(*)` }).from(objetivo).get()?.n ?? 0;
}
