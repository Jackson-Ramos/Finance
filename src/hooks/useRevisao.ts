/**
 * Revisão dos dados.
 *
 * O driver expo-sqlite do Drizzle é síncrono, então "buscar dados" é só chamar
 * o repository durante o render. O que falta é saber QUANDO refazer a leitura:
 * este contador sobe a cada escrita e entra como dependência dos `useMemo` de
 * consulta.
 *
 * Escolhido no lugar do `useLiveQuery` do Drizzle porque o `useLiveQuery` exige
 * receber um query builder — o que faria o Drizzle vazar dos repositories para
 * os hooks e quebrar a REGRA #3.
 */

import { useCallback, useMemo } from 'react';
import { create } from 'zustand';

interface EstadoRevisao {
  revisao: number;
  notificarEscrita: () => void;
}

export const useRevisaoStore = create<EstadoRevisao>((set) => ({
  revisao: 0,
  notificarEscrita: () => set((s) => ({ revisao: s.revisao + 1 })),
}));

export function useNotificarEscrita(): () => void {
  return useRevisaoStore((s) => s.notificarEscrita);
}

/**
 * Executa `consulta` e refaz quando os dados mudam ou quando `deps` muda.
 * O erro é devolvido em vez de lançado — a tela decide como mostrar.
 */
export function useConsulta<T>(
  consulta: () => T,
  deps: readonly unknown[],
): { dados: T | null; erro: string | null } {
  const revisao = useRevisaoStore((s) => s.revisao);

  return useMemo(() => {
    try {
      return { dados: consulta(), erro: null };
    } catch (e) {
      return { dados: null, erro: e instanceof Error ? e.message : String(e) };
    }
    // `consulta` é recriada a cada render de propósito; o que controla o
    // recálculo são `revisao` e as deps do chamador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisao, ...deps]);
}

/** Envolve uma escrita: roda, avisa a UI e devolve o erro em vez de lançar. */
export function useEscrita(): (acao: () => void) => string | null {
  const notificar = useNotificarEscrita();

  return useCallback(
    (acao: () => void) => {
      try {
        acao();
        notificar();
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [notificar],
  );
}
