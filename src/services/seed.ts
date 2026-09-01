/**
 * Semente de categorias padrão.
 *
 * Roda no boot, uma vez, e é IDEMPOTENTE por nome: uma categoria que o usuário
 * renomeou ou apagou não volta. Deixada fora das migrations de propósito —
 * migration mexe em estrutura; dado inicial é regra de negócio, e o `down` de
 * uma migration de seed apagaria dado do usuário.
 */

import { escrever, type Executor, db } from '../db/client';
import * as categorias from '../repositories/categorias';
import type { GrupoCategoria } from '../types/dominio';

export interface CategoriaPadrao {
  nome: string;
  grupo: GrupoCategoria | null;
  cor: string;
  icone: string;
  divida?: boolean;
}

/**
 * Grupo `null` = categoria de receita (não entra na divisão Casa x Pessoal,
 * que só faz sentido para despesa).
 * `divida: true` alimenta a métrica `comprometimento_dividas`.
 */
export const CATEGORIAS_PADRAO: readonly CategoriaPadrao[] = [
  // ---- Receitas (sem grupo) ----
  { nome: 'Salário', grupo: null, cor: '#16A34A', icone: '💼' },
  { nome: 'Freelance', grupo: null, cor: '#22C55E', icone: '🧾' },
  { nome: 'Rendimentos', grupo: null, cor: '#4ADE80', icone: '📈' },
  { nome: 'Outras receitas', grupo: null, cor: '#86EFAC', icone: '➕' },

  // ---- Casa ----
  { nome: 'Moradia', grupo: 'CASA', cor: '#0EA5E9', icone: '🏠' },
  { nome: 'Contas da casa', grupo: 'CASA', cor: '#38BDF8', icone: '💡' },
  { nome: 'Mercado', grupo: 'CASA', cor: '#0284C7', icone: '🛒' },
  { nome: 'Internet e telefone', grupo: 'CASA', cor: '#7DD3FC', icone: '📶' },
  { nome: 'Manutenção', grupo: 'CASA', cor: '#0369A1', icone: '🔧' },
  { nome: 'Financiamento imobiliário', grupo: 'CASA', cor: '#B91C1C', icone: '🏦', divida: true },

  // ---- Pessoal ----
  { nome: 'Alimentação fora', grupo: 'PESSOAL', cor: '#F59E0B', icone: '🍽️' },
  { nome: 'Transporte', grupo: 'PESSOAL', cor: '#F97316', icone: '🚗' },
  { nome: 'Saúde', grupo: 'PESSOAL', cor: '#EF4444', icone: '💊' },
  { nome: 'Educação', grupo: 'PESSOAL', cor: '#8B5CF6', icone: '📚' },
  { nome: 'Lazer', grupo: 'PESSOAL', cor: '#EC4899', icone: '🎬' },
  { nome: 'Assinaturas', grupo: 'PESSOAL', cor: '#A855F7', icone: '📺' },
  { nome: 'Vestuário', grupo: 'PESSOAL', cor: '#D946EF', icone: '👕' },
  { nome: 'Cuidados pessoais', grupo: 'PESSOAL', cor: '#FB7185', icone: '💇' },
  { nome: 'Presentes', grupo: 'PESSOAL', cor: '#F472B6', icone: '🎁' },
  { nome: 'Empréstimo', grupo: 'PESSOAL', cor: '#DC2626', icone: '📉', divida: true },
  { nome: 'Cartão de crédito', grupo: 'PESSOAL', cor: '#991B1B', icone: '💳', divida: true },
  { nome: 'Outros', grupo: 'PESSOAL', cor: '#64748B', icone: '📦' },
];

export interface ResultadoSeed {
  criadas: number;
  ignoradas: number;
}

/**
 * Insere as categorias padrão que ainda não existem (comparação por nome,
 * case-insensitive). Tudo numa transação só.
 */
export function semearCategorias(executor: Executor = db): ResultadoSeed {
  return escrever((tx) => {
    const existentes = new Set(
      categorias.listar({ incluirArquivadas: true }, tx).map((c) => c.nome.toLowerCase()),
    );

    let criadas = 0;
    let ignoradas = 0;

    for (const padrao of CATEGORIAS_PADRAO) {
      if (existentes.has(padrao.nome.toLowerCase())) {
        ignoradas++;
        continue;
      }
      categorias.criar(
        {
          nome: padrao.nome,
          grupo: padrao.grupo,
          cor: padrao.cor,
          icone: padrao.icone,
          divida: padrao.divida ?? false,
        },
        tx,
      );
      criadas++;
    }

    return { criadas, ignoradas };
  }, executor);
}

/**
 * Só semeia num banco virgem. É isto que roda no boot: se o usuário apagou
 * tudo de propósito, o app não recria nada nas próximas aberturas.
 */
export function semearSePrimeiraExecucao(executor: Executor = db): ResultadoSeed {
  if (categorias.contar(executor) > 0) return { criadas: 0, ignoradas: 0 };
  return semearCategorias(executor);
}
