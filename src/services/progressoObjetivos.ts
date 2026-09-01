/**
 * Progresso e projeção de conclusão dos objetivos.
 *
 * Serviço PURO: recebe objetivos e aportes, devolve números. Nada de banco.
 *
 * Duas definições que valem fixar, porque o resto depende delas:
 * - GUARDADO é a soma dos aportes com pago = 1. Aporte agendado e não pago é
 *   intenção, não patrimônio.
 * - RITMO MÉDIO é `guardado ÷ meses decorridos desde o primeiro aporte`,
 *   contando o mês do primeiro aporte e o mês de referência. Escolhido em vez
 *   de uma janela fixa de 3 meses porque, no começo da jornada, dividir por 3
 *   com um mês de histórico subestimaria o ritmo em 3×. E parar de aportar faz
 *   o ritmo cair mês a mês, que é o comportamento honesto.
 */

import { diferencaEmMeses, mesesDecorridos, somarMeses } from '../lib/date';
import { arredondar, percentualInteiro, somar, type Centavos } from '../lib/money';
import type { AnoMes, DataISO } from '../types/dominio';

export interface ObjetivoBase {
  id: number;
  nome: string;
  valorAlvo: Centavos;
  metaMensal: Centavos | null;
  ativo: number | null;
}

/** Um lançamento do tipo APORTE. */
export interface AporteBase {
  objetivoId: number | null;
  valor: Centavos;
  data: DataISO;
  /** 0 ou 1, como está no banco. */
  pago: number;
}

export interface ProgressoObjetivo<T extends ObjetivoBase = ObjetivoBase> {
  /** A própria linha que entrou, com o tipo preservado. */
  objetivo: T;
  /** Aportes já pagos. É o que de fato está guardado. */
  guardado: Centavos;
  /** Aportes lançados e ainda não pagos. */
  programado: Centavos;
  /** Quanto falta para o alvo. Nunca negativo. */
  restante: Centavos;
  /** 0..N inteiro. `null` quando o alvo é zero. */
  percentual: number | null;
  /** 0..1, grampeado — alimenta a trilha. */
  fracao: number;
  concluido: boolean;

  /** Mês do primeiro aporte pago. `null` se ainda não houve nenhum. */
  primeiroAporte: AnoMes | null;
  ultimoAporte: DataISO | null;
  quantidadeDeAportes: number;
  /** Meses entre o primeiro aporte e a referência, contando os dois. */
  mesesDeHistorico: number;

  /** Centavos por mês. `null` sem histórico. */
  ritmoMedio: Centavos | null;
  /** Meses que faltam no ritmo atual. `null` quando o ritmo é zero. */
  mesesParaConcluir: number | null;
  previsaoConclusao: AnoMes | null;

  /** A mesma projeção, mas pela meta mensal declarada pelo usuário. */
  mesesPelaMeta: number | null;
  previsaoPelaMeta: AnoMes | null;
}

function projetar(
  restante: Centavos,
  porMes: Centavos | null,
  referencia: AnoMes,
): { meses: number | null; previsao: AnoMes | null } {
  if (restante === 0) return { meses: 0, previsao: referencia };
  if (porMes === null || porMes <= 0) return { meses: null, previsao: null };

  const meses = Math.ceil(restante / porMes);
  return { meses, previsao: somarMeses(referencia, meses) };
}

export function calcularProgresso<T extends ObjetivoBase>(
  objetivo: T,
  aportes: readonly AporteBase[],
  anoMesReferencia: AnoMes,
): ProgressoObjetivo<T> {
  const doObjetivo = aportes.filter((a) => a.objetivoId === objetivo.id);
  const pagos = doObjetivo.filter((a) => a.pago === 1);

  const guardado = somar(pagos.map((a) => a.valor));
  const programado = somar(doObjetivo.filter((a) => a.pago !== 1).map((a) => a.valor));

  const alvo = objetivo.valorAlvo;
  const restante = Math.max(0, alvo - guardado);
  const concluido = alvo > 0 && guardado >= alvo;

  const datas = pagos.map((a) => a.data).sort();
  const primeiroAporte = datas.length > 0 ? datas[0].slice(0, 7) : null;
  const ultimoAporte = datas.length > 0 ? datas[datas.length - 1] : null;

  // Se o primeiro aporte é posterior à referência (usuário navegou para trás),
  // não há histórico a contar naquele ponto do tempo.
  const temHistorico =
    primeiroAporte !== null && diferencaEmMeses(primeiroAporte, anoMesReferencia) >= 0;

  const mesesDeHistorico = temHistorico ? mesesDecorridos(primeiroAporte, anoMesReferencia) : 0;
  const ritmoMedio = mesesDeHistorico > 0 ? arredondar(guardado / mesesDeHistorico) : null;

  const peloRitmo = projetar(restante, ritmoMedio, anoMesReferencia);
  const pelaMeta = projetar(restante, objetivo.metaMensal, anoMesReferencia);

  return {
    objetivo,
    guardado,
    programado,
    restante,
    percentual: percentualInteiro(guardado, alvo),
    fracao: alvo > 0 ? Math.min(1, guardado / alvo) : 0,
    concluido,
    primeiroAporte,
    ultimoAporte,
    quantidadeDeAportes: pagos.length,
    mesesDeHistorico,
    ritmoMedio,
    mesesParaConcluir: peloRitmo.meses,
    previsaoConclusao: peloRitmo.previsao,
    mesesPelaMeta: pelaMeta.meses,
    previsaoPelaMeta: pelaMeta.previsao,
  };
}

/** Ordena: em andamento primeiro (mais adiantado no topo), concluídos por último. */
export function calcularProgressos<T extends ObjetivoBase>(
  objetivos: readonly T[],
  aportes: readonly AporteBase[],
  anoMesReferencia: AnoMes,
): ProgressoObjetivo<T>[] {
  return objetivos
    .map((o) => calcularProgresso(o, aportes, anoMesReferencia))
    .sort((a, b) => {
      if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
      return b.fracao - a.fracao;
    });
}

/** Total efetivamente guardado em todos os objetivos — base de `reserva_em_meses`. */
export function totalGuardado(aportes: readonly AporteBase[]): Centavos {
  return somar(aportes.filter((a) => a.pago === 1).map((a) => a.valor));
}
