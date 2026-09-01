/**
 * Camada de apresentação: centavos e datas ISO viram texto pt-BR aqui, e só aqui.
 * Nada neste arquivo deve ser usado para calcular — só para exibir.
 */

import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AnoMes, DataISO, TipoLancamento } from '../types/dominio';
import type { Centavos } from './money';
import { paraDate, hoje } from './date';

const LOCALE = 'pt-BR';

const moeda = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moedaSemSimbolo = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inteiro = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const decimal1 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 123456 -> "R$ 1.234,56". A divisão por 100 acontece só aqui. */
export function formatarMoeda(centavos: Centavos): string {
  return moeda.format(centavos / 100);
}

/** 123456 -> "1.234,56" (sem "R$", para linhas de lista densas). */
export function formatarMoedaSemSimbolo(centavos: Centavos): string {
  return moedaSemSimbolo.format(centavos / 100);
}

/** Aplica o sinal visual derivado do tipo: "+ R$ 100,00" / "− R$ 100,00". */
export function formatarMoedaComSinal(centavos: Centavos, tipo: TipoLancamento): string {
  const prefixo = tipo === 'RECEITA' ? '+ ' : '− ';
  return `${prefixo}${formatarMoeda(Math.abs(centavos))}`;
}

/** 1234567 -> "R$ 12,3 mil". Para eixos de gráfico e cards apertados. */
export function formatarMoedaCompacta(centavos: Centavos): string {
  const reais = Math.abs(centavos) / 100;
  const sinal = centavos < 0 ? '−' : '';
  if (reais >= 1_000_000) return `${sinal}R$ ${decimal1.format(reais / 1_000_000)} mi`;
  if (reais >= 1_000) return `${sinal}R$ ${decimal1.format(reais / 1_000)} mil`;
  return `${sinal}R$ ${inteiro.format(reais)}`;
}

/** Percentual inteiro. `null` (divisão por zero) vira travessão, nunca "NaN%". */
export function formatarPercentual(valor: number | null, vazio = '—'): string {
  if (valor === null || !Number.isFinite(valor)) return vazio;
  return `${inteiro.format(valor)}%`;
}

/** Meses com 1 casa: 6.5 -> "6,5 meses". `null` vira travessão. */
export function formatarMeses(valor: number | null, vazio = '—'): string {
  if (valor === null || !Number.isFinite(valor)) return vazio;
  return `${decimal1.format(valor)} ${valor === 1 ? 'mês' : 'meses'}`;
}

/** '2026-08-31' -> "31/08/2026". */
export function formatarData(data: DataISO): string {
  return format(paraDate(data), 'dd/MM/yyyy', { locale: ptBR });
}

/** '2026-08-31' -> "31 ago". */
export function formatarDataCurta(data: DataISO): string {
  return format(paraDate(data), "dd MMM", { locale: ptBR });
}

/** Cabeçalho de grupo da lista diária: "Hoje", "Ontem" ou "seg, 31 ago". */
export function formatarCabecalhoDia(data: DataISO): string {
  const d = paraDate(data);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return capitalizar(format(d, "EEE, dd MMM", { locale: ptBR }));
}

/** '2026-08' -> "Agosto de 2026". */
export function formatarMesAno(anoMes: AnoMes): string {
  return capitalizar(format(paraDate(`${anoMes}-01`), "MMMM 'de' yyyy", { locale: ptBR }));
}

/** '2026-08' -> "Ago". Para eixos da série histórica de 12 meses. */
export function formatarMesCurto(anoMes: AnoMes): string {
  return capitalizar(format(paraDate(`${anoMes}-01`), 'MMM', { locale: ptBR }));
}

/** '2026-08' -> "Ago/26". */
export function formatarMesAnoCurto(anoMes: AnoMes): string {
  return capitalizar(format(paraDate(`${anoMes}-01`), 'MMM/yy', { locale: ptBR }));
}

export function capitalizar(texto: string): string {
  if (texto.length === 0) return texto;
  return texto[0].toUpperCase() + texto.slice(1);
}

export const ROTULO_TIPO: Record<TipoLancamento, string> = {
  RECEITA: 'Receita',
  DESPESA: 'Despesa',
  APORTE: 'Aporte',
};

/** Quantos dias faltam (ou passaram) até `data`, do ponto de vista de hoje. */
export function formatarVencimento(data: DataISO): string {
  const dias = Math.round((paraDate(data).getTime() - paraDate(hoje()).getTime()) / 86_400_000);
  if (dias === 0) return 'Vence hoje';
  if (dias === 1) return 'Vence amanhã';
  if (dias === -1) return 'Venceu ontem';
  if (dias > 1) return `Vence em ${dias} dias`;
  return `Venceu há ${Math.abs(dias)} dias`;
}
