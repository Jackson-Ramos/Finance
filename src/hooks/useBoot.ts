/**
 * Estado de boot do app, em Zustand.
 *
 * Zustand aqui é ESTADO DE UI: guarda "já inicializou? deu erro?". Os dados do
 * banco não passam por ele — quem lê dados são os hooks de dados, que falam com
 * repositories.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { iniciarApp, type ResultadoBoot } from '../services/boot';

type FaseBoot = 'ocioso' | 'carregando' | 'pronto' | 'erro';

interface EstadoBoot {
  fase: FaseBoot;
  resultado: ResultadoBoot | null;
  erro: string | null;
  iniciar: () => void;
}

export const useBootStore = create<EstadoBoot>((set, get) => ({
  fase: 'ocioso',
  resultado: null,
  erro: null,
  iniciar: () => {
    if (get().fase === 'carregando' || get().fase === 'pronto') return;
    set({ fase: 'carregando', erro: null });
    try {
      const resultado = iniciarApp();
      set({ fase: 'pronto', resultado, erro: null });
    } catch (erro) {
      set({
        fase: 'erro',
        erro: erro instanceof Error ? `${erro.message}\n${erro.stack ?? ''}` : String(erro),
      });
    }
  },
}));

/** Dispara o boot uma vez e devolve o estado corrente. */
export function useBoot(): EstadoBoot {
  const estado = useBootStore();
  useEffect(() => {
    estado.iniciar();
    // `iniciar` já é idempotente; roda uma vez na montagem do layout raiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return estado;
}
