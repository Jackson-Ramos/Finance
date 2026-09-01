/**
 * Tokens visuais.
 *
 * Direção: livro-caixa de papel. Fundo de papel pautado esverdeado, tinta
 * escura, réguas finas em vez de sombras, e números em face monoespaçada —
 * do jeito que um contador escreveria numa folha de razão.
 *
 * Sem `expo-font`: as três faces são as do sistema Android (Roboto e Roboto
 * Mono). A personalidade vem de peso, escala e espacejamento, não de arquivo
 * de fonte baixado.
 */

import { Platform } from 'react-native';
import type { TipoLancamento } from '../types/dominio';

export const cores = {
  /** Papel pautado. Fundo de tudo. */
  papel: '#F1F4EE',
  /** Folha em branco: superfície de cartão e da folha de lançamento. */
  folha: '#FFFFFF',
  /** Papel um tom abaixo: pressionado, trilha vazia. */
  papelFundo: '#E4E9DF',

  /** Tinta. Preto com fundo verde, nunca #000. */
  tinta: '#1B2420',
  tintaMedia: '#4A5A52',
  tintaFraca: '#7C8B83',

  /** Régua do caderno. Toda separação é uma linha, não uma sombra. */
  regua: '#D8DFD3',
  reguaForte: '#BCC7B6',

  /** Entrada: verde de razão. */
  entrada: '#1F7A4D',
  entradaFraca: '#D3E7DC',
  /** Saída: a tinta vermelha do contador. */
  saida: '#A32C2C',
  saidaFraca: '#F2D9D9',
  /** Aporte: índigo — sai do caixa, mas não é gasto. */
  aporte: '#3B4E8C',
  aporteFraca: '#D9DEEF',

  /** Fundo do modal. */
  veu: 'rgba(27, 36, 32, 0.45)',
} as const;

/** Cor de cada tipo, para texto e trilha. */
export const corDoTipo: Record<TipoLancamento, string> = {
  RECEITA: cores.entrada,
  DESPESA: cores.saida,
  APORTE: cores.aporte,
};

export const corFracaDoTipo: Record<TipoLancamento, string> = {
  RECEITA: cores.entradaFraca,
  DESPESA: cores.saidaFraca,
  APORTE: cores.aporteFraca,
};

/**
 * Três papéis de tipografia:
 * - `texto`  Roboto, para conteúdo e rótulos.
 * - `numero` Roboto Mono, para TODO valor monetário — dígitos de largura fixa
 *            mantêm a coluna alinhada e impedem o número de tremer enquanto o
 *            teclado digita.
 * - `etiqueta` Roboto em caixa alta com espacejamento largo, para os eyebrows
 *            que nomeiam cada bloco do razão.
 */
export const fontes = {
  texto: Platform.select({ android: 'sans-serif', default: 'System' }),
  textoMedio: Platform.select({ android: 'sans-serif-medium', default: 'System' }),
  numero: Platform.select({ android: 'monospace', default: 'Menlo' }),
} as const;

export const tipografia = {
  mes: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: cores.tinta,
  },
  etiqueta: {
    fontFamily: fontes.textoMedio,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: cores.tintaFraca,
  },
  corpo: {
    fontFamily: fontes.texto,
    fontSize: 15,
    color: cores.tinta,
  },
  apoio: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.tintaMedia,
  },
  /** Saldo do mês. O maior número da tela. */
  numeroHeroi: {
    fontFamily: fontes.numero,
    fontSize: 34,
    letterSpacing: -1,
    color: cores.tinta,
  },
  numeroLinha: {
    fontFamily: fontes.numero,
    fontSize: 15,
    color: cores.tinta,
  },
  numeroApoio: {
    fontFamily: fontes.numero,
    fontSize: 12,
    color: cores.tintaMedia,
  },
} as const;

/** Escala de espaço em múltiplos de 4. */
export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const raio = {
  sm: 4,
  md: 8,
  lg: 14,
  folha: 20,
} as const;

/** Espessura de régua: 1 física, não 1dp arredondado. */
export const REGUA = 1;

/**
 * Cores de situação dos indicadores de saúde.
 *
 * Validadas com o script do dataviz sobre a folha branca: separação CVD e piso
 * de visão normal passam nos três pares. O amarelo fica logo abaixo de 3:1 de
 * contraste, então ele NUNCA carrega texto — só preenche a trilha, sempre ao
 * lado do rótulo escrito. Cor sozinha nunca diz o que o indicador significa.
 */
export const coresSituacao = {
  bom: '#15803D',
  atencao: '#CA8A04',
  ruim: '#B91C1C',
  indefinido: cores.tintaFraca,
} as const;

export const rotulosSituacao = {
  bom: 'Saudável',
  atencao: 'Atenção',
  ruim: 'Crítico',
  indefinido: 'Sem dado',
} as const;
