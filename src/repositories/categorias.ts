/**
 * Repository de categorias. Única camada que fala Drizzle para esta tabela.
 */

import { and, asc, eq, sql } from 'drizzle-orm';
import { db, escrever, type Executor } from '../db/client';
import { categoria, type CategoriaRow } from '../db/schema';
import type { GrupoCategoria } from '../types/dominio';

export type Categoria = CategoriaRow;

export interface DadosCategoria {
  nome: string;
  grupo?: GrupoCategoria | null;
  cor?: string | null;
  icone?: string | null;
  divida?: boolean;
  arquivada?: boolean;
}

const bit = (v: boolean | undefined, padrao: 0 | 1): 0 | 1 => (v === undefined ? padrao : v ? 1 : 0);

function validar(dados: Partial<DadosCategoria>): void {
  if (dados.nome !== undefined && dados.nome.trim() === '') {
    throw new Error('nome da categoria não pode ser vazio');
  }
}

export interface FiltroCategorias {
  /** Por padrão esconde arquivadas. */
  incluirArquivadas?: boolean;
  grupo?: GrupoCategoria;
  apenasDividas?: boolean;
}

export function listar(filtro: FiltroCategorias = {}, executor: Executor = db): Categoria[] {
  const condicoes = [];
  if (!filtro.incluirArquivadas) condicoes.push(eq(categoria.arquivada, 0));
  if (filtro.grupo) condicoes.push(eq(categoria.grupo, filtro.grupo));
  if (filtro.apenasDividas) condicoes.push(eq(categoria.divida, 1));

  return executor
    .select()
    .from(categoria)
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(asc(categoria.nome))
    .all();
}

export function buscarPorId(id: number, executor: Executor = db): Categoria | undefined {
  return executor.select().from(categoria).where(eq(categoria.id, id)).get();
}

export function buscarPorNome(nome: string, executor: Executor = db): Categoria | undefined {
  return executor
    .select()
    .from(categoria)
    .where(sql`lower(${categoria.nome}) = lower(${nome})`)
    .get();
}

/** Ids das categorias marcadas como dívida — insumo de `comprometimento_dividas`. */
export function idsDeDivida(executor: Executor = db): number[] {
  return executor
    .select({ id: categoria.id })
    .from(categoria)
    .where(eq(categoria.divida, 1))
    .all()
    .map((r) => r.id);
}

export function criar(dados: DadosCategoria, executor: Executor = db): Categoria {
  validar(dados);
  return escrever(
    (tx) =>
      tx
        .insert(categoria)
        .values({
          nome: dados.nome.trim(),
          grupo: dados.grupo ?? null,
          cor: dados.cor ?? null,
          icone: dados.icone ?? null,
          divida: bit(dados.divida, 0),
          arquivada: bit(dados.arquivada, 0),
        })
        .returning()
        .get(),
    executor,
  );
}

export function atualizar(
  id: number,
  patch: Partial<DadosCategoria>,
  executor: Executor = db,
): Categoria | undefined {
  validar(patch);
  return escrever((tx) => {
    const valores: Partial<typeof categoria.$inferInsert> = {};
    if (patch.nome !== undefined) valores.nome = patch.nome.trim();
    if (patch.grupo !== undefined) valores.grupo = patch.grupo;
    if (patch.cor !== undefined) valores.cor = patch.cor;
    if (patch.icone !== undefined) valores.icone = patch.icone;
    if (patch.divida !== undefined) valores.divida = bit(patch.divida, 0);
    if (patch.arquivada !== undefined) valores.arquivada = bit(patch.arquivada, 0);
    if (Object.keys(valores).length === 0) return buscarPorId(id, tx);
    return tx.update(categoria).set(valores).where(eq(categoria.id, id)).returning().get();
  }, executor);
}

/**
 * Arquivar é o "delete" normal: preserva o histórico dos lançamentos que
 * apontam para a categoria.
 */
export function arquivar(id: number, executor: Executor = db): Categoria | undefined {
  return atualizar(id, { arquivada: true }, executor);
}

export function desarquivar(id: number, executor: Executor = db): Categoria | undefined {
  return atualizar(id, { arquivada: false }, executor);
}

/** Remoção real. Os lançamentos ficam com `categoria_id = NULL` (ON DELETE SET NULL). */
export function remover(id: number, executor: Executor = db): number {
  return escrever(
    (tx) => tx.delete(categoria).where(eq(categoria.id, id)).run().changes,
    executor,
  );
}

export function contar(executor: Executor = db): number {
  return executor.select({ n: sql<number>`count(*)` }).from(categoria).get()?.n ?? 0;
}
