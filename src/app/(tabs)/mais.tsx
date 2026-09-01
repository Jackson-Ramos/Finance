import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChipIcone, Icone, Seccao } from '../../components/ui';
import type { NomeIcone } from '../../components/ui';
import { ALVO_TOQUE, cores, espaco, raio, tipografia } from '../../lib/tema';

/**
 * Mais — o que não é do dia a dia.
 *
 * Leitura longa (saúde) e ferramenta (diagnóstico). Nada aqui precisa ser
 * alcançado com o polegar em três segundos, que é justamente por que não
 * ocupa uma aba própria.
 */
const DESTINOS: {
  href: '/saude' | '/debug';
  icone: NomeIcone;
  titulo: string;
  descricao: string;
}[] = [
  {
    href: '/saude',
    icone: 'saude',
    titulo: 'Saúde financeira',
    descricao: 'Indicadores, 12 meses, categorias e a divisão Casa x Pessoal',
  },
  {
    href: '/debug',
    icone: 'diagnostico',
    titulo: 'Diagnóstico do banco',
    descricao: 'Migrations aplicadas, contagens e avisos agendados',
  },
];

export default function TelaMais() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.tela, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[estilos.conteudo, { paddingBottom: insets.bottom + espaco.xxl }]}
      >
        <Seccao titulo="Mais">
          <View style={estilos.lista}>
            {DESTINOS.map((destino) => (
              <Link key={destino.href} href={destino.href} asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={destino.titulo}
                  style={({ pressed }) => [estilos.item, pressed && estilos.itemPressionado]}
                >
                  <ChipIcone nome={destino.icone} tom="acento" />
                  <View style={estilos.texto}>
                    <Text style={estilos.titulo}>{destino.titulo}</Text>
                    <Text style={estilos.descricao}>{destino.descricao}</Text>
                  </View>
                  <Icone nome="seguinte" tamanho={20} cor={cores.textoFraco} />
                </Pressable>
              </Link>
            ))}
          </View>
        </Seccao>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg },
  lista: { gap: espaco.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: ALVO_TOQUE,
    padding: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
  },
  itemPressionado: { backgroundColor: cores.superficieBaixa },
  texto: { flex: 1 },
  titulo: tipografia.secao,
  descricao: { ...tipografia.apoio, fontSize: 12, marginTop: 2 },
});
