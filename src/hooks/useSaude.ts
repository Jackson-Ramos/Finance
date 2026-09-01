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
