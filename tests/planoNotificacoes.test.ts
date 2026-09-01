import { describe, expect, it } from 'vitest';
import {
  identificadorDe,
  planejarNotificacoes,
  type LancamentoNotificavel,
} from '../src/services/planoNotificacoes';
import type { TipoLancamento } from '../src/types/dominio';

/** Terça, 25/08/2026, meio-dia no fuso do Brasil (fixado no vitest.config). */
const AGORA = new Date(2026, 7, 25, 12, 0, 0, 0);

const lanc = (
  id: number,
  data: string,
  extras: Partial<LancamentoNotificavel> = {},
): LancamentoNotificavel => ({
  id,
  data,
  descricao: `Lançamento ${id}`,
  valor: 18_000,
  tipo: 'DESPESA' as TipoLancamento,
  pago: 0,
  ...extras,
});

describe('o que entra no plano', () => {
  it('agenda um aviso por lançamento em aberto', () => {
    const plano = planejarNotificacoes([lanc(1, '2026-08-28'), lanc(2, '2026-09-05')], {
      agora: AGORA,
    });

    expect(plano).toHaveLength(2);
    expect(plano.map((n) => n.lancamentoId)).toEqual([1, 2]);
  });

  it('ignora o que já está pago', () => {
    const plano = planejarNotificacoes(
      [lanc(1, '2026-08-28', { pago: 1 }), lanc(2, '2026-08-29')],
      { agora: AGORA },
    );

    expect(plano.map((n) => n.lancamentoId)).toEqual([2]);
  });

  it('ignora vencimento no passado — não dá para agendar para trás', () => {
    const plano = planejarNotificacoes(
      [lanc(1, '2026-08-20'), lanc(2, '2026-08-24'), lanc(3, '2026-08-26')],
      { agora: AGORA },
    );

    expect(plano.map((n) => n.lancamentoId)).toEqual([3]);
  });

  it('ignora hoje quando a hora do aviso já passou', () => {
    // Aviso às 9h, e agora são 12h: o de hoje já era.
    const plano = planejarNotificacoes([lanc(1, '2026-08-25')], { agora: AGORA });
    expect(plano).toEqual([]);
  });

  it('inclui hoje quando a hora do aviso ainda vem', () => {
    const cedo = new Date(2026, 7, 25, 6, 0, 0, 0);
    const plano = planejarNotificacoes([lanc(1, '2026-08-25')], { agora: cedo });

    expect(plano).toHaveLength(1);
    expect(plano[0].quando.getHours()).toBe(9);
  });

  it('corta o que está além da janela', () => {
    const plano = planejarNotificacoes(
      [lanc(1, '2026-09-20'), lanc(2, '2026-12-20')],
      { agora: AGORA, janelaEmDias: 60 },
    );

    expect(plano.map((n) => n.lancamentoId)).toEqual([1]);
  });

  it('respeita uma janela mais curta', () => {
    const plano = planejarNotificacoes([lanc(1, '2026-08-28'), lanc(2, '2026-09-30')], {
      agora: AGORA,
      janelaEmDias: 7,
    });

    expect(plano.map((n) => n.lancamentoId)).toEqual([1]);
  });

  it('lista vazia devolve plano vazio', () => {
    expect(planejarNotificacoes([], { agora: AGORA })).toEqual([]);
  });
});

describe('instante do disparo', () => {
  it('usa a data de competência às 9h locais', () => {
    const [n] = planejarNotificacoes([lanc(1, '2026-08-28')], { agora: AGORA });

    expect(n.quando.getFullYear()).toBe(2026);
    expect(n.quando.getMonth()).toBe(7);
    expect(n.quando.getDate()).toBe(28);
    expect(n.quando.getHours()).toBe(9);
    expect(n.quando.getMinutes()).toBe(0);
  });

  it('aceita outra hora do aviso', () => {
    const [n] = planejarNotificacoes([lanc(1, '2026-08-28')], {
      agora: AGORA,
      horaDoAviso: 20,
    });

    expect(n.quando.getHours()).toBe(20);
  });

  it('não escorrega um dia por causa do fuso', () => {
    const [n] = planejarNotificacoes([lanc(1, '2026-09-01')], { agora: AGORA });
    expect(n.quando.getDate()).toBe(1);
    expect(n.quando.getMonth()).toBe(8);
  });

  it('devolve em ordem cronológica', () => {
    const plano = planejarNotificacoes(
      [lanc(3, '2026-09-10'), lanc(1, '2026-08-26'), lanc(2, '2026-09-01')],
      { agora: AGORA },
    );

    expect(plano.map((n) => n.lancamentoId)).toEqual([1, 2, 3]);
  });
});

describe('texto do aviso', () => {
  it('o título muda com o tipo', () => {
    const plano = planejarNotificacoes(
      [
        lanc(1, '2026-08-28', { tipo: 'DESPESA' }),
        lanc(2, '2026-08-28', { tipo: 'RECEITA' }),
        lanc(3, '2026-08-28', { tipo: 'APORTE' }),
      ],
      { agora: AGORA },
    );

    expect(plano.map((n) => n.titulo)).toEqual([
      'Conta vence hoje',
      'Entrada prevista para hoje',
      'Aporte programado para hoje',
    ]);
  });

  it('o corpo traz descrição e valor formatado em pt-BR', () => {
    const [n] = planejarNotificacoes(
      [lanc(1, '2026-08-28', { descricao: 'Aluguel', valor: 180_000 })],
      { agora: AGORA },
    );

    expect(n.corpo.replace(/\s/g, ' ')).toBe('Aluguel · R$ 1.800,00');
  });

  it('lançamento sem descrição não fica com corpo quebrado', () => {
    const semDescricao = planejarNotificacoes([lanc(1, '2026-08-28', { descricao: null })], {
      agora: AGORA,
    });
    const soEspacos = planejarNotificacoes([lanc(2, '2026-08-28', { descricao: '   ' })], {
      agora: AGORA,
    });

    expect(semDescricao[0].corpo.replace(/\s/g, ' ')).toBe('Lançamento · R$ 180,00');
    expect(soEspacos[0].corpo.replace(/\s/g, ' ')).toBe('Lançamento · R$ 180,00');
  });
});

describe('identificador', () => {
  it('é estável por lançamento — reagendar substitui, não soma', () => {
    expect(identificadorDe(42)).toBe('vencimento-42');

    const primeiro = planejarNotificacoes([lanc(42, '2026-08-28')], { agora: AGORA });
    const segundo = planejarNotificacoes([lanc(42, '2026-08-28')], { agora: AGORA });

    expect(primeiro[0].identificador).toBe(segundo[0].identificador);
  });

  it('é único entre lançamentos do mesmo dia', () => {
    const plano = planejarNotificacoes(
      [lanc(1, '2026-08-28'), lanc(2, '2026-08-28'), lanc(3, '2026-08-28')],
      { agora: AGORA },
    );

    expect(new Set(plano.map((n) => n.identificador)).size).toBe(3);
  });
});
