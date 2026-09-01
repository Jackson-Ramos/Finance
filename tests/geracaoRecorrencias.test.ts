import { describe, expect, it } from 'vitest';
import {
  planejarGeracao,
  type LancamentoPlanejado,
  type RecorrenciaGeravel,
} from '../src/services/geracaoRecorrencias';
import { ehDataISO } from '../src/lib/date';

const rec = (
  id: number,
  diaDoMes: number,
  extras: Partial<RecorrenciaGeravel> = {},
): RecorrenciaGeravel => ({
  id,
  descricao: `Recorrência ${id}`,
  valorPrevisto: 100_000,
  diaDoMes,
  tipo: 'DESPESA',
  natureza: 'FIXA',
  categoriaId: null,
  ativo: 1,
  ...extras,
});

/** Simula o ciclo real: planeja, "grava", e devolve os ids agora existentes. */
function aplicar(
  recorrencias: readonly RecorrenciaGeravel[],
  jaGerados: readonly number[],
  anoMes: string,
): { criados: LancamentoPlanejado[]; idsDepois: number[] } {
  const plano = planejarGeracao(recorrencias, jaGerados, anoMes);
  return {
    criados: plano.aCriar,
    idsDepois: [...jaGerados, ...plano.aCriar.map((l) => l.recorrenciaId)],
  };
}

describe('geração básica', () => {
  it('cria um lançamento por recorrência ativa, sempre em aberto', () => {
    const plano = planejarGeracao([rec(1, 5), rec(2, 10)], [], '2026-08');

    expect(plano.aCriar).toHaveLength(2);
    expect(plano.aCriar.map((l) => l.data)).toEqual(['2026-08-05', '2026-08-10']);
    expect(plano.aCriar.every((l) => l.pago === false)).toBe(true);
    expect(plano.aCriar.map((l) => l.recorrenciaId)).toEqual([1, 2]);
  });

  it('copia valor, tipo, natureza e categoria da recorrência', () => {
    const plano = planejarGeracao(
      [
        rec(1, 5, {
          descricao: 'Aluguel',
          valorPrevisto: 180_000,
          tipo: 'DESPESA',
          natureza: 'FIXA',
          categoriaId: 7,
        }),
      ],
      [],
      '2026-08',
    );

    expect(plano.aCriar[0]).toEqual({
      data: '2026-08-05',
      descricao: 'Aluguel',
      valor: 180_000,
      tipo: 'DESPESA',
      natureza: 'FIXA',
      categoriaId: 7,
      recorrenciaId: 1,
      pago: false,
    });
  });

  it('lista vazia não gera nada', () => {
    expect(planejarGeracao([], [], '2026-08').aCriar).toEqual([]);
  });

  it('ignora recorrência inativa', () => {
    const plano = planejarGeracao([rec(1, 5), rec(2, 10, { ativo: 0 })], [], '2026-08');

    expect(plano.aCriar.map((l) => l.recorrenciaId)).toEqual([1]);
    expect(plano.ignoradas).toContainEqual({ recorrenciaId: 2, motivo: 'inativa' });
  });

  it('trata ativo nulo como inativo', () => {
    const plano = planejarGeracao([rec(1, 5, { ativo: null })], [], '2026-08');
    expect(plano.aCriar).toEqual([]);
  });
});

describe('idempotência', () => {
  it('rodar dez vezes gera exatamente uma vez cada recorrência', () => {
    const recorrencias = [rec(1, 5), rec(2, 15), rec(3, 28)];
    let ids: number[] = [];
    let totalCriado = 0;

    for (let i = 0; i < 10; i++) {
      const r = aplicar(recorrencias, ids, '2026-08');
      totalCriado += r.criados.length;
      ids = r.idsDepois;
    }

    expect(totalCriado).toBe(3);
    expect(ids.sort()).toEqual([1, 2, 3]);
  });

  it('a segunda passada não cria nada e explica por quê', () => {
    const recorrencias = [rec(1, 5), rec(2, 15)];
    const primeira = aplicar(recorrencias, [], '2026-08');
    const segunda = planejarGeracao(recorrencias, primeira.idsDepois, '2026-08');

    expect(segunda.aCriar).toEqual([]);
    expect(segunda.ignoradas).toEqual([
      { recorrenciaId: 1, motivo: 'ja_gerada' },
      { recorrenciaId: 2, motivo: 'ja_gerada' },
    ]);
  });

  it('não duplica se a mesma recorrência vier duas vezes na entrada', () => {
    const plano = planejarGeracao([rec(1, 5), rec(1, 5)], [], '2026-08');

    expect(plano.aCriar).toHaveLength(1);
    expect(plano.ignoradas).toContainEqual({
      recorrenciaId: 1,
      motivo: 'duplicada_na_entrada',
    });
  });

  it('uma recorrência nova entra sem mexer nas que já foram geradas', () => {
    const plano = planejarGeracao([rec(1, 5), rec(2, 15), rec(3, 20)], [1, 2], '2026-08');

    expect(plano.aCriar.map((l) => l.recorrenciaId)).toEqual([3]);
  });

  it('cada mês é uma conta separada', () => {
    const recorrencias = [rec(1, 5)];

    expect(planejarGeracao(recorrencias, [1], '2026-08').aCriar).toEqual([]);
    expect(planejarGeracao(recorrencias, [], '2026-09').aCriar).toHaveLength(1);
    expect(planejarGeracao(recorrencias, [], '2026-09').aCriar[0].data).toBe('2026-09-05');
  });
});

describe('virada de mês — dia que não existe', () => {
  it('dia 31 vira o último dia em fevereiro comum', () => {
    const plano = planejarGeracao([rec(1, 31)], [], '2026-02');
    expect(plano.aCriar[0].data).toBe('2026-02-28');
  });

  it('dia 31 vira 29 em fevereiro bissexto', () => {
    const plano = planejarGeracao([rec(1, 31)], [], '2024-02');
    expect(plano.aCriar[0].data).toBe('2024-02-29');
  });

  it('dia 31 vira 30 nos meses de 30 dias', () => {
    for (const mes of ['2026-04', '2026-06', '2026-09', '2026-11']) {
      expect(planejarGeracao([rec(1, 31)], [], mes).aCriar[0].data).toBe(`${mes}-30`);
    }
  });

  it('dia 31 fica no dia 31 nos meses que têm', () => {
    for (const mes of ['2026-01', '2026-03', '2026-05', '2026-07', '2026-08']) {
      expect(planejarGeracao([rec(1, 31)], [], mes).aCriar[0].data).toBe(`${mes}-31`);
    }
  });

  it('dia 29 e 30 também são grampeados em fevereiro comum', () => {
    expect(planejarGeracao([rec(1, 29)], [], '2026-02').aCriar[0].data).toBe('2026-02-28');
    expect(planejarGeracao([rec(1, 30)], [], '2026-02').aCriar[0].data).toBe('2026-02-28');
  });

  it('o dia 1 nunca é afetado', () => {
    for (const mes of ['2026-01', '2026-02', '2024-02', '2026-04', '2026-12']) {
      expect(planejarGeracao([rec(1, 1)], [], mes).aCriar[0].data).toBe(`${mes}-01`);
    }
  });

  it('a data gerada existe no calendário e cai no mês pedido — todo dia, todo mês', () => {
    for (let ano = 2024; ano <= 2027; ano++) {
      for (let mes = 1; mes <= 12; mes++) {
        const anoMes = `${ano}-${String(mes).padStart(2, '0')}`;
        for (let dia = 1; dia <= 31; dia++) {
          const gerado = planejarGeracao([rec(1, dia)], [], anoMes).aCriar[0].data;
          expect(ehDataISO(gerado), gerado).toBe(true);
          expect(gerado.slice(0, 7)).toBe(anoMes);
        }
      }
    }
  });

  it('grampear não muda o dia_do_mes da recorrência: em março ele volta ao 31', () => {
    const recorrencia = rec(1, 31);

    expect(planejarGeracao([recorrencia], [], '2026-01').aCriar[0].data).toBe('2026-01-31');
    expect(planejarGeracao([recorrencia], [], '2026-02').aCriar[0].data).toBe('2026-02-28');
    expect(planejarGeracao([recorrencia], [], '2026-03').aCriar[0].data).toBe('2026-03-31');
  });
});

describe('doze meses seguidos', () => {
  it('gera exatamente um lançamento por mês, sem duplicar e sem pular', () => {
    const recorrencias = [rec(1, 31), rec(2, 5)];
    const meses = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    const datas: string[] = [];

    for (const mes of meses) {
      // Cada mês começa do zero: nada foi gerado ainda naquele ano-mês.
      const plano = planejarGeracao(recorrencias, [], mes);
      expect(plano.aCriar).toHaveLength(2);
      datas.push(...plano.aCriar.map((l) => l.data));
    }

    expect(datas).toHaveLength(24);
    expect(new Set(datas).size).toBe(24);
    expect(datas).toContain('2026-02-28');
    expect(datas).toContain('2026-04-30');
    expect(datas).toContain('2026-12-31');
  });
});
