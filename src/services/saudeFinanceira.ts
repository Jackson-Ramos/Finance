/**
 * Métricas de saúde financeira, série histórica e composição de despesa.
 *
 * Serviço PURO. Recebe lançamentos e categorias, devolve números.
 *
 * DUAS CONVENÇÕES que o resto depende:
 *
 * 1. "do mês" = TODOS os lançamentos daquele mês, pagos ou não — a mesma
 *    definição de PREVISTO da tela do mês. O spec diz "despesas FIXAS do mês /
 *    receitas do mês" sem qualificar, e essa é a leitura consistente com o
 *    vocabulário que ele mesmo estabeleceu. A exceção é `totalGuardado`, que é
 *    estoque e não fluxo: só conta aporte com pago = 1.
 *
 * 2. As médias de 3 meses usam os TRÊS MESES ANTERIORES, sem o mês de
 *    referência. O spec é explícito sobre a receita ("use isso como base de
 *    planejamento, não o valor do mês corrente"), e aplicar a mesma janela à
 *    despesa fixa mantém `reserva_em_meses` comparável.
 *
 * Divisão por zero devolve `null` em todo lugar. Nunca NaN, nunca Infinity.
 */

import { anoMesDe, mesesAnteriores } from '../lib/date';
import { arredondar, dividirSeguro, media, percentualInteiro, somar, type Centavos } from '../lib/money';
import type { AnoMes, DataISO, GrupoCategoria, Natureza, TipoLancamento } from '../types/dominio';

export interface LancamentoSaude {
  data: DataISO;
  valor: Centavos;
  tipo: TipoLancamento;
  natureza: Natureza | null;
  categoriaId: number | null;
  /** 0 ou 1, como está no banco. */
  pago: number;
}

export interface CategoriaSaude {
  id: number;
  nome: string;
  cor: string | null;
  icone: string | null;
  grupo: GrupoCategoria | null;
  /** 0 ou 1. Alimenta `comprometimento_dividas`. */
  divida: number | null;
}

// --------------------------------------------------------------- agregações

const doMes = (l: readonly LancamentoSaude[], anoMes: AnoMes) =>
  l.filter((x) => anoMesDe(x.data) === anoMes);

const somarValores = (l: readonly LancamentoSaude[]) => somar(l.map((x) => x.valor));

export function receitasDoMes(l: readonly LancamentoSaude[], anoMes: AnoMes): Centavos {
  return somarValores(doMes(l, anoMes).filter((x) => x.tipo === 'RECEITA'));
}

export function despesasFixasDoMes(l: readonly LancamentoSaude[], anoMes: AnoMes): Centavos {
  return somarValores(
    doMes(l, anoMes).filter((x) => x.tipo === 'DESPESA' && x.natureza === 'FIXA'),
  );
}

export function aportesDoMes(l: readonly LancamentoSaude[], anoMes: AnoMes): Centavos {
  return somarValores(doMes(l, anoMes).filter((x) => x.tipo === 'APORTE'));
}

export function despesasDeDividaDoMes(
  l: readonly LancamentoSaude[],
  anoMes: AnoMes,
  idsDeDivida: ReadonlySet<number>,
): Centavos {
  return somarValores(
    doMes(l, anoMes).filter(
      (x) => x.tipo === 'DESPESA' && x.categoriaId !== null && idsDeDivida.has(x.categoriaId),
    ),
  );
}

/** Aportes efetivamente pagos, de qualquer mês. É o estoque guardado. */
export function totalGuardado(l: readonly LancamentoSaude[]): Centavos {
  return somarValores(l.filter((x) => x.tipo === 'APORTE' && x.pago === 1));
}

// --------------------------------------------------------------- indicadores

export type Situacao = 'bom' | 'atencao' | 'ruim' | 'indefinido';

export interface Indicadores {
  anoMes: AnoMes;

  receitasDoMes: Centavos;
  despesasFixasDoMes: Centavos;
  despesasDeDividaDoMes: Centavos;
  aportesDoMes: Centavos;
  totalGuardado: Centavos;

  /** Percentuais inteiros. `null` quando não houve receita no mês. */
  comprometimentoFixas: number | null;
  comprometimentoDividas: number | null;
  taxaPoupanca: number | null;

  /** Em meses, com uma casa decimal. Não é centavo nem percentual. */
  reservaEmMeses: number | null;

  /** Médias dos três meses ANTERIORES. `null` sem histórico. */
  mediaMovelReceita: Centavos | null;
  mediaFixasTresMeses: Centavos | null;

  /** Quantos dos três meses anteriores têm algum lançamento. 0..3 */
  mesesComHistorico: number;
  /** Os três meses usados nas médias, em ordem cronológica. */
  janela: AnoMes[];
}

export interface EntradaIndicadores {
  anoMes: AnoMes;
  /** Lançamentos do mês de referência E dos três anteriores, no mínimo. */
  lancamentos: readonly LancamentoSaude[];
  categorias: readonly CategoriaSaude[];
  /** Todos os aportes já pagos, de qualquer época. */
  aportesAcumulados: readonly LancamentoSaude[];
}

export function calcularIndicadores(entrada: EntradaIndicadores): Indicadores {
  const { anoMes, lancamentos, categorias, aportesAcumulados } = entrada;

  const idsDeDivida = new Set(categorias.filter((c) => c.divida === 1).map((c) => c.id));

  const receitas = receitasDoMes(lancamentos, anoMes);
  const fixas = despesasFixasDoMes(lancamentos, anoMes);
  const dividas = despesasDeDividaDoMes(lancamentos, anoMes, idsDeDivida);
  const aportes = aportesDoMes(lancamentos, anoMes);
  const guardado = totalGuardado(aportesAcumulados);

  const janela = mesesAnteriores(anoMes, 3);
  const receitasDaJanela = janela.map((m) => receitasDoMes(lancamentos, m));
  const fixasDaJanela = janela.map((m) => despesasFixasDoMes(lancamentos, m));
  const mesesComHistorico = janela.filter((m) => doMes(lancamentos, m).length > 0).length;

  const mediaMovelReceita = mesesComHistorico > 0 ? media(receitasDaJanela) : null;
  const mediaFixas = mesesComHistorico > 0 ? media(fixasDaJanela) : null;

  // Quantos meses de despesa fixa a reserva cobre. Uma casa decimal, sem lixo
  // de ponto flutuante.
  const razaoReserva = mediaFixas === null ? null : dividirSeguro(guardado, mediaFixas);
  const reservaEmMeses = razaoReserva === null ? null : arredondar(razaoReserva * 10) / 10;

  return {
    anoMes,
    receitasDoMes: receitas,
    despesasFixasDoMes: fixas,
    despesasDeDividaDoMes: dividas,
    aportesDoMes: aportes,
    totalGuardado: guardado,
    comprometimentoFixas: percentualInteiro(fixas, receitas),
    comprometimentoDividas: percentualInteiro(dividas, receitas),
    taxaPoupanca: percentualInteiro(aportes, receitas),
    reservaEmMeses,
    mediaMovelReceita,
    mediaFixasTresMeses: mediaFixas,
    mesesComHistorico,
    janela,
  };
}

// ----------------------------------------------------------------- situações
//
// Faixas usadas para colorir e rotular cada indicador. Sempre acompanhadas do
// rótulo em texto na UI — cor sozinha nunca carrega o significado.

export function situacaoFixas(p: number | null): Situacao {
  if (p === null) return 'indefinido';
  if (p <= 30) return 'bom';
  if (p <= 50) return 'atencao';
  return 'ruim';
}

export function situacaoDividas(p: number | null): Situacao {
  if (p === null) return 'indefinido';
  if (p <= 10) return 'bom';
  if (p <= 30) return 'atencao';
  return 'ruim';
}

/** Invertida: aqui, quanto maior, melhor. */
export function situacaoPoupanca(p: number | null): Situacao {
  if (p === null) return 'indefinido';
  if (p >= 20) return 'bom';
  if (p >= 10) return 'atencao';
  return 'ruim';
}

/** Invertida: a régua clássica é 6 meses de despesa fixa. */
export function situacaoReserva(meses: number | null): Situacao {
  if (meses === null) return 'indefinido';
  if (meses >= 6) return 'bom';
  if (meses >= 3) return 'atencao';
  return 'ruim';
}

// ------------------------------------------------------------------- série

export interface PontoHistorico {
  anoMes: AnoMes;
  receitas: Centavos;
  despesas: Centavos;
  aportes: Centavos;
  /** receitas − despesas − aportes. Pode ser negativo. */
  saldo: Centavos;
}

/** Um ponto por mês da lista, na ordem em que ela vier. Mês sem dado vira zero. */
export function serieHistorica(
  lancamentos: readonly LancamentoSaude[],
  meses: readonly AnoMes[],
): PontoHistorico[] {
  return meses.map((anoMes) => {
    const receitas = receitasDoMes(lancamentos, anoMes);
    const despesas = somarValores(doMes(lancamentos, anoMes).filter((x) => x.tipo === 'DESPESA'));
    const aportes = aportesDoMes(lancamentos, anoMes);
    return { anoMes, receitas, despesas, aportes, saldo: receitas - despesas - aportes };
  });
}

// ------------------------------------------------------------- composição

export interface FatiaCategoria {
  /** `null` na fatia agregada "Outras" e nas despesas sem categoria. */
  categoriaId: number | null;
  nome: string;
  cor: string | null;
  icone: string | null;
  valor: Centavos;
  /** Percentual inteiro sobre o total de despesa do mês. */
  percentual: number | null;
  /** 0..1, para a largura da barra (relativo à maior fatia). */
  fracaoDoMaior: number;
}

export const SEM_CATEGORIA = 'Sem categoria';
export const OUTRAS = 'Outras';

/**
 * Despesas do mês por categoria, da maior para a menor.
 *
 * Corta em `limite` fatias e agrega o resto em "Outras": acima de ~8 itens a
 * leitura vira ruído, e uma nona cor não resolveria — viraria cor cíclica.
 */
export function distribuicaoPorCategoria(
  lancamentos: readonly LancamentoSaude[],
  anoMes: AnoMes,
  categorias: readonly CategoriaSaude[],
  limite = 7,
): FatiaCategoria[] {
  const despesas = doMes(lancamentos, anoMes).filter((x) => x.tipo === 'DESPESA');
  const total = somarValores(despesas);
  if (despesas.length === 0) return [];

  const porCategoria = new Map<number | null, Centavos>();
  for (const d of despesas) {
    porCategoria.set(d.categoriaId, (porCategoria.get(d.categoriaId) ?? 0) + d.valor);
  }

  const indice = new Map(categorias.map((c) => [c.id, c]));
  const todas = [...porCategoria.entries()]
    .map(([id, valor]) => {
      const c = id === null ? undefined : indice.get(id);
      return {
        categoriaId: id,
        nome: c?.nome ?? SEM_CATEGORIA,
        cor: c?.cor ?? null,
        icone: c?.icone ?? null,
        valor,
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const principais = todas.slice(0, limite);
  const resto = todas.slice(limite);

  const fatias = [...principais];
  if (resto.length > 0) {
    fatias.push({
      categoriaId: null,
      nome: OUTRAS,
      cor: null,
      icone: null,
      valor: somar(resto.map((r) => r.valor)),
    });
  }

  const maior = fatias.length > 0 ? fatias[0].valor : 0;

  return fatias.map((f) => ({
    ...f,
    percentual: percentualInteiro(f.valor, total),
    fracaoDoMaior: maior > 0 ? f.valor / maior : 0,
  }));
}

export type ChaveGrupo = GrupoCategoria | 'SEM_GRUPO';

export interface FatiaGrupo {
  grupo: ChaveGrupo;
  rotulo: string;
  valor: Centavos;
  percentual: number | null;
  fracao: number;
}

const ROTULO_GRUPO: Record<ChaveGrupo, string> = {
  CASA: 'Casa',
  PESSOAL: 'Pessoal',
  SEM_GRUPO: 'Sem grupo',
};

/**
 * Despesas do mês divididas em Casa x Pessoal.
 *
 * A terceira fatia existe porque `categoria.grupo` é anulável e uma despesa
 * pode não ter categoria nenhuma. Esconder esse resto faria as duas primeiras
 * fatias somarem menos que o total sem explicação.
 */
export function divisaoCasaPessoal(
  lancamentos: readonly LancamentoSaude[],
  anoMes: AnoMes,
  categorias: readonly CategoriaSaude[],
): { fatias: FatiaGrupo[]; total: Centavos } {
  const despesas = doMes(lancamentos, anoMes).filter((x) => x.tipo === 'DESPESA');
  const total = somarValores(despesas);
  const indice = new Map(categorias.map((c) => [c.id, c]));

  const acumulado: Record<ChaveGrupo, Centavos> = { CASA: 0, PESSOAL: 0, SEM_GRUPO: 0 };
  for (const d of despesas) {
    const grupo = (d.categoriaId === null ? null : indice.get(d.categoriaId)?.grupo) ?? null;
    const chave: ChaveGrupo = grupo ?? 'SEM_GRUPO';
    acumulado[chave] += d.valor;
  }

  const fatias = (['CASA', 'PESSOAL', 'SEM_GRUPO'] as ChaveGrupo[])
    .map((grupo) => ({
      grupo,
      rotulo: ROTULO_GRUPO[grupo],
      valor: acumulado[grupo],
      percentual: percentualInteiro(acumulado[grupo], total),
      fracao: total > 0 ? acumulado[grupo] / total : 0,
    }))
    .filter((f) => f.valor > 0);

  return { fatias, total };
}
