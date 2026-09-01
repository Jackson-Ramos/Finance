import { describe, expect, it } from 'vitest';
import {
  calcularIndicadores,
  distribuicaoPorCategoria,
  divisaoCasaPessoal,
  serieHistorica,
  situacaoDividas,
  situacaoFixas,
  situacaoPoupanca,
  situacaoReserva,
  totalGuardado,
  type CategoriaSaude,
  type LancamentoSaude,
} from '../src/services/saudeFinanceira';
import type { Natureza, TipoLancamento } from '../src/types/dominio';

const l = (
  data: string,
  tipo: TipoLancamento,
  valor: number,
  extras: Partial<LancamentoSaude> = {},
): LancamentoSaude => ({
  data,
  tipo,
  valor,
  natureza: null,
  categoriaId: null,
  pago: 1,
  ...extras,
});

const fixa = (data: string, valor: number, extras: Partial<LancamentoSaude> = {}) =>
  l(data, 'DESPESA', valor, { natureza: 'FIXA' as Natureza, ...extras });

const CATEGORIAS: CategoriaSaude[] = [
  { id: 1, nome: 'Moradia', cor: '#0EA5E9', icone: '🏠', grupo: 'CASA', divida: 0 },
  { id: 2, nome: 'Mercado', cor: '#0284C7', icone: '🛒', grupo: 'CASA', divida: 0 },
  { id: 3, nome: 'Lazer', cor: '#EC4899', icone: '🎬', grupo: 'PESSOAL', divida: 0 },
  { id: 4, nome: 'Empréstimo', cor: '#DC2626', icone: '📉', grupo: 'PESSOAL', divida: 1 },
  { id: 5, nome: 'Financiamento', cor: '#B91C1C', icone: '🏦', grupo: 'CASA', divida: 1 },
  { id: 9, nome: 'Salário', cor: '#16A34A', icone: '💼', grupo: null, divida: 0 },
];

const entrada = (anoMes: string, lancamentos: LancamentoSaude[]) => ({
  anoMes,
  lancamentos,
  categorias: CATEGORIAS,
  aportesAcumulados: lancamentos,
});

describe('mês sem nada', () => {
  const i = calcularIndicadores(entrada('2026-08', []));

  it('devolve null em todo percentual em vez de NaN', () => {
    expect(i.comprometimentoFixas).toBeNull();
    expect(i.comprometimentoDividas).toBeNull();
    expect(i.taxaPoupanca).toBeNull();
    expect(i.reservaEmMeses).toBeNull();
    expect(i.mediaMovelReceita).toBeNull();
    expect(i.mediaFixasTresMeses).toBeNull();
  });

  it('os valores em centavos ficam zerados, não nulos', () => {
    expect(i.receitasDoMes).toBe(0);
    expect(i.despesasFixasDoMes).toBe(0);
    expect(i.totalGuardado).toBe(0);
    expect(i.mesesComHistorico).toBe(0);
  });
});

describe('receita zero com despesa lançada', () => {
  it('não vira Infinity — o denominador é a receita', () => {
    const i = calcularIndicadores(entrada('2026-08', [fixa('2026-08-05', 180_000)]));

    expect(i.despesasFixasDoMes).toBe(180_000);
    expect(i.comprometimentoFixas).toBeNull();
    expect(Number.isFinite(i.comprometimentoFixas as number)).toBe(false);
  });
});

describe('comprometimento com fixas', () => {
  it('divide despesa FIXA do mês pela receita do mês', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000),
        fixa('2026-08-10', 300_000),
        l('2026-08-12', 'DESPESA', 200_000, { natureza: 'VARIAVEL' }),
      ]),
    );

    // 300.000 / 1.000.000 = 30%. A variável não entra.
    expect(i.comprometimentoFixas).toBe(30);
  });

  it('soma todas as receitas do mês no denominador', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 600_000),
        l('2026-08-20', 'RECEITA', 400_000),
        fixa('2026-08-10', 500_000),
      ]),
    );

    expect(i.receitasDoMes).toBe(1_000_000);
    expect(i.comprometimentoFixas).toBe(50);
  });

  it('conta lançamento não pago — "do mês" é o previsto', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000, { pago: 0 }),
        fixa('2026-08-10', 250_000, { pago: 0 }),
      ]),
    );

    expect(i.comprometimentoFixas).toBe(25);
  });

  it('ignora meses vizinhos', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000),
        fixa('2026-07-31', 900_000),
        fixa('2026-09-01', 900_000),
        fixa('2026-08-10', 100_000),
      ]),
    );

    expect(i.comprometimentoFixas).toBe(10);
  });
});

describe('comprometimento com dívidas', () => {
  it('conta só despesas de categoria marcada como dívida', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000),
        l('2026-08-10', 'DESPESA', 150_000, { categoriaId: 4 }), // Empréstimo
        l('2026-08-11', 'DESPESA', 50_000, { categoriaId: 5 }), // Financiamento
        l('2026-08-12', 'DESPESA', 400_000, { categoriaId: 2 }), // Mercado
        l('2026-08-13', 'DESPESA', 100_000, { categoriaId: null }),
      ]),
    );

    expect(i.despesasDeDividaDoMes).toBe(200_000);
    expect(i.comprometimentoDividas).toBe(20);
  });

  it('é zero, não null, quando há receita e nenhuma dívida', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000),
        l('2026-08-10', 'DESPESA', 400_000, { categoriaId: 2 }),
      ]),
    );

    expect(i.comprometimentoDividas).toBe(0);
  });

  it('receita marcada em categoria de dívida não entra — só despesa conta', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000, { categoriaId: 4 }),
        l('2026-08-10', 'DESPESA', 100_000, { categoriaId: 4 }),
      ]),
    );

    expect(i.despesasDeDividaDoMes).toBe(100_000);
    expect(i.comprometimentoDividas).toBe(10);
  });
});

describe('taxa de poupança', () => {
  it('divide os aportes do mês pela receita do mês', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-08-05', 'RECEITA', 1_000_000),
        l('2026-08-06', 'APORTE', 150_000),
      ]),
    );

    expect(i.taxaPoupanca).toBe(15);
  });

  it('arredonda para inteiro', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [l('2026-08-05', 'RECEITA', 300_000), l('2026-08-06', 'APORTE', 100_000)]),
    );

    expect(i.taxaPoupanca).toBe(33);
  });

  it('pode passar de 100% num mês de receita baixa', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [l('2026-08-05', 'RECEITA', 100_000), l('2026-08-06', 'APORTE', 200_000)]),
    );

    expect(i.taxaPoupanca).toBe(200);
  });
});

describe('médias móveis de 3 meses', () => {
  const historico = [
    l('2026-05-05', 'RECEITA', 600_000),
    l('2026-06-05', 'RECEITA', 900_000),
    l('2026-07-05', 'RECEITA', 300_000),
    l('2026-08-05', 'RECEITA', 9_999_999), // mês corrente: NÃO entra
    fixa('2026-05-10', 200_000),
    fixa('2026-06-10', 200_000),
    fixa('2026-07-10', 200_000),
  ];

  it('usa os três meses ANTERIORES, sem o mês corrente', () => {
    const i = calcularIndicadores(entrada('2026-08', historico));

    expect(i.janela).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(i.mediaMovelReceita).toBe(600_000); // (600 + 900 + 300) / 3
  });

  it('conta mês vazio como zero, e informa quantos têm dado', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [l('2026-07-05', 'RECEITA', 900_000), l('2026-08-05', 'RECEITA', 100_000)]),
    );

    expect(i.mediaMovelReceita).toBe(300_000); // 900 / 3
    expect(i.mesesComHistorico).toBe(1);
  });

  it('cruza a virada de ano', () => {
    const i = calcularIndicadores(
      entrada('2026-01', [
        l('2025-10-05', 'RECEITA', 300_000),
        l('2025-11-05', 'RECEITA', 300_000),
        l('2025-12-05', 'RECEITA', 300_000),
      ]),
    );

    expect(i.janela).toEqual(['2025-10', '2025-11', '2025-12']);
    expect(i.mediaMovelReceita).toBe(300_000);
  });

  it('a média é inteira em centavos', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        l('2026-05-05', 'RECEITA', 1),
        l('2026-06-05', 'RECEITA', 1),
        l('2026-07-05', 'RECEITA', 1),
      ]),
    );

    expect(Number.isSafeInteger(i.mediaMovelReceita)).toBe(true);
    expect(i.mediaMovelReceita).toBe(1); // 3/3
  });
});

describe('reserva em meses', () => {
  it('divide o guardado pela média de despesa fixa dos 3 meses anteriores', () => {
    const lancamentos = [
      fixa('2026-05-10', 200_000),
      fixa('2026-06-10', 200_000),
      fixa('2026-07-10', 200_000),
      l('2026-06-15', 'APORTE', 600_000, { pago: 1 }),
    ];
    const i = calcularIndicadores(entrada('2026-08', lancamentos));

    expect(i.mediaFixasTresMeses).toBe(200_000);
    expect(i.totalGuardado).toBe(600_000);
    expect(i.reservaEmMeses).toBe(3);
  });

  it('tem exatamente uma casa decimal, sem lixo de ponto flutuante', () => {
    const lancamentos = [
      fixa('2026-05-10', 300_000),
      fixa('2026-06-10', 300_000),
      fixa('2026-07-10', 300_000),
      l('2026-06-15', 'APORTE', 100_000, { pago: 1 }),
    ];
    const i = calcularIndicadores(entrada('2026-08', lancamentos));

    // 100.000 / 300.000 = 0,333... => 0,3
    expect(i.reservaEmMeses).toBe(0.3);
  });

  it('só conta aporte pago — o guardado é estoque, não intenção', () => {
    const lancamentos = [
      fixa('2026-05-10', 100_000),
      fixa('2026-06-10', 100_000),
      fixa('2026-07-10', 100_000),
      l('2026-06-15', 'APORTE', 500_000, { pago: 1 }),
      l('2026-07-15', 'APORTE', 900_000, { pago: 0 }),
    ];
    const i = calcularIndicadores(entrada('2026-08', lancamentos));

    expect(i.totalGuardado).toBe(500_000);
    expect(i.reservaEmMeses).toBe(5);
  });

  it('sem histórico de despesa fixa devolve null, não Infinity', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [l('2026-06-15', 'APORTE', 500_000, { pago: 1 })]),
    );

    expect(i.mediaFixasTresMeses).toBe(0);
    expect(i.reservaEmMeses).toBeNull();
  });

  it('guardado zero com histórico devolve 0, não null', () => {
    const i = calcularIndicadores(
      entrada('2026-08', [
        fixa('2026-05-10', 100_000),
        fixa('2026-06-10', 100_000),
        fixa('2026-07-10', 100_000),
      ]),
    );

    expect(i.reservaEmMeses).toBe(0);
  });
});

describe('situações', () => {
  it('comprometimento com fixas piora conforme sobe', () => {
    expect(situacaoFixas(null)).toBe('indefinido');
    expect(situacaoFixas(0)).toBe('bom');
    expect(situacaoFixas(30)).toBe('bom');
    expect(situacaoFixas(31)).toBe('atencao');
    expect(situacaoFixas(50)).toBe('atencao');
    expect(situacaoFixas(51)).toBe('ruim');
  });

  it('dívidas têm faixa mais apertada', () => {
    expect(situacaoDividas(10)).toBe('bom');
    expect(situacaoDividas(11)).toBe('atencao');
    expect(situacaoDividas(31)).toBe('ruim');
  });

  it('poupança e reserva são invertidas — quanto maior, melhor', () => {
    expect(situacaoPoupanca(20)).toBe('bom');
    expect(situacaoPoupanca(15)).toBe('atencao');
    expect(situacaoPoupanca(5)).toBe('ruim');

    expect(situacaoReserva(6)).toBe('bom');
    expect(situacaoReserva(4)).toBe('atencao');
    expect(situacaoReserva(1)).toBe('ruim');
    expect(situacaoReserva(null)).toBe('indefinido');
  });
});

describe('série histórica', () => {
  it('devolve um ponto por mês pedido, na ordem pedida', () => {
    const serie = serieHistorica(
      [l('2026-07-05', 'RECEITA', 100_000), l('2026-08-05', 'DESPESA', 40_000)],
      ['2026-06', '2026-07', '2026-08'],
    );

    expect(serie.map((p) => p.anoMes)).toEqual(['2026-06', '2026-07', '2026-08']);
  });

  it('mês sem lançamento vira zero, não some da série', () => {
    const serie = serieHistorica([l('2026-08-05', 'RECEITA', 100_000)], ['2026-06', '2026-08']);

    expect(serie[0]).toEqual({
      anoMes: '2026-06',
      receitas: 0,
      despesas: 0,
      aportes: 0,
      saldo: 0,
    });
  });

  it('o saldo desconta despesas e aportes', () => {
    const serie = serieHistorica(
      [
        l('2026-08-05', 'RECEITA', 500_000),
        l('2026-08-10', 'DESPESA', 200_000),
        l('2026-08-15', 'APORTE', 100_000),
      ],
      ['2026-08'],
    );

    expect(serie[0].saldo).toBe(200_000);
  });

  it('o saldo pode ser negativo', () => {
    const serie = serieHistorica(
      [l('2026-08-05', 'RECEITA', 100_000), l('2026-08-10', 'DESPESA', 300_000)],
      ['2026-08'],
    );

    expect(serie[0].saldo).toBe(-200_000);
  });

  it('doze meses continuam doze pontos mesmo sem dado nenhum', () => {
    const meses = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
    expect(serieHistorica([], meses)).toHaveLength(12);
  });
});

describe('distribuição por categoria', () => {
  const lancamentos = [
    l('2026-08-01', 'DESPESA', 500_000, { categoriaId: 1 }),
    l('2026-08-02', 'DESPESA', 300_000, { categoriaId: 2 }),
    l('2026-08-03', 'DESPESA', 200_000, { categoriaId: 3 }),
    l('2026-08-04', 'RECEITA', 900_000, { categoriaId: 9 }),
    l('2026-07-04', 'DESPESA', 900_000, { categoriaId: 1 }),
  ];

  it('só considera despesa do mês pedido', () => {
    const fatias = distribuicaoPorCategoria(lancamentos, '2026-08', CATEGORIAS);

    expect(fatias.map((f) => f.nome)).toEqual(['Moradia', 'Mercado', 'Lazer']);
    expect(fatias.map((f) => f.valor)).toEqual([500_000, 300_000, 200_000]);
  });

  it('o percentual é sobre o total de despesa e soma ~100', () => {
    const fatias = distribuicaoPorCategoria(lancamentos, '2026-08', CATEGORIAS);

    expect(fatias.map((f) => f.percentual)).toEqual([50, 30, 20]);
  });

  it('a fração é relativa à maior fatia, que sempre vale 1', () => {
    const fatias = distribuicaoPorCategoria(lancamentos, '2026-08', CATEGORIAS);

    expect(fatias[0].fracaoDoMaior).toBe(1);
    expect(fatias[1].fracaoDoMaior).toBeCloseTo(0.6, 5);
  });

  it('agrega o excedente em "Outras" em vez de inventar cor', () => {
    const muitas = Array.from({ length: 10 }, (_, i) =>
      l('2026-08-01', 'DESPESA', (10 - i) * 1000, { categoriaId: i + 1 }),
    );
    const fatias = distribuicaoPorCategoria(muitas, '2026-08', CATEGORIAS, 7);

    expect(fatias).toHaveLength(8);
    expect(fatias[7].nome).toBe('Outras');
    expect(fatias[7].valor).toBe(3000 + 2000 + 1000);
  });

  it('despesa sem categoria aparece nomeada, não sumida', () => {
    const fatias = distribuicaoPorCategoria(
      [l('2026-08-01', 'DESPESA', 100_000, { categoriaId: null })],
      '2026-08',
      CATEGORIAS,
    );

    expect(fatias[0].nome).toBe('Sem categoria');
    expect(fatias[0].percentual).toBe(100);
  });

  it('mês sem despesa devolve lista vazia', () => {
    expect(distribuicaoPorCategoria([], '2026-08', CATEGORIAS)).toEqual([]);
  });
});

describe('divisão Casa x Pessoal', () => {
  const lancamentos = [
    l('2026-08-01', 'DESPESA', 600_000, { categoriaId: 1 }), // Casa
    l('2026-08-02', 'DESPESA', 200_000, { categoriaId: 2 }), // Casa
    l('2026-08-03', 'DESPESA', 200_000, { categoriaId: 3 }), // Pessoal
    l('2026-08-04', 'RECEITA', 900_000, { categoriaId: 9 }),
  ];

  it('soma por grupo e calcula o percentual sobre a despesa total', () => {
    const { fatias, total } = divisaoCasaPessoal(lancamentos, '2026-08', CATEGORIAS);

    expect(total).toBe(1_000_000);
    expect(fatias).toEqual([
      { grupo: 'CASA', rotulo: 'Casa', valor: 800_000, percentual: 80, fracao: 0.8 },
      { grupo: 'PESSOAL', rotulo: 'Pessoal', valor: 200_000, percentual: 20, fracao: 0.2 },
    ]);
  });

  it('despesa sem categoria vira uma terceira fatia, para o total fechar', () => {
    const { fatias } = divisaoCasaPessoal(
      [...lancamentos, l('2026-08-05', 'DESPESA', 250_000, { categoriaId: null })],
      '2026-08',
      CATEGORIAS,
    );

    expect(fatias.map((f) => f.grupo)).toEqual(['CASA', 'PESSOAL', 'SEM_GRUPO']);
    expect(fatias.find((f) => f.grupo === 'SEM_GRUPO')?.valor).toBe(250_000);
  });

  it('categoria sem grupo também cai em SEM_GRUPO', () => {
    const { fatias } = divisaoCasaPessoal(
      [l('2026-08-01', 'DESPESA', 100_000, { categoriaId: 9 })],
      '2026-08',
      CATEGORIAS,
    );

    expect(fatias).toEqual([
      { grupo: 'SEM_GRUPO', rotulo: 'Sem grupo', valor: 100_000, percentual: 100, fracao: 1 },
    ]);
  });

  it('grupo zerado não vira fatia vazia', () => {
    const { fatias } = divisaoCasaPessoal(
      [l('2026-08-01', 'DESPESA', 100_000, { categoriaId: 1 })],
      '2026-08',
      CATEGORIAS,
    );

    expect(fatias).toHaveLength(1);
    expect(fatias[0].grupo).toBe('CASA');
  });

  it('mês sem despesa devolve fatias vazias e total zero', () => {
    const { fatias, total } = divisaoCasaPessoal([], '2026-08', CATEGORIAS);
    expect(fatias).toEqual([]);
    expect(total).toBe(0);
  });
});

describe('totalGuardado', () => {
  it('soma só APORTE com pago = 1, de qualquer mês', () => {
    const total = totalGuardado([
      l('2025-01-01', 'APORTE', 100_000, { pago: 1 }),
      l('2026-08-01', 'APORTE', 50_000, { pago: 1 }),
      l('2026-08-02', 'APORTE', 900_000, { pago: 0 }),
      l('2026-08-03', 'RECEITA', 900_000, { pago: 1 }),
    ]);

    expect(total).toBe(150_000);
  });
});
