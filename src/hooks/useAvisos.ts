/**
 * Mantém os avisos de vencimento em dia com o banco.
 *
 * Roda depois de o app subir e a cada escrita: marcar uma conta como paga
 * precisa cancelar o aviso dela, criar uma recorrência precisa agendar os
 * próximos. Como `sincronizarAvisos` recalcula o plano inteiro, não há estado
 * a conciliar — só um debounce para não reagendar a cada toque numa rajada de
 * edições.
 */

import { useEffect, useRef, useState } from 'react';
import {
  avisosAgendados,
  motivoIndisponivel,
  notificacoesDisponiveis,
  sincronizarAvisos,
  type ResultadoSincronizacao,
} from '../services/notificacoes';
import { useRevisaoStore } from './useRevisao';

const ESPERA_MS = 800;

export function useAvisos(ativo: boolean): ResultadoSincronizacao | null {
  const revisao = useRevisaoStore((s) => s.revisao);
  const [resultado, setResultado] = useState<ResultadoSincronizacao | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ativo) return;

    const temporizador = setTimeout(() => {
      sincronizarAvisos()
        .then((r) => {
          if (montado.current) setResultado(r);
        })
        .catch((e: unknown) => {
          // O app continua funcionando sem avisos; nunca deixe isto derrubar a UI.
          console.warn('[avisos] falha ao sincronizar', e);
        });
    }, ESPERA_MS);

    return () => clearTimeout(temporizador);
  }, [ativo, revisao]);

  return resultado;
}

export interface AvisoAgendado {
  identificador: string;
  titulo: string;
  corpo: string;
}

/**
 * O que está de fato agendado no sistema operacional. Usado pela tela de
 * diagnóstico para conferir que o plano virou alarme de verdade.
 */
export function useAvisosAgendados(): {
  avisos: AvisoAgendado[];
  carregando: boolean;
  disponivel: boolean;
  motivo: string | null;
  recarregar: () => void;
} {
  const [avisos, setAvisos] = useState<AvisoAgendado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const revisao = useRevisaoStore((s) => s.revisao);

  useEffect(() => {
    let valido = true;
    setCarregando(true);
    avisosAgendados()
      .then((lista) => {
        if (valido) setAvisos(lista);
      })
      .catch(() => {
        if (valido) setAvisos([]);
      })
      .finally(() => {
        if (valido) setCarregando(false);
      });
    return () => {
      valido = false;
    };
  }, [recarga, revisao]);

  return {
    avisos,
    carregando,
    disponivel: notificacoesDisponiveis(),
    motivo: motivoIndisponivel(),
    recarregar: () => setRecarga((v) => v + 1),
  };
}
