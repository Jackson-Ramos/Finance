/**
 * Orquestração da geração de recorrências: lê o banco, decide com o serviço
 * puro (`geracaoRecorrencias.ts`) e grava — tudo numa transação só.
 *
 * Três camadas de defesa contra duplicata, da mais barata para a mais forte:
 *   1. `planejarGeracao` filtra pelos ids já gerados no mês;
 *   2. a escrita inteira acontece numa transação;
 *   3. o índice UNIQUE parcial em (recorrencia_id, substr(data,1,7)) recusa
 *      qualquer duplicata que escape das duas primeiras.
 */

import { db, escrever, type Executor } from '../db/client';
import { anoMesAtual } from '../lib/date';
import * as repoLancamentos from '../repositories/lancamentos';
import * as repoRecorrencias from '../repositories/recorrencias';
import type { AnoMes } from '../types/dominio';
import { planejarGeracao, type PlanoGeracao } from './geracaoRecorrencias';

export interface ResultadoGeracao {
  anoMes: AnoMes;
  criados: number;
  jaExistiam: number;
  inativas: number;
}

function contar(plano: PlanoGeracao, motivo: string): number {
  return plano.ignoradas.filter((i) => i.motivo === motivo).length;
}

/**
 * Cria os lançamentos que faltam para o mês. Seguro de chamar quantas vezes
 * quiser — a segunda chamada devolve `criados: 0`.
 */
export function gerarRecorrenciasDoMes(
  anoMes: AnoMes = anoMesAtual(),
  executor: Executor = db,
): ResultadoGeracao {
  return escrever((tx) => {
    // Lista todas (não só as ativas) para o plano poder explicar o que ignorou.
    const recorrencias = repoRecorrencias.listar(false, tx);
    const jaGerados = repoLancamentos.idsDeRecorrenciaNoMes(anoMes, tx);

    const plano = planejarGeracao(recorrencias, jaGerados, anoMes);
    repoLancamentos.criarVarios(plano.aCriar, tx);

    return {
      anoMes,
      criados: plano.aCriar.length,
      jaExistiam: contar(plano, 'ja_gerada'),
      inativas: contar(plano, 'inativa'),
    };
  }, executor);
}
