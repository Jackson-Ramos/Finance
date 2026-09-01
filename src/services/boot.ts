/**
 * Rotina de abertura do app.
 *
 * Ordem importa: migrar antes de qualquer leitura, semear antes de qualquer
 * tela, gerar recorrências antes de o mês ser exibido.
 *
 * Tudo aqui é síncrono. Os avisos de vencimento são assíncronos e ficam fora:
 * quem cuida deles é `hooks/useAvisos.ts`, depois que a UI já está de pé.
 */

import { inicializarBanco, versaoDoBanco } from '../db/client';
import { VERSAO_ALVO } from '../db/migrator';
import { anoMesAtual } from '../lib/date';
import { gerarRecorrenciasDoMes, type ResultadoGeracao } from './mesCorrente';
import { semearSePrimeiraExecucao, type ResultadoSeed } from './seed';

export interface ResultadoBoot {
  versaoAnterior: number;
  versaoAtual: number;
  versaoAlvo: number;
  migracoesAplicadas: readonly number[];
  seed: ResultadoSeed;
  geracao: ResultadoGeracao;
  anoMes: string;
  duracaoMs: number;
}

export function iniciarApp(): ResultadoBoot {
  const t0 = Date.now();
  const anoMes = anoMesAtual();

  const migracao = inicializarBanco();
  const seed = semearSePrimeiraExecucao();
  // Idempotente: abrir o app dez vezes no mesmo mês não duplica nada.
  const geracao = gerarRecorrenciasDoMes(anoMes);

  return {
    versaoAnterior: migracao.versaoAnterior,
    versaoAtual: versaoDoBanco(),
    versaoAlvo: VERSAO_ALVO,
    migracoesAplicadas: migracao.aplicadas,
    seed,
    geracao,
    anoMes,
    duracaoMs: Date.now() - t0,
  };
}
