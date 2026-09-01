import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, REGUA, tipografia } from '../lib/tema';

/**
 * Barra de abas própria.
 *
 * O tipo `BottomTabBarProps` vem de `expo-router/js-tabs`, que é a entrada
 * pública do próprio expo-router — e não de `@react-navigation/bottom-tabs`,
 * que só existe aqui como dependência transitiva.
 *
 * A padrão do react-navigation reserva espaço para ícone; como o app não tem
 * biblioteca de ícones (e não vai ganhar uma só por isso), a navegação é
 * tipográfica: rótulos em caixa alta espacejada sobre uma régua, como o índice
 * de um livro-razão. A aba corrente ganha tinta cheia e um traço embaixo.
 */
export const ALTURA_ABAS = 52;

export function BarraDeAbas({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.barra, { paddingBottom: insets.bottom }]}>
      <View style={estilos.linha}>
        {state.routes.map((rota, indice) => {
          const { options } = descriptors[rota.key];
          const rotulo =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? rota.name);
          const ativa = state.index === indice;

          return (
            <Pressable
              key={rota.key}
              onPress={() => {
                const evento = navigation.emit({
                  type: 'tabPress',
                  target: rota.key,
                  canPreventDefault: true,
                });
                if (!ativa && !evento.defaultPrevented) {
                  navigation.navigate(rota.name);
                }
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              accessibilityLabel={rotulo}
              style={estilos.aba}
            >
              <Text
                style={[estilos.rotulo, ativa && estilos.rotuloAtivo]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {rotulo}
              </Text>
              <View style={[estilos.marca, ativa && estilos.marcaAtiva]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    backgroundColor: cores.papel,
    borderTopWidth: REGUA,
    borderTopColor: cores.reguaForte,
  },
  linha: { flexDirection: 'row', height: ALTURA_ABAS },
  aba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.xs,
    paddingHorizontal: 2,
  },
  rotulo: { ...tipografia.etiqueta, fontSize: 9, letterSpacing: 0.6 },
  rotuloAtivo: { color: cores.tinta },
  marca: { height: 2, width: 18, backgroundColor: 'transparent', borderRadius: 1 },
  marcaAtiva: { backgroundColor: cores.tinta },
});
