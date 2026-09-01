import { describe, expect, it } from 'vitest';
import {
  arredondar,
  assertCentavos,
  comSinal,
  digitarCentavos,
  dividirSeguro,
  ehCentavosValido,
  media,
  parseValorParaCentavos,
  percentualInteiro,
  sinalDeCaixa,
  somar,
} from '../src/lib/money';

describe('parseValorParaCentavos', () => {
  it('interpreta número sem separador decimal como reais inteiros', () => {
    expect(parseValorParaCentavos('1234')).toBe(123_400);
    expect(parseValorParaCentavos('0')).toBe(0);
    expect(parseValorParaCentavos('7')).toBe(700);
  });

  it('interpreta vírgula como separador decimal e ponto como milhar', () => {
    expect(parseValorParaCentavos('1.234,56')).toBe(123_456);
    expect(parseValorParaCentavos('1234,56')).toBe(123_456);
    expect(parseValorParaCentavos('1.234.567,89')).toBe(123_456_789);
  });

  it('completa a casa decimal faltante', () => {
    expect(parseValorParaCentavos('12,5')).toBe(1250);
    expect(parseValorParaCentavos(',5')).toBe(50);
    expect(parseValorParaCentavos('0,05')).toBe(5);
  });

  it('aceita ponto como decimal quando não há vírgula', () => {
    expect(parseValorParaCentavos('1234.56')).toBe(123_456);
    expect(parseValorParaCentavos('12.5')).toBe(1250);
  });

  it('trata ponto com 3 dígitos como separador de milhar', () => {
    expect(parseValorParaCentavos('1.234')).toBe(123_400);
    expect(parseValorParaCentavos('1.234.567')).toBe(123_456_700);
  });

  it('ignora símbolo de moeda e espaços, inclusive o espaço fino do Intl', () => {
    expect(parseValorParaCentavos('R$ 12,30')).toBe(1230);
    expect(parseValorParaCentavos('R$ 1.234,56')).toBe(123_456);
    expect(parseValorParaCentavos('  99,90  ')).toBe(9990);
  });

  it('devolve null para entrada inválida — nunca NaN', () => {
    for (const entrada of ['', '   ', 'abc', '12,345', '1,2,3', 'R$', '--5', '1e3']) {
      expect(parseValorParaCentavos(entrada), entrada).toBeNull();
    }
  });

  it('preserva o sinal negativo quando explicitamente digitado', () => {
    expect(parseValorParaCentavos('-50')).toBe(-5000);
    expect(parseValorParaCentavos('-1.234,56')).toBe(-123_456);
  });

  it('nunca devolve fração de centavo', () => {
    const amostras = ['0,01', '0,10', '3,33', '10,99', '999.999,99'];
    for (const a of amostras) {
      const c = parseValorParaCentavos(a);
      expect(Number.isSafeInteger(c)).toBe(true);
    }
  });

  it('faz ida e volta com o formatador pt-BR', () => {
    const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 });
    for (const centavos of [1, 99, 100, 1050, 123_456, 1_000_000, 99_999_999]) {
      expect(parseValorParaCentavos(fmt.format(centavos / 100))).toBe(centavos);
    }
  });
});

describe('digitarCentavos (teclado numérico estilo caixa)', () => {
  it('empurra dígitos da direita para a esquerda', () => {
    let v = 0;
    for (const tecla of ['1', '2', '3', '4']) v = digitarCentavos(v, tecla);
    expect(v).toBe(1234); // R$ 12,34
  });

  it('backspace remove o último dígito', () => {
    expect(digitarCentavos(1234, 'backspace')).toBe(123);
    expect(digitarCentavos(1, 'backspace')).toBe(0);
    expect(digitarCentavos(0, 'backspace')).toBe(0);
  });

  it('ignora teclas que não são dígito', () => {
    expect(digitarCentavos(1234, ',')).toBe(1234);
    expect(digitarCentavos(1234, 'x')).toBe(1234);
  });

  it('não estoura o inteiro seguro', () => {
    const enorme = Math.floor(Number.MAX_SAFE_INTEGER / 10) + 1;
    expect(digitarCentavos(enorme, '9')).toBe(enorme);
  });
});

describe('validação de centavos', () => {
  it('reconhece apenas inteiros seguros', () => {
    expect(ehCentavosValido(100)).toBe(true);
    expect(ehCentavosValido(0)).toBe(true);
    expect(ehCentavosValido(-100)).toBe(true);
    expect(ehCentavosValido(10.5)).toBe(false);
    expect(ehCentavosValido(NaN)).toBe(false);
    expect(ehCentavosValido(Infinity)).toBe(false);
    expect(ehCentavosValido('100')).toBe(false);
  });

  it('assertCentavos barra float antes de chegar no banco', () => {
    expect(() => assertCentavos(10.5, 'valor')).toThrow(/valor.*centavos/);
    expect(assertCentavos(1050)).toBe(1050);
  });
});

describe('aritmética', () => {
  it('somar mantém inteiro e trata lista vazia', () => {
    expect(somar([])).toBe(0);
    expect(somar([100, 250, 33])).toBe(383);
    expect(() => somar([100, 2.5])).toThrow();
  });

  it('media devolve inteiro e null para lista vazia', () => {
    expect(media([])).toBeNull();
    expect(media([100, 200, 300])).toBe(200);
    expect(media([100, 101])).toBe(101); // 100,5 arredonda para cima
    expect(media([100, 100, 101])).toBe(100); // 100,33 arredonda para baixo
  });

  it('arredondar é simétrico para negativos', () => {
    expect(arredondar(2.5)).toBe(3);
    expect(arredondar(-2.5)).toBe(-3);
    expect(arredondar(2.4)).toBe(2);
    expect(arredondar(-2.4)).toBe(-2);
    expect(() => arredondar(Infinity)).toThrow();
  });
});

describe('divisão segura', () => {
  it('devolve null em vez de Infinity quando o denominador é zero', () => {
    expect(dividirSeguro(100, 0)).toBeNull();
    expect(dividirSeguro(0, 0)).toBeNull();
    expect(dividirSeguro(-100, 0)).toBeNull();
  });

  it('devolve null para entradas não finitas', () => {
    expect(dividirSeguro(NaN, 10)).toBeNull();
    expect(dividirSeguro(10, NaN)).toBeNull();
    expect(dividirSeguro(Infinity, 10)).toBeNull();
  });

  it('divide normalmente quando dá', () => {
    expect(dividirSeguro(100, 4)).toBe(25);
  });
});

describe('percentualInteiro', () => {
  it('devolve inteiro, nunca fração', () => {
    expect(percentualInteiro(45_000, 150_000)).toBe(30);
    expect(percentualInteiro(1, 3)).toBe(33);
    expect(percentualInteiro(2, 3)).toBe(67);
    expect(percentualInteiro(0, 1000)).toBe(0);
  });

  it('permite passar de 100%', () => {
    expect(percentualInteiro(200_000, 100_000)).toBe(200);
  });

  it('devolve null quando não há receita (divisão por zero)', () => {
    expect(percentualInteiro(50_000, 0)).toBeNull();
    expect(percentualInteiro(0, 0)).toBeNull();
  });
});

describe('sinal derivado do tipo', () => {
  it('receita entra, despesa e aporte saem', () => {
    expect(sinalDeCaixa('RECEITA')).toBe(1);
    expect(sinalDeCaixa('DESPESA')).toBe(-1);
    expect(sinalDeCaixa('APORTE')).toBe(-1);
  });

  it('comSinal aplica a direção sem tocar no valor armazenado', () => {
    expect(comSinal(10_000, 'RECEITA')).toBe(10_000);
    expect(comSinal(10_000, 'DESPESA')).toBe(-10_000);
    expect(comSinal(10_000, 'APORTE')).toBe(-10_000);
  });
});
