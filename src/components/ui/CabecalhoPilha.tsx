import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ALVO_TOQUE, cores, espaco, tipografia } from '../../lib/tema';
import { Icone } from './Icone';

/**
 * Cabeçalho de tela empilhada: voltar e título.
 *
 * O `Stack` raiz roda com `headerShown: false` porque as abas desenham o
 * próprio topo. Telas empilhadas herdam isso e ficariam sem saída visível — o
 * botão físico do Android não conta como caminho de volta que se vê.
 *
 * `canGoBack` importa: aberto por link direto, não há para onde voltar, e
 * `back()` num histórico vazio não faz nada. Nesse caso vai para o início.
 */
export function CabecalhoPilha({ titulo }: { titulo: string }) {
  const router = useRouter();

  return (
    <View style={estilos.linha}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={({ pressed }) => [estilos.voltar, pressed && estilos.pressionado]}
      >
        <Icone nome="anterior" tamanho={24} cor={cores.texto} />
      </Pressable>
      <Text style={estilos.titulo} numberOfLines={1}>
        {titulo}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  voltar: {
    width: ALVO_TOQUE,
    height: ALVO_TOQUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ALVO_TOQUE / 2,
  },
  pressionado: { backgroundColor: cores.superficieBaixa },
  titulo: { ...tipografia.titulo, flex: 1 },
});
