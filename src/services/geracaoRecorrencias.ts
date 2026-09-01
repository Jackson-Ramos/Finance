/**
 * Geração dos lançamentos do mês a partir das recorrências.
 *
 * Regra do spec: ao abrir o app, para o mês corrente, criar um lançamento com
 * pago = 0 para cada recorrência ativa que ainda não tenha lançamento naquele
 * mês. A checagem é por (recorrencia_id, ano-mês), e rodar dez vezes não pode
 * duplicar.
 *
 * Este módulo é PURO: recebe as recorrências e a lista de ids já gerados no
 * mês, devolve o que falta criar. Quem lê e escreve no banco é
 * `services/mesCorrente.ts`. Assim a idempotência é testável sem banco — e
 * ainda há a trava de verdade no SQLite (índice UNIQUE parcial sobre
 * (recorrencia_id, substr(data,1,7)), migration 0001).
 */

import { diaDoMesGrampeado } from '../lib/date';
import type { Centavos } from '../lib/money';
import type { AnoMes, DataISO, Natureza, TipoLancamento } from '../types/dominio';

/** A forma da linha de `recorrencia` que a geração usa. */
export interface RecorrenciaGeravel {
  id: number;
  descricao: string;
  valorPrevisto: Centavos;
  diaDoMes: number;
  tipo: TipoLancamento;
  natureza: Natureza;
  categoriaId: number | null;
  /** 0 ou 1, como está no banco. */
  ativo: number | null;
}

export interface LancamentoPlanejado {
  data: DataISO;
  descricao: string;
  valor: Centavos;
  tipo: TipoLancamento;
  natureza: Natureza;
  categoriaId: number | null;
  recorrenciaId: number;
  /** Sempre falso: o lançamento nasce previsto, não realizado. */
  pago: false;
}

export type MotivoIgnorada = 'inativa' | 'ja_gerada' | 'duplicada_na_entrada';

export interface PlanoGeracao {
  anoMes: AnoMes;
  aCriar: LancamentoPlanejado[];
  ignoradas: { recorrenciaId: number; motivo: MotivoIgnorada }[];
}

/**
 * Decide o que criar no mês. Chamar de novo com o resultado da rodada anterior
 * refletido em `idsJaGerados` devolve `aCriar` vazio — é essa a idempotência.
 */
export function planejarGeracao(
  recorrencias: readonly RecorrenciaGeravel[],
  idsJaGerados: readonly number[],
  anoMes: AnoMes,
): PlanoGeracao {
  const jaGerados = new Set(idsJaGerados);
  const planejados = new Set<number>();

  const aCriar: LancamentoPlanejado[] = [];
  const ignoradas: { recorrenciaId: number; motivo: MotivoIgnorada }[] = [];

  for (const r of recorrencias) {
    if (r.ativo !== 1) {
      ignoradas.push({ recorrenciaId: r.id, motivo: 'inativa' });
      continue;
    }
    if (jaGerados.has(r.id)) {
      ignoradas.push({ recorrenciaId: r.id, motivo: 'ja_gerada' });
      continue;
    }
    // Defesa contra a mesma recorrência aparecer duas vezes na entrada: o
    // índice UNIQUE do banco recusaria a segunda, mas a transação inteira
    // cairia junto.
    if (planejados.has(r.id)) {
      ignoradas.push({ recorrenciaId: r.id, motivo: 'duplicada_na_entrada' });
      continue;
    }

    planejados.add(r.id);
    aCriar.push({
      // Grampeia no último dia quando o dia não existe no mês:
      // dia 31 vira 28/02, 30/04, 30/06...
      data: diaDoMesGrampeado(anoMes, r.diaDoMes),
      descricao: r.descricao,
      valor: r.valorPrevisto,
      tipo: r.tipo,
      natureza: r.natureza,
      categoriaId: r.categoriaId,
      recorrenciaId: r.id,
      pago: false,
    });
  }

  return { anoMes, aCriar, ignoradas };
}
