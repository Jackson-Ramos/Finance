/**
 * Resumo do mês: PREVISTO x REALIZADO.
 *
 * Definição do spec, literal:
 * - previsto  = soma de TODOS os lançamentos do mês
 * - realizado = soma só dos que têm pago = 1
 *
 * Como realizado é um subconjunto de previsto, realizado <= previsto sempre.
 * É isso que faz a trilha dupla da UI nunca estourar.
 *
 * Serviço PURO: recebe array, devolve números. Não importa repository, não
 * importa `expo-sqlite`, roda inteiro no Vitest.
 */

import { comSinal, somar, type Centavos } from '../lib/money';
import type { Natureza, TipoLancamento } from '../types/dominio';

/**
 * A forma mínima de que o cálculo precisa. Estrutural de propósito: qualquer
 * linha do banco serve, e o teste pode montar objetos à mão.
 */
export interface LancamentoResumivel {
  valor: Centavos;
  tipo: TipoLancamento;
  natureza: Natureza | null;
  /** 0 ou 1, como está no banco. */
  pago: number;
}

export interface Totais {
  receitas: Centavos;
  despesas: Centavos;
  aportes: Centavos;
  /** receitas − despesas − aportes. Pode ser negativo. */
  saldo: Centavos;
}

export interface ParPrevistoRealizado {
  previsto: Centavos;
  realizado: Centavos;
}

export interface ResumoMes {
  previsto: Totais;
  realizado: Totais;
  /** Despesas quebradas por natureza — insumo de `comprometimento_fixas`. */
  despesasFixas: ParPrevistoRealizado;
  despesasVariaveis: ParPrevistoRealizado;
  /** Quanto ainda vai sair do caixa (despesas + aportes não pagos). */
  aPagar: Centavos;
  /** Quanto ainda vai entrar (receitas não recebidas). */
  aReceber: Centavos;
  contagem: { total: number; pagos: number; pendentes: number };
}

const estaPago = (l: LancamentoResumivel): boolean => l.pago === 1;

function totalizar(itens: readonly LancamentoResumivel[]): Totais {
  const porTipo = (tipo: TipoLancamento) =>
    somar(itens.filter((l) => l.tipo === tipo).map((l) => l.valor));

  const receitas = porTipo('RECEITA');
  const despesas = porTipo('DESPESA');
  const aportes = porTipo('APORTE');

  // O saldo usa o sinal derivado do tipo — o banco nunca guarda sinal.
  return {
    receitas,
    despesas,
    aportes,
    saldo:
      comSinal(receitas, 'RECEITA') + comSinal(despesas, 'DESPESA') + comSinal(aportes, 'APORTE'),
  };
}

function somarSe(
  itens: readonly LancamentoResumivel[],
  filtro: (l: LancamentoResumivel) => boolean,
): Centavos {
  return somar(itens.filter(filtro).map((l) => l.valor));
}

export function calcularResumoMes(lancamentos: readonly LancamentoResumivel[]): ResumoMes {
  const pagos = lancamentos.filter(estaPago);
  const pendentes = lancamentos.filter((l) => !estaPago(l));

  const ehDespesaFixa = (l: LancamentoResumivel) => l.tipo === 'DESPESA' && l.natureza === 'FIXA';
  const ehDespesaVariavel = (l: LancamentoResumivel) =>
    l.tipo === 'DESPESA' && l.natureza !== 'FIXA';

  return {
    previsto: totalizar(lancamentos),
    realizado: totalizar(pagos),
    despesasFixas: {
      previsto: somarSe(lancamentos, ehDespesaFixa),
      realizado: somarSe(pagos, ehDespesaFixa),
    },
    despesasVariaveis: {
      previsto: somarSe(lancamentos, ehDespesaVariavel),
      realizado: somarSe(pagos, ehDespesaVariavel),
    },
    aPagar: somarSe(pendentes, (l) => l.tipo === 'DESPESA' || l.tipo === 'APORTE'),
    aReceber: somarSe(pendentes, (l) => l.tipo === 'RECEITA'),
    contagem: {
      total: lancamentos.length,
      pagos: pagos.length,
      pendentes: pendentes.length,
    },
  };
}

/**
 * Fração realizada de um par previsto/realizado, em 0..1, para a trilha dupla.
 * Previsto zero devolve 0 — trilha vazia, sem divisão por zero.
 */
export function fracaoRealizada(par: ParPrevistoRealizado): number {
  if (par.previsto <= 0) return 0;
  return Math.min(1, par.realizado / par.previsto);
}
