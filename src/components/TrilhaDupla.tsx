import { StyleSheet, View } from 'react-native';
import { cores } from '../lib/tema';

/**
 * Trilha dupla — o elemento que carrega a tese do app.
 *
 * A trilha inteira é o PREVISTO (tudo que o mês tem). O preenchimento é o
 * REALIZADO (só o que está pago). Como realizado é subconjunto de previsto, o
 * preenchimento nunca estoura a trilha: a metáfora fecha sozinha.
 *
 * A marca vertical na ponta do preenchimento é o traço de lápis do contador —
 * onde a conta parou hoje.
 */
export function TrilhaDupla({
  fracao,
  cor,
  largura,
}: {
  /** 0..1. Quem calcula é `fracaoRealizada`. */
  fracao: number;
  cor: string;
  largura?: number;
}) {
  const percentual = `${Math.max(0, Math.min(1, fracao)) * 100}%` as const;
  const temMarca = fracao > 0.02 && fracao < 0.995;

  return (
    <View
      style={[estilos.caixa, largura !== undefined && { width: largura }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fracao * 100) }}
    >
      <View style={estilos.trilha}>
        <View style={[estilos.preenchimento, { width: percentual, backgroundColor: cor }]} />
      </View>
      {temMarca ? (
        <View style={[estilos.marcaEnvelope, { width: percentual }]}>
          <View style={[estilos.marca, { backgroundColor: cor }]} />
        </View>
      ) : null}
    </View>
  );
}

const ALTURA_TRILHA = 6;
const ALTURA_MARCA = 12;

const estilos = StyleSheet.create({
  caixa: {
    height: ALTURA_MARCA,
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
  },
  trilha: {
    height: ALTURA_TRILHA,
    borderRadius: ALTURA_TRILHA / 2,
    backgroundColor: cores.superficieBaixa,
    overflow: 'hidden',
  },
  preenchimento: {
    height: ALTURA_TRILHA,
    borderRadius: ALTURA_TRILHA / 2,
  },
  marcaEnvelope: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  marca: {
    width: 2,
    height: ALTURA_MARCA,
    borderRadius: 1,
  },
});
