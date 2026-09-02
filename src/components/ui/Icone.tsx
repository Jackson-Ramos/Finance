import Ionicons from '@expo/vector-icons/Ionicons';
import type { OpaqueColorValue } from 'react-native';

/**
 * Casca sobre a biblioteca de ícones.
 *
 * Existe por dois motivos. Primeiro, o app pede ícone por NOME SEMÂNTICO
 * (`entrada`, `planejamento`) e não por glifo (`arrow-up`, `albums-outline`):
 * quando o desenho de um conceito mudar, muda aqui e em nenhum outro lugar.
 *
 * Segundo, a doc do Expo 57 avisa que o `@expo/vector-icons` será depreciado em
 * favor do `@react-native-vector-icons`. Com a casca, essa migração é um
 * arquivo; sem ela, seria uma varredura pelo app inteiro.
 */

type GlifoIonicons = React.ComponentProps<typeof Ionicons>['name'];

/** Nome semântico → glifo. A única tabela que conhece a biblioteca. */
const GLIFOS = {
  // tipos de lançamento
  entrada: 'arrow-up',
  saida: 'arrow-down',
  aporte: 'flag',

  // abas
  principal: 'home',
  principalVazio: 'home-outline',
  transacoes: 'swap-vertical',
  transacoesVazio: 'swap-vertical-outline',
  planejamento: 'albums',
  planejamentoVazio: 'albums-outline',
  mais: 'ellipsis-horizontal',
  maisVazio: 'ellipsis-horizontal-outline',

  // ações
  novo: 'add',
  fechar: 'close',
  excluir: 'trash-outline',
  confirmar: 'checkmark',
  anterior: 'chevron-back',
  seguinte: 'chevron-forward',
  hoje: 'today-outline',
  olhoAberto: 'eye-outline',
  olhoFechado: 'eye-off-outline',

  // destinos
  saude: 'pulse',
  objetivo: 'flag-outline',
  recorrencia: 'repeat',
  diagnostico: 'construct-outline',
  categoria: 'pricetag-outline',
} as const satisfies Record<string, GlifoIonicons>;

export type NomeIcone = keyof typeof GLIFOS;

export function Icone({
  nome,
  tamanho = 20,
  cor,
}: {
  nome: NomeIcone;
  tamanho?: number;
  cor: string | OpaqueColorValue;
}) {
  return <Ionicons name={GLIFOS[nome]} size={tamanho} color={cor} />;
}
