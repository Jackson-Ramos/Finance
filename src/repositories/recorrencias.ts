/**
 * Repository de recorrências (contas que se repetem todo mês).
 */

import { asc, eq, sql } from 'drizzle-orm';
import { db, escrever, type Executor } from '../db/client';
import { recorrencia, type RecorrenciaRow } from '../db/schema';
import { assertCentavos, type Centavos } from '../lib/money';
import type { Natureza, TipoLancamento } from '../types/dominio';

export type Recorrencia = RecorrenciaRow;

export interface DadosRecorrencia {
  descricao: string;
  valorPrevisto: Centavos;
  /** 1..31. Grampeado ao último dia do mês na geração. */
  diaDoMes: number;
  tipo: TipoLancamento;
  natureza: Natureza;
  categoriaId?: number | null;
  ativo?: boolean;
}

const bit = (v: boolean | undefined, padrao: 0 | 1): 0 | 1 => (v === undefined ? padrao : v ? 1 : 0);

function validar(dados: Partial<DadosRecorrencia>): void {
  if (dados.descricao !== undefined && dados.descricao.trim() === '') {
    throw new Error('descrição da recorrência não pode ser vazia');
  }
  if (dados.valorPrevisto !== undefined) {
    assertCentavos(dados.valorPrevisto, 'valor_previsto');
    if (dados.valorPrevisto < 0) throw new Error('valor_previsto não pode ser negativo');
  }
  if (dados.diaDoMes !== undefined) {
    if (!Number.isInteger(dados.diaDoMes) || dados.diaDoMes < 1 || dados.diaDoMes > 31) {
      throw new Error(`dia_do_mes deve ser inteiro entre 1 e 31, recebido: ${String(dados.diaDoMes)}`);
    }
  }
}

export function listar(apenasAtivas = false, executor: Executor = db): Recorrencia[] {
  return executor
    .select()
    .from(recorrencia)
    .where(apenasAtivas ? eq(recorrencia.ativo, 1) : undefined)
    .orderBy(asc(recorrencia.diaDoMes), asc(recorrencia.descricao))
    .all();
}

/** Insumo da geração mensal. */
export function listarAtivas(executor: Executor = db): Recorrencia[] {
  return listar(true, executor);
}

export function buscarPorId(id: number, executor: Executor = db): Recorrencia | undefined {
  return executor.select().from(recorrencia).where(eq(recorrencia.id, id)).get();
}

export function criar(dados: DadosRecorrencia, executor: Executor = db): Recorrencia {
  validar(dados);
  return escrever(
    (tx) =>
      tx
        .insert(recorrencia)
        .values({
          descricao: dados.descricao.trim(),
          valorPrevisto: dados.valorPrevisto,
          diaDoMes: dados.diaDoMes,
          tipo: dados.tipo,
          natureza: dados.natureza,
          categoriaId: dados.categoriaId ?? null,
          ativo: bit(dados.ativo, 1),
        })
        .returning()
        .get(),
    executor,
  );
}

export function atualizar(
  id: number,
  patch: Partial<DadosRecorrencia>,
  executor: Executor = db,
): Recorrencia | undefined {
  validar(patch);
  return escrever((tx) => {
    const valores: Partial<typeof recorrencia.$inferInsert> = {};
    if (patch.descricao !== undefined) valores.descricao = patch.descricao.trim();
    if (patch.valorPrevisto !== undefined) valores.valorPrevisto = patch.valorPrevisto;
    if (patch.diaDoMes !== undefined) valores.diaDoMes = patch.diaDoMes;
    if (patch.tipo !== undefined) valores.tipo = patch.tipo;
    if (patch.natureza !== undefined) valores.natureza = patch.natureza;
    if (patch.categoriaId !== undefined) valores.categoriaId = patch.categoriaId;
    if (patch.ativo !== undefined) valores.ativo = bit(patch.ativo, 1);
    if (Object.keys(valores).length === 0) return buscarPorId(id, tx);
    return tx.update(recorrencia).set(valores).where(eq(recorrencia.id, id)).returning().get();
  }, executor);
}

/** Desativar preserva os lançamentos já gerados; só interrompe gerações futuras. */
export function desativar(id: number, executor: Executor = db): Recorrencia | undefined {
  return atualizar(id, { ativo: false }, executor);
}

export function remover(id: number, executor: Executor = db): number {
  return escrever(
    (tx) => tx.delete(recorrencia).where(eq(recorrencia.id, id)).run().changes,
    executor,
  );
}

export function contar(executor: Executor = db): number {
  return executor.select({ n: sql<number>`count(*)` }).from(recorrencia).get()?.n ?? 0;
}
