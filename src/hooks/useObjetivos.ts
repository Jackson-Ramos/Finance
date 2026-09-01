/**
 * Dados e ações da tela de objetivos.
 */

import { useCallback, useState } from 'react';
import { anoMesAtual } from '../lib/date';
import type { Centavos } from '../lib/money';
import * as repoLancamentos from '../repositories/lancamentos';
import * as repoObjetivos from '../repositories/objetivos';
import {
  calcularProgressos,
  totalGuardado,
  type ProgressoObjetivo,
} from '../services/progressoObjetivos';
import type { AnoMes } from '../types/dominio';
import { useConsulta, useEscrita } from './useRevisao';

export type Objetivo = repoObjetivos.Objetivo;

export interface PainelObjetivos {
  progressos: ProgressoObjetivo<Objetivo>[];
  /** Soma de tudo que está guardado, inclusive aportes sem objetivo. */
  guardadoNoTotal: Centavos;
  total: number;
  anoMes: AnoMes;
}

export function usePainelObjetivos(anoMes: AnoMes = anoMesAtual()): {
  dados: PainelObjetivos | null;
  erro: string | null;
} {
  return useConsulta(() => {
    const objetivos = repoObjetivos.listar(false);
    const aportes = repoLancamentos.listarAportes();

    return {
      progressos: calcularProgressos(objetivos, aportes, anoMes),
      guardadoNoTotal: totalGuardado(aportes),
      total: objetivos.length,
      anoMes,
    };
  }, [anoMes]);
}

/** Objetivos ativos, para os chips de aporte na folha de lançamento. */
export function useObjetivosAtivos(): { id: number; nome: string }[] {
  const { dados } = useConsulta(
    () => repoObjetivos.listar(true).map((o) => ({ id: o.id, nome: o.nome })),
    [],
  );
  return dados ?? [];
}

export interface AcoesObjetivo {
  salvar: (dados: repoObjetivos.DadosObjetivo, id?: number) => boolean;
  alternarAtivo: (o: Objetivo) => boolean;
  excluir: (id: number) => boolean;
  erro: string | null;
  limparErro: () => void;
}

export function useAcoesObjetivo(): AcoesObjetivo {
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
          if (id === undefined) repoObjetivos.criar(dados);
          else repoObjetivos.atualizar(id, dados);
        }),
      [rodar],
    ),

    alternarAtivo: useCallback(
      (o) => rodar(() => repoObjetivos.atualizar(o.id, { ativo: o.ativo !== 1 })),
      [rodar],
    ),

    /**
     * Apaga o objetivo. Os aportes ficam no histórico como lançamentos sem
     * destino (FK ON DELETE SET NULL) — o dinheiro saiu do caixa de verdade,
     * então apagar o registro falsearia o passado.
     */
    excluir: useCallback((id) => rodar(() => repoObjetivos.remover(id)), [rodar]),

    erro,
    limparErro: useCallback(() => setErro(null), []),
  };
}
