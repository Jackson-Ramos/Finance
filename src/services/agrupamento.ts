/**
 * Agrupamento da lista do mês por dia de competência.
 *
 * Serviço PURO. A ordem que entra dentro de cada dia é preservada — o
 * repository já devolve os lançamentos do mais recente para o mais antigo,
 * então quem acabou de lançar vê o registro no topo do dia.
 */

import { comSinal, type Centavos } from '../lib/money';
import type { DataISO, TipoLancamento } from '../types/dominio';

export interface LancamentoAgrupavel {
  data: DataISO;
  valor: Centavos;
  tipo: TipoLancamento;
}

export interface GrupoDia<T extends LancamentoAgrupavel> {
  data: DataISO;
  itens: T[];
  /** Saldo do dia, COM sinal: entradas menos saídas. */
  saldoDoDia: Centavos;
}

/**
 * Agrupa por `data`, do dia mais recente para o mais antigo.
 * Dias sem lançamento simplesmente não aparecem.
 */
export function agruparPorDia<T extends LancamentoAgrupavel>(
  lancamentos: readonly T[],
): GrupoDia<T>[] {
  const porData = new Map<DataISO, T[]>();

  for (const l of lancamentos) {
    const grupo = porData.get(l.data);
    if (grupo) grupo.push(l);
    else porData.set(l.data, [l]);
  }

  return [...porData.entries()]
    // ISO ordena lexicograficamente igual a cronologicamente.
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([data, itens]) => ({
      data,
      itens,
      saldoDoDia: itens.reduce((acc, l) => acc + comSinal(l.valor, l.tipo), 0),
    }));
}
