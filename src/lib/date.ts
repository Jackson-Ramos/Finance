/**
 * Camada de datas.
 *
 * REGRA INVIOLÁVEL #2: data de lançamento é TEXT 'YYYY-MM-DD', sem hora e sem
 * fuso. Este módulo é a ÚNICA porta entre `Date` e o resto do app. Ninguém
 * mais chama `new Date()` para comparar competência.
 *
 * Por que texto e não Date: 'YYYY-MM-DD' ordena lexicograficamente igual a
 * cronologicamente, então comparação, BETWEEN em SQL e sort de array são
 * a mesma operação — e nenhuma delas pode escorregar um dia por causa de
 * UTC-3.
 */

import { addMonths, format, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AnoMes, DataISO } from '../types/dominio';

const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const RE_ANO_MES = /^\d{4}-\d{2}$/;

/** Valida forma E existência real (2026-02-30 é inválida). */
export function ehDataISO(valor: unknown): valor is DataISO {
  if (typeof valor !== 'string' || !RE_DATA_ISO.test(valor)) return false;
  const [ano, mes, dia] = valor.split('-').map(Number);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= diasNoMes(chaveAnoMes(ano, mes));
}

export function ehAnoMes(valor: unknown): valor is AnoMes {
  if (typeof valor !== 'string' || !RE_ANO_MES.test(valor)) return false;
  const mes = Number(valor.slice(5, 7));
  return mes >= 1 && mes <= 12;
}

export function assertDataISO(valor: string, contexto = 'data'): DataISO {
  if (!ehDataISO(valor)) throw new Error(`${contexto} inválida (esperado YYYY-MM-DD): ${valor}`);
  return valor;
}

export function assertAnoMes(valor: string, contexto = 'anoMes'): AnoMes {
  if (!ehAnoMes(valor)) throw new Error(`${contexto} inválido (esperado YYYY-MM): ${valor}`);
  return valor;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function chaveAnoMes(ano: number, mes: number): AnoMes {
  return `${String(ano).padStart(4, '0')}-${pad2(mes)}`;
}

/**
 * Converte 'YYYY-MM-DD' em `Date` local à meia-noite.
 * Construído campo a campo — `new Date('2026-08-31')` seria interpretado
 * como UTC e viraria 30/08 em fuso negativo.
 */
export function paraDate(data: DataISO): Date {
  assertDataISO(data);
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
}

/** Converte um `Date` local em 'YYYY-MM-DD', descartando hora e fuso. */
export function deDate(d: Date): DataISO {
  return `${String(d.getFullYear()).padStart(4, '0')}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Hoje no calendário local do aparelho. Único ponto do app que lê o relógio. */
export function hoje(): DataISO {
  return deDate(new Date());
}

export function anoMesAtual(): AnoMes {
  return anoMesDe(hoje());
}

/** 'YYYY-MM-DD' -> 'YYYY-MM'. */
export function anoMesDe(data: DataISO): AnoMes {
  assertDataISO(data);
  return data.slice(0, 7);
}

export function anoDe(anoMes: AnoMes): number {
  return Number(assertAnoMes(anoMes).slice(0, 4));
}

export function mesDe(anoMes: AnoMes): number {
  return Number(assertAnoMes(anoMes).slice(5, 7));
}

export function diaDe(data: DataISO): number {
  return Number(assertDataISO(data).slice(8, 10));
}

/** 28, 29, 30 ou 31. */
export function diasNoMes(anoMes: AnoMes): number {
  assertAnoMes(anoMes);
  return getDaysInMonth(new Date(anoDe(anoMes), mesDe(anoMes) - 1, 1));
}

export function primeiroDia(anoMes: AnoMes): DataISO {
  return `${assertAnoMes(anoMes)}-01`;
}

export function ultimoDia(anoMes: AnoMes): DataISO {
  return `${assertAnoMes(anoMes)}-${pad2(diasNoMes(anoMes))}`;
}

/**
 * Data do dia `dia` dentro de `anoMes`, GRAMPEADA ao último dia do mês.
 *
 * É a regra de virada de mês das recorrências: dia 31 vira 28/02 (ou 29 em
 * bissexto), 30/04, 30/06 — e o dia 1 nunca é afetado.
 */
export function diaDoMesGrampeado(anoMes: AnoMes, dia: number): DataISO {
  assertAnoMes(anoMes);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error(`dia_do_mes deve ser inteiro entre 1 e 31, recebido: ${String(dia)}`);
  }
  return `${anoMes}-${pad2(Math.min(dia, diasNoMes(anoMes)))}`;
}

/** Desloca a chave de mês. `n` negativo anda para trás. */
export function somarMeses(anoMes: AnoMes, n: number): AnoMes {
  assertAnoMes(anoMes);
  const d = addMonths(new Date(anoDe(anoMes), mesDe(anoMes) - 1, 1), n);
  return chaveAnoMes(d.getFullYear(), d.getMonth() + 1);
}

export function mesAnterior(anoMes: AnoMes): AnoMes {
  return somarMeses(anoMes, -1);
}

export function mesSeguinte(anoMes: AnoMes): AnoMes {
  return somarMeses(anoMes, 1);
}

/**
 * Os `n` meses que terminam em `anoMes`, em ordem cronológica.
 * `ultimosMeses('2026-03', 3)` => ['2026-01', '2026-02', '2026-03'].
 */
export function ultimosMeses(anoMes: AnoMes, n: number): AnoMes[] {
  assertAnoMes(anoMes);
  if (!Number.isInteger(n) || n < 1) throw new Error(`n deve ser inteiro >= 1, recebido: ${String(n)}`);
  const meses: AnoMes[] = [];
  for (let i = n - 1; i >= 0; i--) meses.push(somarMeses(anoMes, -i));
  return meses;
}

/**
 * Os `n` meses ANTERIORES a `anoMes`, sem incluí-lo. Base das médias móveis
 * (a média dos 3 últimos meses não deve contar o mês corrente, que ainda
 * está incompleto).
 */
export function mesesAnteriores(anoMes: AnoMes, n: number): AnoMes[] {
  return ultimosMeses(mesAnterior(anoMes), n);
}

/**
 * Quantos meses de `de` até `ate`. Negativo quando `ate` é anterior.
 * `diferencaEmMeses('2026-01', '2026-04')` => 3.
 */
export function diferencaEmMeses(de: AnoMes, ate: AnoMes): number {
  assertAnoMes(de, 'de');
  assertAnoMes(ate, 'ate');
  return (anoDe(ate) - anoDe(de)) * 12 + (mesDe(ate) - mesDe(de));
}

/**
 * Meses decorridos de `de` até `ate`, contando os dois. Mínimo 1.
 * É a base do ritmo médio: um objetivo com um único aporte tem 1 mês de
 * histórico, não 0 — dividir por 0 não é opção.
 */
export function mesesDecorridos(de: AnoMes, ate: AnoMes): number {
  return Math.max(1, diferencaEmMeses(de, ate) + 1);
}

/** -1, 0 ou 1. ISO ordena lexicograficamente igual a cronologicamente. */
export function compararDatas(a: DataISO, b: DataISO): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function estaNoMes(data: DataISO, anoMes: AnoMes): boolean {
  return anoMesDe(data) === assertAnoMes(anoMes);
}

/** Intervalo fechado [inicio, fim] para BETWEEN em SQL. */
export function intervaloDoMes(anoMes: AnoMes): { inicio: DataISO; fim: DataISO } {
  return { inicio: primeiroDia(anoMes), fim: ultimoDia(anoMes) };
}

/** Dia da semana 0..6 (domingo = 0), calculado no calendário local. */
export function diaDaSemana(data: DataISO): number {
  return paraDate(data).getDay();
}

/** Formatação bruta com locale pt-BR. Prefira `lib/format.ts` na UI. */
export function formatarComPadrao(data: DataISO, padrao: string): string {
  return format(paraDate(data), padrao, { locale: ptBR });
}
