/**
 * Onde a folha de lançamento está aberta ou fechada.
 *
 * Isto era estado local da tela do mês, e funcionava enquanto o botão `+` vivia
 * dentro dela. Com o FAB no meio da barra de abas, ele precisa abrir a folha de
 * QUALQUER aba — e uma tela não alcança o estado de outra. Então a folha é
 * montada uma vez no layout das abas e a intenção de abrir vem daqui.
 *
 * Mesmo padrão do `useMesStore`: um store pequeno para o que várias telas
 * precisam enxergar ao mesmo tempo.
 */

import { create } from 'zustand';
import type { ItemDoMes } from './useMes';

interface EstadoFolha {
  aberta: boolean;
  /** `null` = lançamento novo. */
  emEdicao: ItemDoMes | null;
  abrir: (item?: ItemDoMes) => void;
  fechar: () => void;
}

export const useFolhaLancamento = create<EstadoFolha>((set) => ({
  aberta: false,
  emEdicao: null,
  abrir: (item) => set({ aberta: true, emEdicao: item ?? null }),
  fechar: () => set({ aberta: false, emEdicao: null }),
}));
