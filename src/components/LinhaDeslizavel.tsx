import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { cores, espaco, raio, tipografia } from '../lib/tema';

/**
 * Linha que revela uma ação ao ser arrastada para a direita.
 *
 * Feita com `PanResponder` + `Animated` do próprio React Native, e não com o
 * `Swipeable` do gesture-handler: o `ReanimatedSwipeable` depende do
 * `react-native-reanimated`, que só existe aqui como dependência transitiva do
 * expo-router. Amarrar a UI a uma dependência que não é nossa quebraria no
 * primeiro `npm update`.
 *
 * O gesto só é capturado quando é claramente horizontal, para não roubar a
 * rolagem vertical da lista.
 */
export function LinhaDeslizavel({
  children,
  aoAtivar,
  rotulo,
  glifo,
  cor,
}: {
  children: React.ReactNode;
  aoAtivar: () => void;
  rotulo: string;
  glifo: string;
  /** Cor do painel revelado atrás da linha. */
  cor: string;
}) {
  const deslocamento = useRef(new Animated.Value(0)).current;

  const voltar = () =>
    Animated.spring(deslocamento, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 0,
      speed: 20,
    }).start();

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesto) =>
        gesto.dx > 12 && Math.abs(gesto.dx) > Math.abs(gesto.dy) * 1.5,
      onPanResponderMove: (_, gesto) => {
        // Só para a direita, e com resistência depois do limiar.
        const bruto = Math.max(0, gesto.dx);
        const suavizado = bruto <= LIMIAR ? bruto : LIMIAR + (bruto - LIMIAR) * 0.25;
        deslocamento.setValue(Math.min(suavizado, LIMIAR * 1.6));
      },
      onPanResponderRelease: (_, gesto) => {
        if (gesto.dx >= LIMIAR) aoAtivar();
        voltar();
      },
      onPanResponderTerminate: voltar,
    }),
  ).current;

  const opacidade = deslocamento.interpolate({
    inputRange: [0, LIMIAR * 0.4, LIMIAR],
    outputRange: [0, 0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={estilos.caixa}>
      <View style={[estilos.painel, { backgroundColor: cor }]}>
        <Animated.View style={[estilos.painelConteudo, { opacity: opacidade }]}>
          <Text style={estilos.painelGlifo}>{glifo}</Text>
          <Text style={estilos.painelRotulo}>{rotulo}</Text>
        </Animated.View>
      </View>

      <Animated.View
        style={{ transform: [{ translateX: deslocamento }] }}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/** Distância a partir da qual soltar dispara a ação. */
const LIMIAR = 88;

const estilos = StyleSheet.create({
  caixa: { position: 'relative' },
  painel: {
    position: 'absolute',
    left: espaco.lg,
    right: espaco.lg,
    top: 0,
    bottom: espaco.sm,
    borderRadius: raio.md,
    justifyContent: 'center',
    paddingLeft: espaco.lg,
  },
  painelConteudo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  painelGlifo: { fontSize: 16, color: cores.folha },
  painelRotulo: { ...tipografia.etiqueta, color: cores.folha },
});
