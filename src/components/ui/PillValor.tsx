import { StyleSheet, Text, View } from 'react-native';
import { cores, espaco, tipografia } from '../../lib/tema';
import { ChipIcone, corForteDoTom, type TomChip } from './ChipIcone';
import type { NomeIcone } from './Icone';

/**
 * Chip + rótulo + valor. É o par Receitas/Despesas do painel.
 *
 * O valor veste a cor do tom; o rótulo veste token de texto. Todos os tons
 * passam em 4,5:1 como texto sobre superfície e sobre fundo, então colorir o
 * número aqui é legítimo — mas é a única concessão: em gráfico, número e rótulo
 * ficam sempre em tinta.
 */
export function PillValor({
  nome,
  tom,
  rotulo,
  valor,
  apoio,
  oculto = false,
}: {
  nome: NomeIcone;
  tom: TomChip;
  rotulo: string;
  valor: string;
  /**
   * A outra metade do par. O número grande é o REALIZADO, e sozinho ele mente
   * por omissão: um mês com mil reais de conta ainda não paga mostra "R$ 0,00"
   * em despesas, e quem lê acha que a tela travou. Esta linha é o previsto.
   */
  apoio?: string;
  /** Quando o olho está fechado, o número vira tarja e some do leitor de tela. */
  oculto?: boolean;
}) {
  return (
    <View style={estilos.pill}>
      <ChipIcone nome={nome} tom={tom} tamanho={32} />
      <View style={estilos.texto}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text
          style={[estilos.valor, { color: corForteDoTom(tom) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {oculto ? '•••••' : valor}
        </Text>
        {apoio && !oculto ? (
          <Text style={estilos.apoio} numberOfLines={1}>
            {apoio}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  texto: { flex: 1 },
  rotulo: tipografia.etiqueta,
  valor: { ...tipografia.valor, marginTop: 2 },
  apoio: { ...tipografia.apoio, fontSize: 11, color: cores.textoFraco, marginTop: 1 },
});
