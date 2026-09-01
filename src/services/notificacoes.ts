/**
 * Avisos locais de vencimento.
 *
 * Único módulo que fala com o `expo-notifications`. A decisão de O QUE agendar
 * é do serviço puro `planoNotificacoes.ts`; aqui só há permissão, canal e
 * agendamento.
 *
 * ATENÇÃO — por que o módulo é carregado por `require` dentro de try/catch:
 * no Expo Go do Android, a partir do SDK 53, importar `expo-notifications`
 * LANÇA na avaliação do módulo, não na chamada de função. Um `import` no topo
 * derruba tudo que estiver acima na cadeia — inclusive o layout raiz — e o app
 * nem monta. Carregando sob demanda, o Expo Go roda sem avisos e o development
 * build roda com eles.
 *
 * Estratégia de agendamento: cancelar tudo e reagendar a partir do plano
 * completo. Reconciliar diferenças daria mais trabalho e mais bugs; a lista tem
 * dezenas de itens, não milhares.
 *
 * Nada disto faz chamada de rede — é tudo alarme local do Android.
 */

import { Platform } from 'react-native';
import { deDate, hoje } from '../lib/date';
import * as repoLancamentos from '../repositories/lancamentos';
import {
  JANELA_PADRAO_EM_DIAS,
  planejarNotificacoes,
  type NotificacaoPlanejada,
} from './planoNotificacoes';

type ModuloNotificacoes = typeof import('expo-notifications');

export const CANAL_VENCIMENTOS = 'vencimentos';

/** `undefined` = ainda não tentou carregar; `null` = tentou e não dá. */
let modulo: ModuloNotificacoes | null | undefined;
let motivo: string | null = null;

/**
 * Carrega o `expo-notifications` uma única vez, tolerando ambiente que não o
 * suporta. `require` em vez de `import()` porque precisa ser síncrono e o
 * Metro resolve estaticamente do mesmo jeito.
 */
function carregarModulo(): ModuloNotificacoes | null {
  if (modulo !== undefined) return modulo;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    modulo = require('expo-notifications') as ModuloNotificacoes;
    motivo = null;
  } catch (erro) {
    modulo = null;
    motivo = erro instanceof Error ? erro.message : String(erro);
  }
  return modulo;
}

/** Se os avisos podem ou não funcionar neste ambiente. */
export function notificacoesDisponiveis(): boolean {
  return carregarModulo() !== null;
}

/** Texto do porquê, para a tela de diagnóstico. `null` quando está tudo certo. */
export function motivoIndisponivel(): string | null {
  carregarModulo();
  return modulo === null ? (motivo ?? 'expo-notifications indisponível neste ambiente') : null;
}

let configurado = false;

/** Handler e canal do Android. Idempotente; chamado antes de qualquer agendamento. */
export async function configurarNotificacoes(): Promise<boolean> {
  const N = carregarModulo();
  if (!N) return false;
  if (configurado) return true;
  configurado = true;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CANAL_VENCIMENTOS, {
      name: 'Vencimentos',
      description: 'Avisos de contas a pagar e entradas previstas',
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lockscreenVisibility: N.AndroidNotificationVisibility.PRIVATE,
    });
  }

  return true;
}

/**
 * Pede permissão se ainda não houver. No Android 13+ isto abre o diálogo de
 * POST_NOTIFICATIONS.
 */
export async function garantirPermissao(): Promise<boolean> {
  const N = carregarModulo();
  if (!N) return false;

  const atual = await N.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;

  const pedida = await N.requestPermissionsAsync();
  return pedida.granted;
}

export interface ResultadoSincronizacao {
  /** Falso no Expo Go do Android: o módulo nativo não está lá. */
  disponivel: boolean;
  permitido: boolean;
  agendados: number;
  cancelados: number;
  /** Quantos avisos o plano queria agendar, mesmo que não tenha dado. */
  planejados: number;
}

const INDISPONIVEL: ResultadoSincronizacao = {
  disponivel: false,
  permitido: false,
  agendados: 0,
  cancelados: 0,
  planejados: 0,
};

/**
 * Deixa os avisos agendados exatamente iguais ao plano: cancela tudo e
 * reagenda. Chamar depois de qualquer escrita é seguro e barato.
 */
export async function sincronizarAvisos(
  janelaEmDias = JANELA_PADRAO_EM_DIAS,
): Promise<ResultadoSincronizacao> {
  const N = carregarModulo();
  if (!N) return INDISPONIVEL;

  await configurarNotificacoes();

  const fim = new Date();
  fim.setDate(fim.getDate() + janelaEmDias);

  const emAberto = repoLancamentos.listarNaoPagosNoPeriodo(hoje(), deDate(fim));
  const plano = planejarNotificacoes(emAberto, { agora: new Date(), janelaEmDias });

  const anteriores = await N.getAllScheduledNotificationsAsync();
  await N.cancelAllScheduledNotificationsAsync();

  const base = { disponivel: true, cancelados: anteriores.length, planejados: plano.length };

  // Nada a agendar: não pede permissão. Quem abre o app pela primeira vez, sem
  // nenhuma conta cadastrada, não leva um diálogo de permissão na cara.
  if (plano.length === 0) {
    const atual = await N.getPermissionsAsync();
    return { ...base, permitido: atual.granted, agendados: 0 };
  }

  if (!(await garantirPermissao())) {
    return { ...base, permitido: false, agendados: 0 };
  }

  for (const aviso of plano) await agendar(N, aviso);

  return { ...base, permitido: true, agendados: plano.length };
}

async function agendar(N: ModuloNotificacoes, aviso: NotificacaoPlanejada): Promise<void> {
  await N.scheduleNotificationAsync({
    identifier: aviso.identificador,
    content: {
      title: aviso.titulo,
      body: aviso.corpo,
      data: { lancamentoId: aviso.lancamentoId },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DATE,
      date: aviso.quando,
      channelId: CANAL_VENCIMENTOS,
    },
  });
}

/** Para a tela de diagnóstico: o que está de fato agendado no sistema. */
export async function avisosAgendados(): Promise<
  { identificador: string; titulo: string; corpo: string }[]
> {
  const N = carregarModulo();
  if (!N) return [];

  const agendados = await N.getAllScheduledNotificationsAsync();
  return agendados.map((a) => ({
    identificador: a.identifier,
    titulo: a.content.title ?? '',
    corpo: a.content.body ?? '',
  }));
}
