import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PainelObjetivos } from '../../components/PainelObjetivos';
import { PainelRecorrencias } from '../../components/PainelRecorrencias';
import { ALVO_TOQUE, cores, espaco, raio, tipografia } from '../../lib/tema';

/**
 * Planejamento — o que se repete e o que se persegue.
 *
 * Recorrências e objetivos responderam a perguntas diferentes o suficiente para
 * merecer abas próprias, mas são a mesma atividade: decidir hoje o que vai
 * acontecer com o dinheiro depois. Ficam sob um destino só, separados por um
 * seletor.
 */
const PAINEIS = [
  { chave: 'recorrencias', rotulo: 'Recorrências' },
  { chave: 'objetivos', rotulo: 'Objetivos' },
] as const;

type Chave = (typeof PAINEIS)[number]['chave'];

export default function TelaPlanejamento() {
  const insets = useSafeAreaInsets();
  const [aberto, setAberto] = useState<Chave>('recorrencias');

  return (
    <View style={[estilos.tela, { paddingTop: insets.top }]}>
      <View style={estilos.seletor} accessibilityRole="tablist">
        {PAINEIS.map(({ chave, rotulo }) => {
          const ativo = aberto === chave;
          return (
            <Pressable
              key={chave}
              onPress={() => setAberto(chave)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              style={[estilos.opcao, ativo && estilos.opcaoAtiva]}
            >
              <Text style={[estilos.rotulo, ativo && estilos.rotuloAtivo]}>{rotulo}</Text>
            </Pressable>
          );
        })}
      </View>

      {aberto === 'recorrencias' ? <PainelRecorrencias /> : <PainelObjetivos />}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  seletor: {
    flexDirection: 'row',
    gap: espaco.xs,
    margin: espaco.lg,
    marginBottom: espaco.sm,
    padding: espaco.xs,
    backgroundColor: cores.superficieBaixa,
    borderRadius: raio.pill,
  },
  opcao: {
    flex: 1,
    minHeight: ALVO_TOQUE - espaco.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: raio.pill,
  },
  opcaoAtiva: { backgroundColor: cores.superficie },
  rotulo: { ...tipografia.corpo, color: cores.textoFraco },
  rotuloAtivo: { ...tipografia.secao, fontSize: 14, color: cores.acento },
});
