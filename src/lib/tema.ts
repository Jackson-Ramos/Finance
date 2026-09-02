/**
 * Tokens visuais.
 *
 * Direção: painel financeiro claro. Fundo azul-branco, cartões brancos que
 * flutuam por sombra, azul como única cor de ação, e a hierarquia carregada por
 * peso e escala em vez de caixa alta e régua.
 *
 * Sem `expo-font`: as faces são as do sistema Android (Roboto e Roboto Mono).
 *
 * TODO valor aqui foi MEDIDO, não escolhido por gosto. Contraste é WCAG 2.1;
 * separação para daltonismo é ΔE OKLab ×100 sob simulação
 * Machado-Oliveira-Fernandes. Os números estão anotados por token. Antes de
 * trocar qualquer cor, refaça a conta — vários candidatos mais bonitos
 * reprovaram e estão registrados na spec
 * (`docs/superpowers/specs/2026-09-01-redesign-visual-design.md`).
 */

import { Platform } from 'react-native';
import type { TipoLancamento } from '../types/dominio';

export const cores = {
  /** Fundo do app. */
  fundo: '#F4F7FC',
  /** Cartão, folha, barra de abas. */
  superficie: '#FFFFFF',
  /** Trilha vazia, estado pressionado. */
  superficieBaixa: '#EDF1F7',
  /** Divisor de lista. O único fio que sobreviveu ao redesign. */
  contorno: '#E6EBF2',

  /** 15,28:1 no fundo · 16,40:1 na superfície. */
  texto: '#16202E',
  /** 5,54:1 · 5,94:1. */
  textoMedio: '#566579',
  /**
   * 4,84:1 · 5,20:1. Escurecido quatro vezes até passar: #8493A6 (2,92:1),
   * #77869B (3,45:1), #6B7A8F (4,07:1) e #64748B (4,43:1) reprovaram no fundo.
   */
  textoFraco: '#5F6E82',

  /** Cor de ação. Branco sobre ele 5,17:1; ele como texto 5,17:1 / 4,81:1. */
  acento: '#2563EB',
  /** Chip e seleção. Acento sobre ele 4,56:1 (#E4EDFD dava 4,39:1 e caiu). */
  acentoFundo: '#EAF1FE',

  /** Entrada: 5,41:1 · 5,03:1. */
  entrada: '#0F7A43',
  /** Entrada sobre ele 4,76:1 (#D8F0E2 dava 4,50:1 e caiu). */
  entradaFundo: '#E2F5EA',
  /** Saída: 5,63:1 · 5,24:1. */
  saida: '#C0322B',
  /** Saída sobre ele 4,51:1. */
  saidaFundo: '#FBE0DE',
  /** Aporte: sai do caixa, mas não é gasto. 7,90:1 · 7,36:1. */
  aporte: '#4338CA',
  /** Aporte sobre ele 6,13:1. */
  aporteFundo: '#E2E0FA',

  /** Fundo do modal. */
  veu: 'rgba(22, 32, 46, 0.45)',
} as const;

/** Cor forte de cada tipo: texto e ícone. */
export const corDoTipo: Record<TipoLancamento, string> = {
  RECEITA: cores.entrada,
  DESPESA: cores.saida,
  APORTE: cores.aporte,
};

/** Fundo pálido de cada tipo: chip e trilha. */
export const corFundoDoTipo: Record<TipoLancamento, string> = {
  RECEITA: cores.entradaFundo,
  DESPESA: cores.saidaFundo,
  APORTE: cores.aporteFundo,
};

/**
 * Paleta da rosca de categorias.
 *
 * São os slots 1–3 do tema categórico validado — exatamente o corte que passa
 * em TODOS os pares, não só nos adjacentes. O quarto slot poria amarelo ao lado
 * de laranja e reprovaria, por isso a rosca mostra top-3 e agrega o resto.
 *
 * Relatório sobre superfície branca, `--pairs all`: banda de luminosidade PASSA,
 * piso de visão normal PASSA (ΔE 15,4), CVD ΔE 8,0 e contraste de duas fatias
 * abaixo de 3:1 — os dois na banda que EXIGE codificação secundária. Por isso
 * toda fatia é rotulada com nome e valor, e há vão de 2px entre elas. Sem esses
 * rótulos a paleta é inválida, não apenas feia.
 */
export const coresCategorias = ['#2A78D6', '#EB6834', '#1BAF7A'] as const;

/**
 * Fatia agregada. Cinza de propósito: comunica "não é uma categoria".
 * Reprova no piso de croma do validador — desvio deliberado e registrado, já
 * que virar cinza é justamente a intenção.
 */
export const COR_OUTRAS = '#94A3B8';

/** Quantas fatias nomeadas a rosca mostra antes de agregar em "Outras". */
export const LIMITE_FATIAS = coresCategorias.length;

/**
 * Três papéis de fonte:
 * - `texto` / `textoMedio` Roboto, para tudo.
 * - `numero` Roboto Mono, EXCLUSIVO do visor de digitação. Ver `visorDigitacao`.
 */
export const fontes = {
  texto: Platform.select({ android: 'sans-serif', default: 'System' }),
  textoMedio: Platform.select({ android: 'sans-serif-medium', default: 'System' }),
  numero: Platform.select({ android: 'monospace', default: 'Menlo' }),
} as const;

export const tipografia = {
  /** O maior número da tela. */
  saldoHeroi: {
    fontFamily: fontes.texto,
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -0.5,
    color: cores.texto,
  },
  titulo: {
    fontFamily: fontes.textoMedio,
    fontSize: 17,
    color: cores.texto,
  },
  secao: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  /** Rótulo pequeno acima de um valor. Caixa baixa: a caixa alta era do papel. */
  etiqueta: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoFraco,
  },
  corpo: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.texto,
  },
  apoio: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoMedio,
  },
  valor: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  valorApoio: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoMedio,
  },
  /**
   * ÚNICO lugar do app com largura de dígito fixa, e não é estética: enquanto o
   * teclado numérico digita, uma face proporcional faz o número dançar a cada
   * tecla porque cada dígito tem largura diferente. Monoespaçada trava a coluna.
   * Não use isto em nenhum outro lugar.
   */
  visorDigitacao: {
    fontFamily: fontes.numero,
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -0.5,
    color: cores.texto,
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
  sm: 8,
  md: 12,
  lg: 16,
  folha: 24,
  pill: 999,
} as const;

/**
 * Sombras. `elevation` é o que o Android usa; os campos `shadow*` existem para
 * o iOS não ficar chapado caso o app um dia rode lá.
 */
export const elevacao = {
  cartao: {
    elevation: 2,
    shadowColor: '#16202E',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  flutuante: {
    elevation: 8,
    shadowColor: '#16202E',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;

/** Área mínima de toque, em dp. */
export const ALVO_TOQUE = 44;

/**
 * Cores de situação dos indicadores de saúde.
 *
 * O amarelo fica abaixo de 3:1, então ele NUNCA carrega texto — só preenche a
 * trilha, sempre ao lado do rótulo escrito. Cor sozinha nunca diz o que o
 * indicador significa.
 */
export const coresSituacao = {
  bom: '#15803D',
  atencao: '#CA8A04',
  ruim: '#B91C1C',
  indefinido: cores.textoFraco,
} as const;

export const rotulosSituacao = {
  bom: 'Saudável',
  atencao: 'Atenção',
  ruim: 'Crítico',
  indefinido: 'Sem dado',
} as const;
