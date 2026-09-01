/**
 * Estado e dados da tela do mês.
 *
 * Componente -> hook -> repository -> Drizzle (REGRA #3).
 */

import { useCallback, useState } from 'react';
import { create } from 'zustand';
import { anoMesAtual, mesAnterior, mesSeguinte } from '../lib/date';
import * as repoCategorias from '../repositories/categorias';
import * as repoLancamentos from '../repositories/lancamentos';
import type { AnoMes } from '../types/dominio';
import { agruparPorDia, type GrupoDia } from '../services/agrupamento';
import { calcularResumoMes, type ResumoMes } from '../services/resumoMes';
import { useConsulta, useEscrita } from './useRevisao';

// --------------------------------------------------------------- navegação

interface EstadoMes {
  anoMes: AnoMes;
  irPara: (anoMes: AnoMes) => void;
  anterior: () => void;
  seguinte: () => void;
  voltarParaHoje: () => void;
}

export const useMesStore = create<EstadoMes>((set) => ({
  anoMes: anoMesAtual(),
  irPara: (anoMes) => set({ anoMes }),
  anterior: () => set((s) => ({ anoMes: mesAnterior(s.anoMes) })),
  seguinte: () => set((s) => ({ anoMes: mesSeguinte(s.anoMes) })),
  voltarParaHoje: () => set({ anoMes: anoMesAtual() }),
}));

// ------------------------------------------------------------------ dados

export type ItemDoMes = repoLancamentos.LancamentoComCategoria;

export interface DadosDoMes {
  anoMes: AnoMes;
  resumo: ResumoMes;
  grupos: GrupoDia<ItemDoMes>[];
  quantidade: number;
}

export function useDadosDoMes(anoMes: AnoMes): { dados: DadosDoMes | null; erro: string | null } {
  return useConsulta(() => {
    const lancamentos = repoLancamentos.listarDoMesComCategoria(anoMes);
    return {
      anoMes,
      resumo: calcularResumoMes(lancamentos),
      grupos: agruparPorDia(lancamentos),
      quantidade: lancamentos.length,
    };
  }, [anoMes]);
}

/** Categorias disponíveis para escolher na folha de lançamento. */
export function useCategoriasAtivas(): repoCategorias.Categoria[] {
  const { dados } = useConsulta(() => repoCategorias.listar(), []);
  return dados ?? [];
}

// ------------------------------------------------------------------ ações

export interface AcoesLancamento {
  salvar: (dados: repoLancamentos.DadosLancamento, id?: number) => boolean;
  excluir: (id: number) => boolean;
  alternarPago: (item: { id: number; pago: number }) => boolean;
  erro: string | null;
  limparErro: () => void;
}

export function useAcoesLancamento(): AcoesLancamento {
  const escrever = useEscrita();
  const [erro, setErro] = useState<string | null>(null);

  const rodar = useCallback(
    (acao: () => void) => {
      const falha = escrever(acao);
      setErro(falha);
      return falha === null;
    },
    [escrever],
  );

  return {
    salvar: useCallback(
      (dados, id) =>
        rodar(() => {
          if (id === undefined) repoLancamentos.criar(dados);
          else repoLancamentos.atualizar(id, dados);
        }),
      [rodar],
    ),
    excluir: useCallback((id) => rodar(() => repoLancamentos.remover(id)), [rodar]),
    alternarPago: useCallback(
      (item) =>
        rodar(() => {
          if (item.pago === 1) repoLancamentos.desmarcarPago(item.id);
          else repoLancamentos.marcarPago(item.id);
        }),
      [rodar],
    ),
    erro,
    limparErro: useCallback(() => setErro(null), []),
  };
}
