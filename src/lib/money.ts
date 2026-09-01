/**
 * Camada de dinheiro.
 *
 * REGRA INVIOLÁVEL #1: todo valor monetário é INTEGER em centavos.
 * Nenhuma função deste módulo devolve fração de centavo. Qualquer divisão
 * é arredondada de volta para inteiro (half-away-from-zero) antes de sair.
 * Formatação para exibição vive em `format.ts`, não aqui.
 */

import type { TipoLancamento } from '../types/dominio';

/** Valor monetário em centavos. Sempre inteiro, sempre >= 0 quando armazenado. */
export type Centavos = number;

/** Maior valor que ainda é seguro somar sem perder precisão inteira. */
export const MAX_CENTAVOS = Number.MAX_SAFE_INTEGER;

export function ehCentavosValido(valor: unknown): valor is Centavos {
  return typeof valor === 'number' && Number.isSafeInteger(valor);
}

/** Garante inteiro; lança em vez de deixar um float vazar para o banco. */
export function assertCentavos(valor: number, contexto = 'valor'): Centavos {
  if (!ehCentavosValido(valor)) {
    throw new Error(`${contexto} deve ser inteiro em centavos, recebido: ${String(valor)}`);
  }
  return valor;
}

/**
 * Converte texto digitado pelo usuário em centavos.
 *
 * Aceita as formas que um teclado numérico pt-BR produz:
 *   "1234"        -> 123400   (sem separador decimal = reais inteiros)
 *   "1.234,56"    -> 123456
 *   "1234,5"      -> 123450
 *   "1234.56"     -> 123456   (ponto como decimal, quando não há vírgula)
 *   "R$ 12,30"    -> 1230
 *
 * Devolve `null` para entrada inválida — nunca NaN.
 */
export function parseValorParaCentavos(entrada: string): Centavos | null {
  if (typeof entrada !== 'string') return null;

  const limpo = entrada.trim().replace(/[R$\s ]/g, '');
  if (limpo === '') return null;

  const negativo = limpo.startsWith('-');
  const semSinal = negativo ? limpo.slice(1) : limpo;
  if (!/^[\d.,]+$/.test(semSinal)) return null;

  const temVirgula = semSinal.includes(',');
  // Com vírgula: ponto é separador de milhar. Sem vírgula: o último ponto,
  // se separar exatamente 1 ou 2 dígitos, é decimal; caso contrário, milhar.
  let inteiroTxt: string;
  let decimalTxt: string;

  if (temVirgula) {
    const partes = semSinal.split(',');
    if (partes.length > 2) return null;
    inteiroTxt = partes[0].replace(/\./g, '');
    decimalTxt = partes[1] ?? '';
  } else {
    const partes = semSinal.split('.');
    const ultima = partes.length > 1 ? partes[partes.length - 1] : '';
    if (partes.length > 1 && ultima.length > 0 && ultima.length <= 2) {
      inteiroTxt = partes.slice(0, -1).join('');
      decimalTxt = ultima;
    } else {
      inteiroTxt = partes.join('');
      decimalTxt = '';
    }
  }

  if (decimalTxt.length > 2) return null;
  if (inteiroTxt === '' && decimalTxt === '') return null;
  if (!/^\d*$/.test(inteiroTxt) || !/^\d*$/.test(decimalTxt)) return null;

  const centavosDecimais = decimalTxt.padEnd(2, '0');
  const totalTxt = `${inteiroTxt === '' ? '0' : inteiroTxt}${centavosDecimais}`;
  const total = Number(totalTxt);
  if (!Number.isSafeInteger(total)) return null;

  return negativo ? -total : total;
}

/**
 * Entrada de teclado numérico "estilo caixa": cada dígito empurra o valor
 * uma casa à esquerda. Usado pelo bottom sheet de novo lançamento (Fase 2).
 */
export function digitarCentavos(atual: Centavos, tecla: string): Centavos {
  if (tecla === 'backspace') return Math.trunc(atual / 10);
  if (!/^\d$/.test(tecla)) return atual;
  const proximo = atual * 10 + Number(tecla);
  return Number.isSafeInteger(proximo) ? proximo : atual;
}

/** Soma com garantia de inteiro. Lista vazia soma 0. */
export function somar(valores: readonly Centavos[]): Centavos {
  let total = 0;
  for (const v of valores) total += assertCentavos(v, 'parcela');
  return total;
}

/** Média inteira em centavos. Lista vazia devolve `null`, nunca NaN. */
export function media(valores: readonly Centavos[]): Centavos | null {
  if (valores.length === 0) return null;
  return arredondar(somar(valores) / valores.length);
}

/** Arredonda half-away-from-zero, mantendo simetria para negativos. */
export function arredondar(valor: number): Centavos {
  if (!Number.isFinite(valor)) {
    throw new Error(`valor não finito não pode virar centavos: ${String(valor)}`);
  }
  return valor < 0 ? -Math.round(-valor) : Math.round(valor);
}

/**
 * Divisão que nunca devolve NaN nem Infinity.
 * Denominador 0 (ou não finito) => `null`, para o chamador decidir a UI.
 */
export function dividirSeguro(numerador: number, denominador: number): number | null {
  if (!Number.isFinite(numerador) || !Number.isFinite(denominador)) return null;
  if (denominador === 0) return null;
  return numerador / denominador;
}

/**
 * Percentual INTEIRO (0..N). `null` quando o denominador é zero.
 * Ex.: 45000 de 150000 => 30
 */
export function percentualInteiro(parte: Centavos, total: Centavos): number | null {
  const razao = dividirSeguro(parte, total);
  if (razao === null) return null;
  return Math.round(razao * 100);
}

/**
 * Sinal de caixa derivado do `tipo`. O banco NUNCA guarda sinal.
 * RECEITA entra (+1); DESPESA e APORTE saem (-1) — o aporte sai do caixa
 * corrente mesmo continuando patrimônio do usuário.
 */
export function sinalDeCaixa(tipo: TipoLancamento): 1 | -1 {
  return tipo === 'RECEITA' ? 1 : -1;
}

/** Valor com sinal aplicado, para cálculo de saldo. */
export function comSinal(valor: Centavos, tipo: TipoLancamento): Centavos {
  return assertCentavos(valor, 'valor') * sinalDeCaixa(tipo);
}
