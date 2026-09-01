/**
 * Repository de lançamentos. É o coração do app.
 *
 * Todo método de escrita passa por `escrever()` (REGRA #4) e valida centavos
 * inteiros (REGRA #1) e datas 'YYYY-MM-DD' (REGRA #2) antes de tocar o banco.
 * Os CHECKs da migration são a segunda linha de defesa, não a primeira.
 */

import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { db, escrever, type Executor } from '../db/client';
import { categoria, lancamento, type LancamentoRow } from '../db/schema';
import { assertDataISO, hoje, intervaloDoMes } from '../lib/date';
import { assertCentavos, type Centavos } from '../lib/money';
import type { AnoMes, DataISO, Natureza, TipoLancamento } from '../types/dominio';

export type Lancamento = LancamentoRow;

/** Linha enriquecida com os campos de categoria que a lista precisa exibir. */
export interface LancamentoComCategoria extends Lancamento {
  categoriaNome: string | null;
  categoriaCor: string | null;
  categoriaIcone: string | null;
  categoriaGrupo: string | null;
  categoriaDivida: number | null;
}

export interface DadosLancamento {
  /** Competência. Padrão: hoje. */
  data?: DataISO;
  descricao?: string | null;
  /** Centavos, sempre positivo. O sinal vem de `tipo`. */
  valor: Centavos;
  tipo: TipoLancamento;
  natureza?: Natureza | null;
  categoriaId?: number | null;
  objetivoId?: number | null;
  recorrenciaId?: number | null;
  pago?: boolean;
  /** Se `pago` e isto for omitido, assume a data de competência. */
  dataPagamento?: DataISO | null;
}

function validar(dados: Partial<DadosLancamento>): void {
  if (dados.valor !== undefined) {
    assertCentavos(dados.valor, 'valor');
    if (dados.valor < 0) throw new Error('valor é armazenado sem sinal; use `tipo` para a direção');
  }
  if (dados.data !== undefined) assertDataISO(dados.data, 'data');
  if (dados.dataPagamento !== undefined && dados.dataPagamento !== null) {
    assertDataISO(dados.dataPagamento, 'data_pagamento');
  }
}

/**
 * Resolve o par (pago, data_pagamento) mantendo o invariante do CHECK
 * `lancamento_pagamento_coerente_ck`: pago=1 <=> data_pagamento NOT NULL.
 */
function resolverPagamento(
  pago: boolean | undefined,
  dataPagamento: DataISO | null | undefined,
  competencia: DataISO,
): { pago: 0 | 1; dataPagamento: DataISO | null } {
  const estaPago = pago ?? dataPagamento != null;
  if (!estaPago) return { pago: 0, dataPagamento: null };
  return { pago: 1, dataPagamento: dataPagamento ?? competencia };
}

const COLUNAS_COM_CATEGORIA = {
  id: lancamento.id,
  data: lancamento.data,
  dataPagamento: lancamento.dataPagamento,
  descricao: lancamento.descricao,
  valor: lancamento.valor,
  tipo: lancamento.tipo,
  natureza: lancamento.natureza,
  categoriaId: lancamento.categoriaId,
  objetivoId: lancamento.objetivoId,
  recorrenciaId: lancamento.recorrenciaId,
  pago: lancamento.pago,
  criadoEm: lancamento.criadoEm,
  categoriaNome: categoria.nome,
  categoriaCor: categoria.cor,
  categoriaIcone: categoria.icone,
  categoriaGrupo: categoria.grupo,
  categoriaDivida: categoria.divida,
} as const;

// ---------------------------------------------------------------- consultas

export function buscarPorId(id: number, executor: Executor = db): Lancamento | undefined {
  return executor.select().from(lancamento).where(eq(lancamento.id, id)).get();
}

/** Lançamentos de um intervalo fechado de competência, do mais novo ao mais antigo. */
export function listarPorPeriodo(
  inicio: DataISO,
  fim: DataISO,
  executor: Executor = db,
): Lancamento[] {
  assertDataISO(inicio, 'inicio');
  assertDataISO(fim, 'fim');
  return executor
    .select()
    .from(lancamento)
    .where(and(gte(lancamento.data, inicio), lte(lancamento.data, fim)))
    .orderBy(desc(lancamento.data), desc(lancamento.id))
    .all();
}

/** Todos os lançamentos cuja COMPETÊNCIA cai no mês. Base de previsto x realizado. */
export function listarDoMes(anoMes: AnoMes, executor: Executor = db): Lancamento[] {
  const { inicio, fim } = intervaloDoMes(anoMes);
  return listarPorPeriodo(inicio, fim, executor);
}

/** Mesma coisa, com nome/cor/grupo da categoria — o que a lista da Fase 2 exibe. */
export function listarDoMesComCategoria(
  anoMes: AnoMes,
  executor: Executor = db,
): LancamentoComCategoria[] {
  const { inicio, fim } = intervaloDoMes(anoMes);
  return executor
    .select(COLUNAS_COM_CATEGORIA)
    .from(lancamento)
    .leftJoin(categoria, eq(lancamento.categoriaId, categoria.id))
    .where(and(gte(lancamento.data, inicio), lte(lancamento.data, fim)))
    .orderBy(desc(lancamento.data), desc(lancamento.id))
    .all() as LancamentoComCategoria[];
}

/** Vários meses de uma vez, para a série histórica de 12 meses (Fase 5). */
export function listarPorMeses(meses: readonly AnoMes[], executor: Executor = db): Lancamento[] {
  if (meses.length === 0) return [];
  const ordenados = [...meses].sort();
  const inicio = intervaloDoMes(ordenados[0]).inicio;
  const fim = intervaloDoMes(ordenados[ordenados.length - 1]).fim;
  return listarPorPeriodo(inicio, fim, executor);
}

/**
 * Ids de recorrência que JÁ têm lançamento no mês.
 * É a checagem por (recorrencia_id, ano-mês) que torna a geração idempotente.
 */
export function idsDeRecorrenciaNoMes(anoMes: AnoMes, executor: Executor = db): number[] {
  const { inicio, fim } = intervaloDoMes(anoMes);
  return executor
    .selectDistinct({ id: lancamento.recorrenciaId })
    .from(lancamento)
    .where(
      and(
        isNotNull(lancamento.recorrenciaId),
        gte(lancamento.data, inicio),
        lte(lancamento.data, fim),
      ),
    )
    .all()
    .map((r) => r.id)
    .filter((id): id is number => id !== null);
}

/** Aportes já feitos para um objetivo, do mais novo ao mais antigo. */
export function listarAportesDoObjetivo(objetivoId: number, executor: Executor = db): Lancamento[] {
  return executor
    .select()
    .from(lancamento)
    .where(and(eq(lancamento.objetivoId, objetivoId), eq(lancamento.tipo, 'APORTE')))
    .orderBy(desc(lancamento.data), desc(lancamento.id))
    .all();
}

/** Todos os aportes, pagos ou não. A camada de serviço separa o que é o quê. */
export function listarAportes(executor: Executor = db): Lancamento[] {
  return executor
    .select()
    .from(lancamento)
    .where(eq(lancamento.tipo, 'APORTE'))
    .orderBy(asc(lancamento.data), asc(lancamento.id))
    .all();
}

/** Todos os aportes já realizados (pago=1) — base de `reserva_em_meses`. */
export function listarAportesRealizados(executor: Executor = db): Lancamento[] {
  return executor
    .select()
    .from(lancamento)
    .where(and(eq(lancamento.tipo, 'APORTE'), eq(lancamento.pago, 1)))
    .orderBy(asc(lancamento.data))
    .all();
}

/** Contas a vencer não pagas dentro do intervalo — insumo das notificações (Fase 3). */
export function listarNaoPagosNoPeriodo(
  inicio: DataISO,
  fim: DataISO,
  executor: Executor = db,
): Lancamento[] {
  assertDataISO(inicio, 'inicio');
  assertDataISO(fim, 'fim');
  return executor
    .select()
    .from(lancamento)
    .where(and(eq(lancamento.pago, 0), gte(lancamento.data, inicio), lte(lancamento.data, fim)))
    .orderBy(asc(lancamento.data), asc(lancamento.id))
    .all();
}

export function contar(executor: Executor = db): number {
  return executor.select({ n: sql<number>`count(*)` }).from(lancamento).get()?.n ?? 0;
}

// ---------------------------------------------------------------- escritas

export function criar(dados: DadosLancamento, executor: Executor = db): Lancamento {
  validar(dados);
  const competencia = dados.data ?? hoje();
  const pagamento = resolverPagamento(dados.pago, dados.dataPagamento, competencia);

  return escrever(
    (tx) =>
      tx
        .insert(lancamento)
        .values({
          data: competencia,
          dataPagamento: pagamento.dataPagamento,
          descricao: dados.descricao?.trim() || null,
          valor: dados.valor,
          tipo: dados.tipo,
          natureza: dados.natureza ?? null,
          categoriaId: dados.categoriaId ?? null,
          objetivoId: dados.objetivoId ?? null,
          recorrenciaId: dados.recorrenciaId ?? null,
          pago: pagamento.pago,
          criadoEm: hoje(),
        })
        .returning()
        .get(),
    executor,
  );
}

/** Insere vários numa transação só. Usado pela geração de recorrências. */
export function criarVarios(
  itens: readonly DadosLancamento[],
  executor: Executor = db,
): Lancamento[] {
  if (itens.length === 0) return [];
  return escrever((tx) => itens.map((item) => criar(item, tx)), executor);
}

export function atualizar(
  id: number,
  patch: Partial<DadosLancamento>,
  executor: Executor = db,
): Lancamento | undefined {
  validar(patch);
  return escrever((tx) => {
    const atual = buscarPorId(id, tx);
    if (!atual) return undefined;

    const competencia = patch.data ?? atual.data;
    const valores: Partial<typeof lancamento.$inferInsert> = {};

    if (patch.data !== undefined) valores.data = patch.data;
    if (patch.descricao !== undefined) valores.descricao = patch.descricao?.trim() || null;
    if (patch.valor !== undefined) valores.valor = patch.valor;
    if (patch.tipo !== undefined) valores.tipo = patch.tipo;
    if (patch.natureza !== undefined) valores.natureza = patch.natureza;
    if (patch.categoriaId !== undefined) valores.categoriaId = patch.categoriaId;
    if (patch.objetivoId !== undefined) valores.objetivoId = patch.objetivoId;
    if (patch.recorrenciaId !== undefined) valores.recorrenciaId = patch.recorrenciaId;

    // `pago` e `data_pagamento` andam juntos: se qualquer um dos dois vier no
    // patch, os dois são recalculados para não violar o CHECK de coerência.
    if (patch.pago !== undefined || patch.dataPagamento !== undefined) {
      const pagamento = resolverPagamento(
        patch.pago ?? atual.pago === 1,
        patch.dataPagamento !== undefined ? patch.dataPagamento : atual.dataPagamento,
        competencia,
      );
      valores.pago = pagamento.pago;
      valores.dataPagamento = pagamento.dataPagamento;
    }

    if (Object.keys(valores).length === 0) return atual;
    return tx.update(lancamento).set(valores).where(eq(lancamento.id, id)).returning().get();
  }, executor);
}

export function marcarPago(
  id: number,
  dataPagamento: DataISO = hoje(),
  executor: Executor = db,
): Lancamento | undefined {
  return atualizar(id, { pago: true, dataPagamento }, executor);
}

export function desmarcarPago(id: number, executor: Executor = db): Lancamento | undefined {
  return atualizar(id, { pago: false, dataPagamento: null }, executor);
}

export function remover(id: number, executor: Executor = db): number {
  return escrever(
    (tx) => tx.delete(lancamento).where(eq(lancamento.id, id)).run().changes,
    executor,
  );
}

export function removerVarios(ids: readonly number[], executor: Executor = db): number {
  if (ids.length === 0) return 0;
  return escrever(
    (tx) =>
      tx
        .delete(lancamento)
        .where(inArray(lancamento.id, [...ids]))
        .run().changes,
    executor,
  );
}
