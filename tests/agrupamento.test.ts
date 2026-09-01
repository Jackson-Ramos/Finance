import { describe, expect, it } from 'vitest';
import { agruparPorDia, type LancamentoAgrupavel } from '../src/services/agrupamento';
import type { TipoLancamento } from '../src/types/dominio';

const l = (data: string, tipo: TipoLancamento, valor: number, id = 0) =>
  ({ data, tipo, valor, id }) as LancamentoAgrupavel & { id: number };

describe('agruparPorDia', () => {
  it('lista vazia devolve lista vazia', () => {
    expect(agruparPorDia([])).toEqual([]);
  });

  it('junta os lançamentos do mesmo dia num grupo só', () => {
    const grupos = agruparPorDia([
      l('2026-08-31', 'DESPESA', 1000),
      l('2026-08-31', 'DESPESA', 2000),
      l('2026-08-30', 'RECEITA', 5000),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].data).toBe('2026-08-31');
    expect(grupos[0].itens).toHaveLength(2);
    expect(grupos[1].data).toBe('2026-08-30');
  });

  it('ordena do dia mais recente para o mais antigo', () => {
    const grupos = agruparPorDia([
      l('2026-08-05', 'DESPESA', 100),
      l('2026-08-31', 'DESPESA', 100),
      l('2026-08-01', 'DESPESA', 100),
      l('2026-08-20', 'DESPESA', 100),
    ]);

    expect(grupos.map((g) => g.data)).toEqual([
      '2026-08-31',
      '2026-08-20',
      '2026-08-05',
      '2026-08-01',
    ]);
  });

  it('ordena certo cruzando a virada de ano', () => {
    const grupos = agruparPorDia([
      l('2025-12-31', 'DESPESA', 100),
      l('2026-01-01', 'DESPESA', 100),
      l('2025-12-01', 'DESPESA', 100),
    ]);

    expect(grupos.map((g) => g.data)).toEqual(['2026-01-01', '2025-12-31', '2025-12-01']);
  });

  it('preserva a ordem de entrada dentro do dia', () => {
    const grupos = agruparPorDia([
      l('2026-08-31', 'DESPESA', 100, 3),
      l('2026-08-31', 'DESPESA', 100, 2),
      l('2026-08-31', 'DESPESA', 100, 1),
    ]);

    expect((grupos[0].itens as { id: number }[]).map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it('não perde nenhum lançamento', () => {
    const entrada = [
      l('2026-08-31', 'DESPESA', 100),
      l('2026-08-30', 'RECEITA', 200),
      l('2026-08-30', 'APORTE', 300),
      l('2026-08-01', 'DESPESA', 400),
    ];
    const grupos = agruparPorDia(entrada);

    expect(grupos.reduce((n, g) => n + g.itens.length, 0)).toBe(entrada.length);
  });
});

describe('saldo do dia', () => {
  it('usa o sinal derivado do tipo', () => {
    const grupos = agruparPorDia([
      l('2026-08-31', 'RECEITA', 100_000),
      l('2026-08-31', 'DESPESA', 30_000),
      l('2026-08-31', 'APORTE', 20_000),
    ]);

    expect(grupos[0].saldoDoDia).toBe(50_000);
  });

  it('fica negativo num dia só de gasto', () => {
    const grupos = agruparPorDia([
      l('2026-08-31', 'DESPESA', 6235),
      l('2026-08-31', 'DESPESA', 1200),
    ]);

    expect(grupos[0].saldoDoDia).toBe(-7435);
  });

  it('a soma dos saldos diários é o saldo do período', () => {
    const grupos = agruparPorDia([
      l('2026-08-31', 'RECEITA', 750_000),
      l('2026-08-30', 'DESPESA', 180_000),
      l('2026-08-29', 'APORTE', 50_000),
    ]);

    expect(grupos.reduce((s, g) => s + g.saldoDoDia, 0)).toBe(520_000);
  });
});
