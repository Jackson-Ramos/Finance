import { describe, expect, it } from 'vitest';
import {
  capitalizar,
  formatarCabecalhoDia,
  formatarData,
  formatarDataCurta,
  formatarMesAno,
  formatarMesAnoCurto,
  formatarMesCurto,
  formatarMeses,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarMoedaComSinal,
  formatarMoedaSemSimbolo,
  formatarPercentual,
  formatarVencimento,
} from '../src/lib/format';
import { hoje } from '../src/lib/date';
import { parseValorParaCentavos } from '../src/lib/money';

/** Intl usa espaço não-separável; normalizar evita teste frágil. */
const n = (s: string) => s.replace(/\s/g, ' ');

describe('formatarMoeda', () => {
  it('formata em pt-BR com R$, milhar por ponto e decimal por vírgula', () => {
    expect(n(formatarMoeda(123_456))).toBe('R$ 1.234,56');
    expect(n(formatarMoeda(0))).toBe('R$ 0,00');
    expect(n(formatarMoeda(5))).toBe('R$ 0,05');
    expect(n(formatarMoeda(100))).toBe('R$ 1,00');
    expect(n(formatarMoeda(100_000_000))).toBe('R$ 1.000.000,00');
  });

  it('sempre mostra duas casas', () => {
    expect(n(formatarMoeda(1050))).toBe('R$ 10,50');
    expect(n(formatarMoeda(1000))).toBe('R$ 10,00');
  });

  it('formata negativo com o sinal do locale', () => {
    expect(n(formatarMoeda(-123_456))).toBe('-R$ 1.234,56');
  });

  it('a versão sem símbolo omite só o R$', () => {
    expect(n(formatarMoedaSemSimbolo(123_456))).toBe('1.234,56');
  });

  it('fecha o ciclo com o parser: formatar -> parsear devolve os mesmos centavos', () => {
    for (const centavos of [0, 1, 99, 100, 1050, 123_456, 99_999_999]) {
      const texto = formatarMoeda(centavos);
      expect(parseValorParaCentavos(texto), texto).toBe(centavos);
    }
  });
});

describe('formatarMoedaComSinal', () => {
  it('marca a direção a partir do tipo, não do valor armazenado', () => {
    expect(n(formatarMoedaComSinal(10_000, 'RECEITA'))).toBe('+ R$ 100,00');
    expect(n(formatarMoedaComSinal(10_000, 'DESPESA'))).toBe('− R$ 100,00');
    expect(n(formatarMoedaComSinal(10_000, 'APORTE'))).toBe('− R$ 100,00');
  });
});

describe('formatarMoedaCompacta', () => {
  it('encurta milhares e milhões', () => {
    expect(n(formatarMoedaCompacta(50_000))).toBe('R$ 500');
    expect(n(formatarMoedaCompacta(123_456))).toBe('R$ 1,2 mil');
    expect(n(formatarMoedaCompacta(1_234_567_00))).toBe('R$ 1,2 mi');
  });

  it('usa o traço de menos correto para negativos', () => {
    expect(n(formatarMoedaCompacta(-123_456))).toBe('−R$ 1,2 mil');
  });
});

describe('formatarPercentual', () => {
  it('mostra inteiro com %', () => {
    expect(formatarPercentual(30)).toBe('30%');
    expect(formatarPercentual(0)).toBe('0%');
    expect(formatarPercentual(150)).toBe('150%');
  });

  it('null (divisão por zero) vira travessão, nunca NaN%', () => {
    expect(formatarPercentual(null)).toBe('—');
    expect(formatarPercentual(NaN)).toBe('—');
    expect(formatarPercentual(Infinity)).toBe('—');
    expect(formatarPercentual(null, 'sem receita')).toBe('sem receita');
  });
});

describe('formatarMeses', () => {
  it('usa uma casa decimal e concorda em número', () => {
    expect(n(formatarMeses(6.5))).toBe('6,5 meses');
    expect(n(formatarMeses(1))).toBe('1,0 mês');
    expect(n(formatarMeses(0))).toBe('0,0 meses');
  });

  it('null vira travessão', () => {
    expect(formatarMeses(null)).toBe('—');
  });
});

describe('datas', () => {
  it('formata no padrão brasileiro', () => {
    expect(formatarData('2026-08-31')).toBe('31/08/2026');
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
  });

  it('formata data curta em pt-BR', () => {
    expect(formatarDataCurta('2026-08-31')).toBe('31 ago');
    expect(formatarDataCurta('2026-12-25')).toBe('25 dez');
  });

  it('formata mês e ano por extenso, capitalizado', () => {
    expect(formatarMesAno('2026-08')).toBe('Agosto de 2026');
    expect(formatarMesAno('2026-03')).toBe('Março de 2026');
    expect(formatarMesCurto('2026-08')).toBe('Ago');
    expect(formatarMesAnoCurto('2026-08')).toBe('Ago/26');
  });

  it('cabeçalho de dia reconhece hoje', () => {
    expect(formatarCabecalhoDia(hoje())).toBe('Hoje');
  });

  it('vencimento é relativo a hoje', () => {
    expect(formatarVencimento(hoje())).toBe('Vence hoje');
  });
});

describe('capitalizar', () => {
  it('sobe a primeira letra e aguenta string vazia', () => {
    expect(capitalizar('agosto')).toBe('Agosto');
    expect(capitalizar('')).toBe('');
    expect(capitalizar('Já maiúsculo')).toBe('Já maiúsculo');
  });
});
