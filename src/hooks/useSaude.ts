/**
 * Dados da tela de saúde financeira.
 *
 * Uma leitura só: doze meses de lançamentos, as categorias e todos os aportes.
 * Tudo o mais é cálculo puro em `services/saudeFinanceira.ts`.
 */

import { anoMesAtual, ultimosMeses } from '../lib/date';
import * as repoCategorias from '../repositories/categorias';
import * as repoLancamentos from '../repositories/lancamentos';
import {
  calcularIndicadores,
  distribuicaoPorCategoria,
  divisaoCasaPessoal,
  serieHistorica,
  type FatiaCategoria,
  type FatiaGrupo,
  type Indicadores,
  type PontoHistorico,
} from '../services/saudeFinanceira';
import type { AnoMes } from '../types/dominio';
import { useConsulta } from './useRevisao';

export const MESES_DA_SERIE = 12;

export interface PainelSaude {
  anoMes: AnoMes;
  indicadores: Indicadores;
  serie: PontoHistorico[];
  porCategoria: FatiaCategoria[];
  grupos: FatiaGrupo[];
  totalDespesas: number;
  /** Lançamentos na janela de 12 meses — 0 significa tela vazia. */
  quantidade: number;
}

export function usePainelSaude(anoMes: AnoMes = anoMesAtual()): {
  dados: PainelSaude | null;
  erro: string | null;
} {
  return useConsulta(() => {
    const meses = ultimosMeses(anoMes, MESES_DA_SERIE);
    const lancamentos = repoLancamentos.listarPorMeses(meses);
    const categorias = repoCategorias.listar({ incluirArquivadas: true });
    // Aportes de qualquer época: o guardado é estoque acumulado, não cabe na
    // janela de 12 meses.
    const aportesAcumulados = repoLancamentos.listarAportes();

    const divisao = divisaoCasaPessoal(lancamentos, anoMes, categorias);

    return {
      anoMes,
      indicadores: calcularIndicadores({ anoMes, lancamentos, categorias, aportesAcumulados }),
      serie: serieHistorica(lancamentos, meses),
      porCategoria: distribuicaoPorCategoria(lancamentos, anoMes, categorias),
      grupos: divisao.fatias,
      totalDespesas: divisao.total,
      quantidade: lancamentos.length,
    };
  }, [anoMes]);
}

/**
 * Despesas por categoria de UM mês, para a rosca do painel.
 *
 * Existe separado do `usePainelSaude` porque a tela Principal não precisa dos
 * doze meses de leitura que aquele hook faz — seria pagar a conta da tela de
 * saúde inteira para desenhar uma rosca.
 *
 * `limite` sai de `LIMITE_FATIAS`: a paleta validada tem três slots que passam
 * em todos os pares, e o resto vai para a fatia "Outras".
 */
export function useDistribuicaoDoMes(
  anoMes: AnoMes,
  limite: number,
): { fatias: FatiaCategoria[]; total: number; erro: string | null } {
  const { dados, erro } = useConsulta(() => {
    const lancamentos = repoLancamentos.listarPorMeses([anoMes]);
    const categorias = repoCategorias.listar({ incluirArquivadas: true });
    const fatias = distribuicaoPorCategoria(lancamentos, anoMes, categorias, limite);
    return { fatias, total: fatias.reduce((soma, f) => soma + f.valor, 0) };
  }, [anoMes, limite]);

  return { fatias: dados?.fatias ?? [], total: dados?.total ?? 0, erro };
}
