import { describe, expect, it } from 'vitest';
import {
  calcularResumoMes,
  fracaoRealizada,
  type LancamentoResumivel,
} from '../src/services/resumoMes';
import type { Natureza, TipoLancamento } from '../src/types/dominio';

const l = (
  tipo: TipoLancamento,
  valor: number,
  pago: 0 | 1 = 0,
  natureza: Natureza | null = null,
): LancamentoResumivel => ({ tipo, valor, pago, natureza });

describe('mês vazio', () => {
  it('zera tudo sem NaN e sem divisão por zero', () => {
    const r = calcularResumoMes([]);

    expect(r.previsto).toEqual({ receitas: 0, despesas: 0, aportes: 0, saldo: 0 });
    expect(r.realizado).toEqual({ receitas: 0, despesas: 0, aportes: 0, saldo: 0 });
    expect(r.aPagar).toBe(0);
    expect(r.aReceber).toBe(0);
    expect(r.contagem).toEqual({ total: 0, pagos: 0, pendentes: 0 });
  });
});

describe('previsto x realizado', () => {
  const lancamentos = [
    l('RECEITA', 750_000, 1),
    l('RECEITA', 120_000, 0), // freela ainda não caiu
    l('DESPESA', 180_000, 1, 'FIXA'),
    l('DESPESA', 62_350, 1, 'VARIAVEL'),
    l('DESPESA', 45_000, 0, 'FIXA'), // conta de luz a vencer
    l('APORTE', 50_000, 1),
    l('APORTE', 20_000, 0),
  ];

  it('previsto soma TODOS os lançamentos do mês', () => {
    const { previsto } = calcularResumoMes(lancamentos);

    expect(previsto.receitas).toBe(870_000);
    expect(previsto.despesas).toBe(287_350);
    expect(previsto.aportes).toBe(70_000);
    expect(previsto.saldo).toBe(870_000 - 287_350 - 70_000);
  });

  it('realizado soma só os que têm pago = 1', () => {
    const { realizado } = calcularResumoMes(lancamentos);

    expect(realizado.receitas).toBe(750_000);
    expect(realizado.despesas).toBe(242_350);
    expect(realizado.aportes).toBe(50_000);
    expect(realizado.saldo).toBe(750_000 - 242_350 - 50_000);
  });

  it('realizado nunca passa do previsto — é um subconjunto', () => {
    const r = calcularResumoMes(lancamentos);

    expect(r.realizado.receitas).toBeLessThanOrEqual(r.previsto.receitas);
    expect(r.realizado.despesas).toBeLessThanOrEqual(r.previsto.despesas);
    expect(r.realizado.aportes).toBeLessThanOrEqual(r.previsto.aportes);
  });

  it('com tudo pago, as duas visões coincidem', () => {
    const todosPagos = lancamentos.map((x) => ({ ...x, pago: 1 }));
    const r = calcularResumoMes(todosPagos);

    expect(r.realizado).toEqual(r.previsto);
    expect(r.aPagar).toBe(0);
    expect(r.aReceber).toBe(0);
  });

  it('com nada pago, realizado é zero mas previsto continua cheio', () => {
    const nenhumPago = lancamentos.map((x) => ({ ...x, pago: 0 }));
    const r = calcularResumoMes(nenhumPago);

    expect(r.realizado).toEqual({ receitas: 0, despesas: 0, aportes: 0, saldo: 0 });
    expect(r.previsto.receitas).toBe(870_000);
  });
});

describe('saldo', () => {
  it('aporte SAI do caixa, igual a despesa', () => {
    const r = calcularResumoMes([l('RECEITA', 100_000, 1), l('APORTE', 30_000, 1)]);
    expect(r.previsto.saldo).toBe(70_000);
  });

  it('fica negativo quando as saídas passam as entradas', () => {
    const r = calcularResumoMes([l('RECEITA', 100_000, 1), l('DESPESA', 150_000, 1)]);
    expect(r.previsto.saldo).toBe(-50_000);
  });

  it('o saldo é sempre inteiro em centavos', () => {
    const r = calcularResumoMes([l('RECEITA', 33_333, 1), l('DESPESA', 11_111, 1)]);
    expect(Number.isSafeInteger(r.previsto.saldo)).toBe(true);
    expect(r.previsto.saldo).toBe(22_222);
  });
});

describe('despesas por natureza', () => {
  const lancamentos = [
    l('DESPESA', 180_000, 1, 'FIXA'),
    l('DESPESA', 45_000, 0, 'FIXA'),
    l('DESPESA', 62_350, 1, 'VARIAVEL'),
    l('DESPESA', 10_000, 0, null), // sem natureza definida
    l('RECEITA', 500_000, 1, 'FIXA'), // receita fixa não conta como despesa fixa
  ];

  it('separa fixas de variáveis nas duas visões', () => {
    const r = calcularResumoMes(lancamentos);

    expect(r.despesasFixas).toEqual({ previsto: 225_000, realizado: 180_000 });
    expect(r.despesasVariaveis).toEqual({ previsto: 72_350, realizado: 62_350 });
  });

  it('despesa sem natureza cai em variável, não some da conta', () => {
    const r = calcularResumoMes(lancamentos);
    expect(r.despesasFixas.previsto + r.despesasVariaveis.previsto).toBe(r.previsto.despesas);
  });
});

describe('pendências', () => {
  it('aPagar junta despesas e aportes não pagos; aReceber, as receitas', () => {
    const r = calcularResumoMes([
      l('DESPESA', 45_000, 0),
      l('APORTE', 20_000, 0),
      l('RECEITA', 120_000, 0),
      l('DESPESA', 999, 1), // já pago, fora da conta
    ]);

    expect(r.aPagar).toBe(65_000);
    expect(r.aReceber).toBe(120_000);
    expect(r.contagem).toEqual({ total: 4, pagos: 1, pendentes: 3 });
  });
});

describe('fracaoRealizada (trilha dupla)', () => {
  it('devolve a fração preenchida', () => {
    expect(fracaoRealizada({ previsto: 100_000, realizado: 25_000 })).toBe(0.25);
    expect(fracaoRealizada({ previsto: 100_000, realizado: 100_000 })).toBe(1);
    expect(fracaoRealizada({ previsto: 100_000, realizado: 0 })).toBe(0);
  });

  it('previsto zero devolve 0, não NaN nem Infinity', () => {
    expect(fracaoRealizada({ previsto: 0, realizado: 0 })).toBe(0);
    expect(fracaoRealizada({ previsto: 0, realizado: 5000 })).toBe(0);
  });

  it('grampeia em 1 mesmo em dado inconsistente', () => {
    expect(fracaoRealizada({ previsto: 100, realizado: 500 })).toBe(1);
  });
});

describe('os totais batem', () => {
  it('previsto = realizado + pendente, tipo a tipo', () => {
    const lancamentos = [
      l('RECEITA', 750_000, 1),
      l('RECEITA', 120_000, 0),
      l('DESPESA', 180_000, 1, 'FIXA'),
      l('DESPESA', 45_000, 0, 'FIXA'),
      l('APORTE', 50_000, 1),
      l('APORTE', 20_000, 0),
    ];
    const r = calcularResumoMes(lancamentos);

    expect(r.previsto.receitas - r.realizado.receitas).toBe(r.aReceber);
    expect(
      r.previsto.despesas + r.previsto.aportes - (r.realizado.despesas + r.realizado.aportes),
    ).toBe(r.aPagar);
    expect(r.contagem.pagos + r.contagem.pendentes).toBe(r.contagem.total);
  });
});
