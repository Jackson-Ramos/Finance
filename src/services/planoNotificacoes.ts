/**
 * Plano de avisos de vencimento.
 *
 * PURO: recebe lançamentos e o instante "agora", devolve o que deveria estar
 * agendado. Quem conversa com o `expo-notifications` é `services/notificacoes.ts`.
 *
 * O plano é sempre a lista COMPLETA do que deve existir — quem agenda cancela
 * tudo e reagenda a partir dele. É o mesmo princípio da geração de
 * recorrências: recalcular do zero é mais simples de acertar do que conciliar
 * diferenças, e não tem como duplicar.
 */

import { paraDate } from '../lib/date';
import { formatarMoeda } from '../lib/format';
import type { Centavos } from '../lib/money';
import type { DataISO, TipoLancamento } from '../types/dominio';

export interface LancamentoNotificavel {
  id: number;
  data: DataISO;
  descricao: string | null;
  valor: Centavos;
  tipo: TipoLancamento;
  /** 0 ou 1, como está no banco. */
  pago: number;
}

export interface NotificacaoPlanejada {
  /** Estável por lançamento: reagendar substitui em vez de somar. */
  identificador: string;
  lancamentoId: number;
  /** Instante local do disparo. */
  quando: Date;
  titulo: string;
  corpo: string;
}

export interface OpcoesPlano {
  /** Injetado para o teste ser determinístico. */
  agora: Date;
  /** Hora local do aviso, 0..23. */
  horaDoAviso?: number;
  /**
   * Quantos dias à frente agendar. O Android limita alarmes pendentes por app,
   * então não adianta agendar o ano inteiro.
   */
  janelaEmDias?: number;
}

export const HORA_PADRAO_DO_AVISO = 9;
export const JANELA_PADRAO_EM_DIAS = 60;

const TITULO: Record<TipoLancamento, string> = {
  RECEITA: 'Entrada prevista para hoje',
  DESPESA: 'Conta vence hoje',
  APORTE: 'Aporte programado para hoje',
};

export function identificadorDe(lancamentoId: number): string {
  return `vencimento-${lancamentoId}`;
}

export function planejarNotificacoes(
  lancamentos: readonly LancamentoNotificavel[],
  opcoes: OpcoesPlano,
): NotificacaoPlanejada[] {
  const hora = opcoes.horaDoAviso ?? HORA_PADRAO_DO_AVISO;
  const janela = opcoes.janelaEmDias ?? JANELA_PADRAO_EM_DIAS;

  const limite = new Date(opcoes.agora.getTime());
  limite.setDate(limite.getDate() + janela);

  const planejadas: NotificacaoPlanejada[] = [];

  for (const l of lancamentos) {
    if (l.pago === 1) continue;

    const quando = paraDate(l.data);
    quando.setHours(hora, 0, 0, 0);

    // Não dá para agendar no passado: um lançamento vencido não vira aviso,
    // ele já aparece em aberto na tela do mês.
    if (quando.getTime() <= opcoes.agora.getTime()) continue;
    if (quando.getTime() > limite.getTime()) continue;

    planejadas.push({
      identificador: identificadorDe(l.id),
      lancamentoId: l.id,
      quando,
      titulo: TITULO[l.tipo],
      corpo: `${l.descricao?.trim() || 'Lançamento'} · ${formatarMoeda(l.valor)}`,
    });
  }

  return planejadas.sort((a, b) => a.quando.getTime() - b.quando.getTime());
}
