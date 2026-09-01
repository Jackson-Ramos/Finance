/**
 * Dados e ações da tela de recorrências.
 */

import { useCallback, useState } from 'react';
import { anoMesAtual } from '../lib/date';
import * as repoCategorias from '../repositories/categorias';
import * as repoRecorrencias from '../repositories/recorrencias';
import { gerarRecorrenciasDoMes } from '../services/mesCorrente';
import { useConsulta, useEscrita } from './useRevisao';

export type Recorrencia = repoRecorrencias.Recorrencia;

export interface ListaRecorrencias {
  ativas: Recorrencia[];
  pausadas: Recorrencia[];
  total: number;
}

export function useListaRecorrencias(): { dados: ListaRecorrencias | null; erro: string | null } {
  return useConsulta(() => {
    const todas = repoRecorrencias.listar(false);
    return {
      ativas: todas.filter((r) => r.ativo === 1),
      pausadas: todas.filter((r) => r.ativo !== 1),
      total: todas.length,
    };
  }, []);
}

export function useCategoriasDespesa(): repoCategorias.Categoria[] {
  const { dados } = useConsulta(() => repoCategorias.listar(), []);
  return dados ?? [];
}

export interface AcoesRecorrencia {
  salvar: (dados: repoRecorrencias.DadosRecorrencia, id?: number) => boolean;
  alternarAtivo: (r: Recorrencia) => boolean;
  excluir: (id: number) => boolean;
  erro: string | null;
  limparErro: () => void;
}

export function useAcoesRecorrencia(): AcoesRecorrencia {
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
          if (id === undefined) repoRecorrencias.criar(dados);
          else repoRecorrencias.atualizar(id, dados);
          // Uma recorrência criada hoje já deve render o lançamento deste mês.
          // A geração é idempotente, então chamar aqui é inofensivo.
          gerarRecorrenciasDoMes(anoMesAtual());
        }),
      [rodar],
    ),

    alternarAtivo: useCallback(
      (r) =>
        rodar(() => {
          repoRecorrencias.atualizar(r.id, { ativo: r.ativo !== 1 });
          // Reativar volta a gerar; pausar não apaga o que já existe.
          gerarRecorrenciasDoMes(anoMesAtual());
        }),
      [rodar],
    ),

    /**
     * Apaga a regra. Os lançamentos já gerados ficam — o FK é ON DELETE SET
     * NULL, então viram lançamentos avulsos e o histórico não se perde.
     */
    excluir: useCallback((id) => rodar(() => repoRecorrencias.remover(id)), [rodar]),

    erro,
    limparErro: useCallback(() => setErro(null), []),
  };
}
