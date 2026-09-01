/**
 * Hook de dados da tela de diagnóstico.
 *
 * Componente -> hook -> repositories -> Drizzle. Nenhuma linha de SQL sobe
 * daqui para cima (REGRA #3).
 */

import { useCallback, useState } from 'react';
import { bancoCru, escrever } from '../db/client';
import { historicoMigracoes, recriar, type RegistroMigracao } from '../db/migrator';
import { anoMesAtual, hoje } from '../lib/date';
import * as categorias from '../repositories/categorias';
import * as lancamentos from '../repositories/lancamentos';
import * as objetivos from '../repositories/objetivos';
import * as recorrencias from '../repositories/recorrencias';
import { semearCategorias } from '../services/seed';
import { useConsulta, useEscrita } from './useRevisao';

export interface DadosDebug {
  migracoes: RegistroMigracao[];
  categorias: categorias.Categoria[];
  objetivos: objetivos.Objetivo[];
  recorrencias: recorrencias.Recorrencia[];
  lancamentosDoMes: lancamentos.LancamentoComCategoria[];
  totais: {
    categorias: number;
    objetivos: number;
    recorrencias: number;
    lancamentos: number;
  };
  anoMes: string;
}

function carregar(): DadosDebug {
  const anoMes = anoMesAtual();
  return {
    migracoes: historicoMigracoes(bancoCru),
    categorias: categorias.listar({ incluirArquivadas: true }),
    objetivos: objetivos.listar(false),
    recorrencias: recorrencias.listar(false),
    lancamentosDoMes: lancamentos.listarDoMesComCategoria(anoMes),
    totais: {
      categorias: categorias.contar(),
      objetivos: objetivos.contar(),
      recorrencias: recorrencias.contar(),
      lancamentos: lancamentos.contar(),
    },
    anoMes,
  };
}

export function useDadosDebug() {
  const [recarga, setRecarga] = useState(0);
  const [erroEscrita, setErroEscrita] = useState<string | null>(null);
  const escreverComAviso = useEscrita();

  const recarregar = useCallback(() => setRecarga((v) => v + 1), []);
  const { dados, erro: erroLeitura } = useConsulta(carregar, [recarga]);

  /** Roda uma escrita, guarda o erro e avisa o resto do app. */
  const executar = useCallback(
    (acao: () => void) => setErroEscrita(escreverComAviso(acao)),
    [escreverComAviso],
  );

  /** Cria um punhado de registros para conferir os repositories na mão. */
  const criarDadosDeExemplo = useCallback(
    () =>
      executar(() =>
        escrever((tx) => {
          semearCategorias(tx);
          const mercado = categorias.buscarPorNome('Mercado', tx);
          const salario = categorias.buscarPorNome('Salário', tx);
          const moradia = categorias.buscarPorNome('Moradia', tx);

          const reserva = objetivos.criar(
            { nome: 'Reserva de emergência', valorAlvo: 3_000_000, metaMensal: 50_000 },
            tx,
          );

          recorrencias.criar(
            {
              descricao: 'Aluguel',
              valorPrevisto: 180_000,
              diaDoMes: 5,
              tipo: 'DESPESA',
              natureza: 'FIXA',
              categoriaId: moradia?.id ?? null,
            },
            tx,
          );

          lancamentos.criar(
            {
              data: hoje(),
              descricao: 'Salário do mês',
              valor: 750_000,
              tipo: 'RECEITA',
              categoriaId: salario?.id ?? null,
              pago: true,
            },
            tx,
          );
          lancamentos.criar(
            {
              data: hoje(),
              descricao: 'Compra do mês',
              valor: 62_350,
              tipo: 'DESPESA',
              natureza: 'VARIAVEL',
              categoriaId: mercado?.id ?? null,
              pago: true,
            },
            tx,
          );
          lancamentos.criar(
            {
              data: hoje(),
              descricao: 'Aporte na reserva',
              valor: 50_000,
              tipo: 'APORTE',
              objetivoId: reserva.id,
              pago: true,
            },
            tx,
          );
        }),
      ),
    [executar],
  );

  /** Derruba todas as migrations e sobe de novo. Prova a reversibilidade no aparelho. */
  const recriarBanco = useCallback(() => executar(() => recriar(bancoCru)), [executar]);

  const semear = useCallback(() => executar(() => semearCategorias()), [executar]);

  const limparLancamentos = useCallback(
    () =>
      executar(() => {
        const ids = lancamentos.listarDoMes(anoMesAtual()).map((l) => l.id);
        lancamentos.removerVarios(ids);
      }),
    [executar],
  );

  return {
    dados,
    erro: erroEscrita ?? erroLeitura,
    recarregar,
    criarDadosDeExemplo,
    recriarBanco,
    semear,
    limparLancamentos,
  };
}
