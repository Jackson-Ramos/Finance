/**
 * Esquema Drizzle — a forma TIPADA das tabelas.
 *
 * A fonte de verdade do BANCO são os arquivos em `db/migrations/`: é o SQL de
 * lá que cria e derruba as tabelas. Este arquivo existe para dar tipos e
 * query builder aos repositories, e precisa ficar em sincronia com a última
 * migration (o teste `migrations.test.ts` compara as duas coisas).
 *
 * Convenção: coluna em snake_case no SQLite, propriedade em camelCase no TS.
 */

import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { GrupoCategoria, Natureza, TipoLancamento } from '../types/dominio';

/** Booleano do SQLite: INTEGER 0/1. Não existe BOOLEAN nativo. */
const bool = (nome: string) => integer(nome);

export const categoria = sqliteTable(
  'categoria',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nome: text('nome').notNull(),
    grupo: text('grupo').$type<GrupoCategoria>(),
    cor: text('cor'),
    icone: text('icone'),
    /**
     * Marca a categoria como DÍVIDA (financiamento, empréstimo, cartão parcelado).
     * Não estava no bloco de schema do spec, mas a métrica
     * `comprometimento_dividas` fala em "categorias marcadas como dívida" —
     * sem esta coluna a métrica é incalculável.
     */
    divida: bool('divida').default(0),
    arquivada: bool('arquivada').default(0),
  },
  (t) => [
    check('categoria_grupo_ck', sql`${t.grupo} IS NULL OR ${t.grupo} IN ('CASA','PESSOAL')`),
    check('categoria_divida_ck', sql`${t.divida} IN (0,1)`),
    check('categoria_arquivada_ck', sql`${t.arquivada} IN (0,1)`),
    index('idx_categoria_arquivada').on(t.arquivada),
  ],
);

export const objetivo = sqliteTable(
  'objetivo',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nome: text('nome').notNull(),
    /** Quanto o usuário quer juntar, em centavos. */
    valorAlvo: integer('valor_alvo').notNull(),
    /** Quanto pretende aportar por mês, em centavos. Opcional. */
    metaMensal: integer('meta_mensal'),
    ativo: bool('ativo').default(1),
    criadoEm: text('criado_em'),
  },
  (t) => [
    check('objetivo_valor_alvo_ck', sql`${t.valorAlvo} >= 0`),
    check('objetivo_meta_mensal_ck', sql`${t.metaMensal} IS NULL OR ${t.metaMensal} >= 0`),
    check('objetivo_ativo_ck', sql`${t.ativo} IN (0,1)`),
  ],
);

export const recorrencia = sqliteTable(
  'recorrencia',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    descricao: text('descricao').notNull(),
    valorPrevisto: integer('valor_previsto').notNull(),
    /** 1..31. Se exceder o último dia do mês, é grampeado na geração. */
    diaDoMes: integer('dia_do_mes').notNull(),
    tipo: text('tipo').$type<TipoLancamento>().notNull(),
    natureza: text('natureza').$type<Natureza>().notNull(),
    categoriaId: integer('categoria_id').references(() => categoria.id, { onDelete: 'set null' }),
    ativo: bool('ativo').default(1),
  },
  (t) => [
    check('recorrencia_dia_ck', sql`${t.diaDoMes} BETWEEN 1 AND 31`),
    check('recorrencia_valor_ck', sql`${t.valorPrevisto} >= 0`),
    check('recorrencia_tipo_ck', sql`${t.tipo} IN ('RECEITA','DESPESA','APORTE')`),
    check('recorrencia_natureza_ck', sql`${t.natureza} IN ('FIXA','VARIAVEL')`),
    check('recorrencia_ativo_ck', sql`${t.ativo} IN (0,1)`),
    index('idx_recorrencia_ativo').on(t.ativo),
  ],
);

export const lancamento = sqliteTable(
  'lancamento',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Competência: 'YYYY-MM-DD'. É por ela que o mês é fatiado. */
    data: text('data').notNull(),
    /** Caixa: quando saiu/entrou de fato. NULL enquanto não pago. */
    dataPagamento: text('data_pagamento'),
    descricao: text('descricao'),
    /** Centavos, SEMPRE positivo. O sinal é derivado de `tipo`. */
    valor: integer('valor').notNull(),
    tipo: text('tipo').$type<TipoLancamento>().notNull(),
    natureza: text('natureza').$type<Natureza>(),
    categoriaId: integer('categoria_id').references(() => categoria.id, { onDelete: 'set null' }),
    objetivoId: integer('objetivo_id').references(() => objetivo.id, { onDelete: 'set null' }),
    recorrenciaId: integer('recorrencia_id').references(() => recorrencia.id, { onDelete: 'set null' }),
    pago: bool('pago').notNull().default(0),
    criadoEm: text('criado_em').notNull(),
  },
  (t) => [
    check('lancamento_tipo_ck', sql`${t.tipo} IN ('RECEITA','DESPESA','APORTE')`),
    check('lancamento_natureza_ck', sql`${t.natureza} IS NULL OR ${t.natureza} IN ('FIXA','VARIAVEL')`),
    check('lancamento_valor_ck', sql`${t.valor} >= 0`),
    check('lancamento_pago_ck', sql`${t.pago} IN (0,1)`),
    check('lancamento_data_ck', sql`${t.data} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
    check(
      'lancamento_data_pagamento_ck',
      sql`${t.dataPagamento} IS NULL OR ${t.dataPagamento} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
    /** pago=1 <=> tem data de pagamento. Mantém "realizado" sempre coerente. */
    check(
      'lancamento_pagamento_coerente_ck',
      sql`(${t.pago} = 0 AND ${t.dataPagamento} IS NULL) OR (${t.pago} = 1 AND ${t.dataPagamento} IS NOT NULL)`,
    ),
    index('idx_lancamento_data').on(t.data),
    index('idx_lancamento_tipo_data').on(t.tipo, t.data),
    index('idx_lancamento_recorrencia_data').on(t.recorrenciaId, t.data),
    index('idx_lancamento_categoria_data').on(t.categoriaId, t.data),
    /**
     * NÃO declarado aqui: `idx_lancamento_recorrencia_mes`, o índice UNIQUE
     * sobre (recorrencia_id, substr(data,1,7)) WHERE recorrencia_id IS NOT NULL,
     * que é a trava de idempotência da geração de recorrências. O Drizzle não
     * modela índice sobre expressão com WHERE parcial, então ele vive só na
     * migration 0001 — que é a fonte de verdade do banco.
     */
  ],
);

export type CategoriaRow = typeof categoria.$inferSelect;
export type NovaCategoria = typeof categoria.$inferInsert;
export type ObjetivoRow = typeof objetivo.$inferSelect;
export type NovoObjetivo = typeof objetivo.$inferInsert;
export type RecorrenciaRow = typeof recorrencia.$inferSelect;
export type NovaRecorrencia = typeof recorrencia.$inferInsert;
export type LancamentoRow = typeof lancamento.$inferSelect;
export type NovoLancamento = typeof lancamento.$inferInsert;
