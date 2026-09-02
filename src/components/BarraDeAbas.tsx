import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFolhaLancamento } from '../hooks/useFolhaLancamento';
import { ALVO_TOQUE, cores, elevacao, espaco, tipografia } from '../lib/tema';
import { Icone, type NomeIcone } from './ui/Icone';

/**
 * Barra de abas própria, com o botão de novo lançamento no meio.
 *
 * O tipo `BottomTabBarProps` vem de `expo-router/js-tabs`, que é a entrada
 * pública do próprio expo-router — e não de `@react-native-bottom-tabs`, que só
 * existe aqui como dependência transitiva.
 *
 * Os rótulos encolheram mas NÃO sumiram: ícone sozinho não nomeia destino, e
 * "Planejamento" não tem desenho óbvio. Ícone e palavra juntos.
 *
 * O FAB fica DENTRO dos limites do envoltório, na área de respiro do topo, e
 * não pendurado para fora da barra. No Android, toque em filho que ultrapassa o
 * pai simplesmente não chega.
 */
export const ALTURA_ABAS = 60;
const TAMANHO_FAB = 56;
const RESPIRO_FAB = 18;

const ICONES: Record<string, { ativo: NomeIcone; inativo: NomeIcone }> = {
  index: { ativo: 'principal', inativo: 'principalVazio' },
  transacoes: { ativo: 'transacoes', inativo: 'transacoesVazio' },
  planejamento: { ativo: 'planejamento', inativo: 'planejamentoVazio' },
  mais: { ativo: 'mais', inativo: 'maisVazio' },
};

export function BarraDeAbas({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const abrirFolha = useFolhaLancamento((s) => s.abrir);

  const metade = Math.ceil(state.routes.length / 2);

  function aba(rota: (typeof state.routes)[number], indice: number) {
    const { options } = descriptors[rota.key];
    const rotulo =
      typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? rota.name);
    const ativa = state.index === indice;
    const icone = ICONES[rota.name] ?? { ativo: 'mais', inativo: 'maisVazio' };

    return (
      <Pressable
        key={rota.key}
        onPress={() => {
          const evento = navigation.emit({
            type: 'tabPress',
            target: rota.key,
            canPreventDefault: true,
          });
          if (!ativa && !evento.defaultPrevented) navigation.navigate(rota.name);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: ativa }}
        accessibilityLabel={rotulo}
        style={estilos.aba}
      >
        <Icone
          nome={ativa ? icone.ativo : icone.inativo}
          tamanho={22}
          cor={ativa ? cores.acento : cores.textoFraco}
        />
        <Text style={[estilos.rotulo, ativa && estilos.rotuloAtivo]} numberOfLines={1}>
          {rotulo}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[estilos.envoltorio, { paddingBottom: insets.bottom }]}>
      <View style={estilos.barra}>
        <View style={estilos.lado}>{state.routes.slice(0, metade).map((r, i) => aba(r, i))}</View>
        <View style={estilos.vaoCentral} />
        <View style={estilos.lado}>
          {state.routes.slice(metade).map((r, i) => aba(r, i + metade))}
        </View>
      </View>

      <Pressable
        onPress={() => abrirFolha()}
        accessibilityRole="button"
        accessibilityLabel="Novo lançamento"
        style={({ pressed }) => [estilos.fab, pressed && estilos.fabPressionado]}
      >
        <Icone nome="novo" tamanho={30} cor={cores.superficie} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  envoltorio: { paddingTop: RESPIRO_FAB, backgroundColor: 'transparent' },
  barra: {
    flexDirection: 'row',
    height: ALTURA_ABAS,
    backgroundColor: cores.superficie,
    borderTopWidth: 1,
    borderTopColor: cores.contorno,
  },
  lado: { flex: 1, flexDirection: 'row' },
  vaoCentral: { width: TAMANHO_FAB + espaco.lg },
  aba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: ALVO_TOQUE,
    paddingHorizontal: 2,
  },
  rotulo: { ...tipografia.apoio, fontSize: 10, color: cores.textoFraco },
  rotuloAtivo: { color: cores.acento },
  fab: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: TAMANHO_FAB,
    height: TAMANHO_FAB,
    borderRadius: TAMANHO_FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.acento,
    ...elevacao.flutuante,
  },
  fabPressionado: { backgroundColor: '#1D4ED8' },
});
