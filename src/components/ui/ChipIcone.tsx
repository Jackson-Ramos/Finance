import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { cores } from '../../lib/tema';
import { Icone, type NomeIcone } from './Icone';

/**
 * Círculo pálido com o ícone na cor forte.
 *
 * A ordem importa e não é estética: chip saturado com ícone BRANCO reprova —
 * branco sobre o verde da referência dá 3,30:1. Invertido, o ícone escuro sobre
 * o fundo pálido passa em todos os tons (4,51:1 no pior deles, a saída).
 */
export type TomChip = 'entrada' | 'saida' | 'aporte' | 'acento' | 'neutro';

const TONS: Record<TomChip, { fundo: string; cor: string }> = {
  entrada: { fundo: cores.entradaFundo, cor: cores.entrada },
  saida: { fundo: cores.saidaFundo, cor: cores.saida },
  aporte: { fundo: cores.aporteFundo, cor: cores.aporte },
  acento: { fundo: cores.acentoFundo, cor: cores.acento },
  neutro: { fundo: cores.superficieBaixa, cor: cores.textoMedio },
};

export function ChipIcone({
  nome,
  tom,
  tamanho = 36,
  style,
}: {
  nome: NomeIcone;
  tom: TomChip;
  tamanho?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { fundo, cor } = TONS[tom];

  return (
    <View
      style={[
        estilos.chip,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: fundo },
        style,
      ]}
    >
      <Icone nome={nome} tamanho={Math.round(tamanho * 0.55)} cor={cor} />
    </View>
  );
}

export function corForteDoTom(tom: TomChip): string {
  return TONS[tom].cor;
}

const estilos = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center' },
});
