import { describe, expect, it } from 'vitest';
import {
  calcularProgresso,
  calcularProgressos,
  totalGuardado,
  type AporteBase,
  type ObjetivoBase,
} from '../src/services/progressoObjetivos';
import { diferencaEmMeses, mesesDecorridos } from '../src/lib/date';

const objetivo = (extras: Partial<ObjetivoBase> = {}): ObjetivoBase => ({
  id: 1,
  nome: 'Reserva de emergência',
  valorAlvo: 3_000_000, // R$ 30.000,00
  metaMensal: null,
  ativo: 1,
  ...extras,
});

const aporte = (data: string, valor: number, pago: 0 | 1 = 1, objetivoId: number | null = 1) =>
  ({ data, valor, pago, objetivoId }) as AporteBase;

describe('auxiliares de mês', () => {
  it('diferencaEmMeses conta na direção certa e cruza o ano', () => {
    expect(diferencaEmMeses('2026-01', '2026-04')).toBe(3);
    expect(diferencaEmMeses('2025-11', '2026-02')).toBe(3);
    expect(diferencaEmMeses('2026-04', '2026-01')).toBe(-3);
    expect(diferencaEmMeses('2026-04', '2026-04')).toBe(0);
  });

  it('mesesDecorridos conta os dois extremos e nunca devolve 0', () => {
    expect(mesesDecorridos('2026-04', '2026-04')).toBe(1);
    expect(mesesDecorridos('2026-01', '2026-04')).toBe(4);
    // Referência anterior ao início: o mínimo protege a divisão.
    expect(mesesDecorridos('2026-04', '2026-01')).toBe(1);
  });
});

describe('objetivo sem nenhum aporte', () => {
  const p = calcularProgresso(objetivo(), [], '2026-08');

  it('mostra zero guardado e o alvo inteiro em aberto', () => {
    expect(p.guardado).toBe(0);
    expect(p.programado).toBe(0);
    expect(p.restante).toBe(3_000_000);
    expect(p.percentual).toBe(0);
    expect(p.fracao).toBe(0);
    expect(p.concluido).toBe(false);
  });

  it('não inventa projeção sem ritmo — devolve null, não Infinity', () => {
    expect(p.ritmoMedio).toBeNull();
    expect(p.mesesParaConcluir).toBeNull();
    expect(p.previsaoConclusao).toBeNull();
    expect(p.mesesDeHistorico).toBe(0);
    expect(p.primeiroAporte).toBeNull();
  });
});

describe('guardado x programado', () => {
  it('só aporte pago conta como guardado', () => {
    const p = calcularProgresso(
      objetivo(),
      [aporte('2026-06-10', 50_000, 1), aporte('2026-08-10', 30_000, 0)],
      '2026-08',
    );

    expect(p.guardado).toBe(50_000);
    expect(p.programado).toBe(30_000);
    expect(p.restante).toBe(2_950_000);
  });

  it('ignora aportes de outro objetivo e aportes avulsos', () => {
    const p = calcularProgresso(
      objetivo({ id: 1 }),
      [aporte('2026-06-10', 50_000, 1, 1), aporte('2026-06-10', 90_000, 1, 2), aporte('2026-06-10', 70_000, 1, null)],
      '2026-08',
    );

    expect(p.guardado).toBe(50_000);
  });
});

describe('percentual e trilha', () => {
  it('percentual é inteiro', () => {
    const p = calcularProgresso(objetivo({ valorAlvo: 300_000 }), [aporte('2026-08-01', 100_000)], '2026-08');
    expect(p.percentual).toBe(33);
    expect(p.fracao).toBeCloseTo(1 / 3, 5);
  });

  it('alvo zero devolve percentual null em vez de NaN', () => {
    const p = calcularProgresso(objetivo({ valorAlvo: 0 }), [aporte('2026-08-01', 100_000)], '2026-08');

    expect(p.percentual).toBeNull();
    expect(p.fracao).toBe(0);
    expect(p.concluido).toBe(false);
  });

  it('passar do alvo grampeia a trilha em 1, mas o percentual mostra a verdade', () => {
    const p = calcularProgresso(
      objetivo({ valorAlvo: 100_000 }),
      [aporte('2026-08-01', 150_000)],
      '2026-08',
    );

    expect(p.percentual).toBe(150);
    expect(p.fracao).toBe(1);
    expect(p.restante).toBe(0);
    expect(p.concluido).toBe(true);
  });
});

describe('ritmo médio', () => {
  it('um único aporte no mês de referência: o ritmo é o próprio aporte', () => {
    const p = calcularProgresso(objetivo(), [aporte('2026-08-05', 50_000)], '2026-08');

    expect(p.mesesDeHistorico).toBe(1);
    expect(p.ritmoMedio).toBe(50_000);
  });

  it('divide pelos meses decorridos, contando os dois extremos', () => {
    const p = calcularProgresso(
      objetivo(),
      [aporte('2026-06-05', 50_000), aporte('2026-07-05', 50_000), aporte('2026-08-05', 50_000)],
      '2026-08',
    );

    expect(p.mesesDeHistorico).toBe(3);
    expect(p.guardado).toBe(150_000);
    expect(p.ritmoMedio).toBe(50_000);
  });

  it('conta os meses vazios: parar de aportar derruba o ritmo', () => {
    const aportes = [aporte('2026-06-05', 50_000), aporte('2026-07-05', 50_000)];

    expect(calcularProgresso(objetivo(), aportes, '2026-07').ritmoMedio).toBe(50_000);
    expect(calcularProgresso(objetivo(), aportes, '2026-09').ritmoMedio).toBe(25_000);
    expect(calcularProgresso(objetivo(), aportes, '2026-11').ritmoMedio).toBe(16_667);
  });

  it('o ritmo é sempre inteiro em centavos', () => {
    const p = calcularProgresso(
      objetivo(),
      [aporte('2026-06-05', 10_000), aporte('2026-08-05', 1)],
      '2026-08',
    );

    expect(Number.isSafeInteger(p.ritmoMedio)).toBe(true);
    expect(p.ritmoMedio).toBe(3334); // 10001 / 3, arredondado
  });

  it('referência anterior ao primeiro aporte não conta histórico', () => {
    const p = calcularProgresso(objetivo(), [aporte('2026-08-05', 50_000)], '2026-05');

    expect(p.mesesDeHistorico).toBe(0);
    expect(p.ritmoMedio).toBeNull();
    expect(p.previsaoConclusao).toBeNull();
  });
});

describe('projeção de conclusão', () => {
  it('estima os meses que faltam pelo ritmo e arredonda para cima', () => {
    // Guardado 150.000 em 3 meses => ritmo 50.000. Faltam 2.850.000 => 57 meses.
    const p = calcularProgresso(
      objetivo(),
      [aporte('2026-06-05', 50_000), aporte('2026-07-05', 50_000), aporte('2026-08-05', 50_000)],
      '2026-08',
    );

    expect(p.restante).toBe(2_850_000);
    expect(p.mesesParaConcluir).toBe(57);
    expect(p.previsaoConclusao).toBe('2031-05');
  });

  it('arredonda para cima mesmo faltando pouco', () => {
    const p = calcularProgresso(
      objetivo({ valorAlvo: 110_000 }),
      [aporte('2026-08-05', 100_000)],
      '2026-08',
    );

    // Faltam 10.000 num ritmo de 100.000: menos de um mês, mas conta como 1.
    expect(p.mesesParaConcluir).toBe(1);
    expect(p.previsaoConclusao).toBe('2026-09');
  });

  it('objetivo concluído projeta o próprio mês, não null', () => {
    const p = calcularProgresso(
      objetivo({ valorAlvo: 100_000 }),
      [aporte('2026-08-05', 100_000)],
      '2026-08',
    );

    expect(p.mesesParaConcluir).toBe(0);
    expect(p.previsaoConclusao).toBe('2026-08');
  });

  it('cruza a virada de ano', () => {
    const p = calcularProgresso(
      objetivo({ valorAlvo: 500_000 }),
      [aporte('2026-11-05', 100_000)],
      '2026-11',
    );

    expect(p.mesesParaConcluir).toBe(4);
    expect(p.previsaoConclusao).toBe('2027-03');
  });
});

describe('projeção pela meta declarada', () => {
  it('usa a meta mensal quando ela existe', () => {
    const p = calcularProgresso(
      objetivo({ valorAlvo: 1_000_000, metaMensal: 100_000 }),
      [aporte('2026-08-05', 200_000)],
      '2026-08',
    );

    expect(p.mesesPelaMeta).toBe(8);
    expect(p.previsaoPelaMeta).toBe('2027-04');
  });

  it('sem meta declarada, a projeção pela meta é null', () => {
    const p = calcularProgresso(objetivo({ metaMensal: null }), [aporte('2026-08-05', 50_000)], '2026-08');

    expect(p.mesesPelaMeta).toBeNull();
    expect(p.previsaoPelaMeta).toBeNull();
  });

  it('meta zero não vira divisão por zero', () => {
    const p = calcularProgresso(objetivo({ metaMensal: 0 }), [aporte('2026-08-05', 50_000)], '2026-08');

    expect(p.mesesPelaMeta).toBeNull();
    expect(p.previsaoPelaMeta).toBeNull();
  });

  it('as duas projeções convivem e podem divergir', () => {
    // Ritmo real 50.000/mês, meta declarada 100.000/mês.
    const p = calcularProgresso(
      objetivo({ valorAlvo: 1_050_000, metaMensal: 100_000 }),
      [aporte('2026-08-05', 50_000)],
      '2026-08',
    );

    expect(p.ritmoMedio).toBe(50_000);
    expect(p.mesesParaConcluir).toBe(20);
    expect(p.mesesPelaMeta).toBe(10);
  });
});

describe('lista de objetivos', () => {
  const objetivos = [
    objetivo({ id: 1, nome: 'Reserva', valorAlvo: 100_000 }),
    objetivo({ id: 2, nome: 'Viagem', valorAlvo: 100_000 }),
    objetivo({ id: 3, nome: 'Notebook', valorAlvo: 100_000 }),
  ];
  const aportes = [
    aporte('2026-08-01', 100_000, 1, 1), // concluído
    aporte('2026-08-01', 20_000, 1, 2),
    aporte('2026-08-01', 60_000, 1, 3),
  ];

  it('põe os em andamento primeiro, do mais adiantado ao menos', () => {
    const lista = calcularProgressos(objetivos, aportes, '2026-08');
    expect(lista.map((p) => p.objetivo.nome)).toEqual(['Notebook', 'Viagem', 'Reserva']);
  });

  it('calcula cada objetivo isoladamente', () => {
    const lista = calcularProgressos(objetivos, aportes, '2026-08');
    expect(lista.find((p) => p.objetivo.id === 2)?.guardado).toBe(20_000);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(calcularProgressos([], aportes, '2026-08')).toEqual([]);
  });
});

describe('totalGuardado', () => {
  it('soma todos os aportes pagos, inclusive os sem objetivo', () => {
    const total = totalGuardado([
      aporte('2026-08-01', 50_000, 1, 1),
      aporte('2026-08-01', 30_000, 1, null),
      aporte('2026-08-01', 90_000, 0, 1),
    ]);

    expect(total).toBe(80_000);
  });

  it('lista vazia soma zero', () => {
    expect(totalGuardado([])).toBe(0);
  });
});
