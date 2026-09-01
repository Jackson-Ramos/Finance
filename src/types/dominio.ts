/**
 * Tipos de domínio compartilhados.
 *
 * Ficam fora de `db/schema.ts` de propósito: `lib/` e `services/` são puros e
 * testáveis no Vitest sem carregar o driver do expo-sqlite.
 */

export const TIPOS_LANCAMENTO = ['RECEITA', 'DESPESA', 'APORTE'] as const;
export type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];

export const NATUREZAS = ['FIXA', 'VARIAVEL'] as const;
export type Natureza = (typeof NATUREZAS)[number];

export const GRUPOS_CATEGORIA = ['CASA', 'PESSOAL'] as const;
export type GrupoCategoria = (typeof GRUPOS_CATEGORIA)[number];

/** Data de competência: 'YYYY-MM-DD', sem hora, sem fuso. */
export type DataISO = string;

/** Chave de mês: 'YYYY-MM'. */
export type AnoMes = string;

export function ehTipoLancamento(v: unknown): v is TipoLancamento {
  return typeof v === 'string' && (TIPOS_LANCAMENTO as readonly string[]).includes(v);
}

export function ehNatureza(v: unknown): v is Natureza {
  return typeof v === 'string' && (NATUREZAS as readonly string[]).includes(v);
}

export function ehGrupoCategoria(v: unknown): v is GrupoCategoria {
  return typeof v === 'string' && (GRUPOS_CATEGORIA as readonly string[]).includes(v);
}
