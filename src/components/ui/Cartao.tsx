import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { cores, elevacao, espaco, raio } from '../../lib/tema';

/**
 * Superfície branca que flutua.
 *
 * Antes do redesign este bloco estava copiado em quatro arquivos, cada um
 * repetindo fundo, raio e borda. Com sombra no lugar da régua, copiar viraria
 * quatro sombras que divergem na primeira vez que alguém ajusta uma delas.
 *
 * `plano` desliga a sombra: para cartões DENTRO de outro cartão, onde a segunda
 * sombra só suja a leitura.
 */
export function Cartao({
  children,
  style,
  plano = false,
  ...resto
}: ViewProps & { style?: StyleProp<ViewStyle>; plano?: boolean }) {
  return (
    <View style={[estilos.cartao, plano ? estilos.plano : elevacao.cartao, style]} {...resto}>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    padding: espaco.lg,
  },
  plano: {
    backgroundColor: cores.fundo,
  },
});
