import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecalhoMes } from '../../components/CabecalhoMes';
import { FolhaLancamento } from '../../components/FolhaLancamento';
import { ListaDoMes } from '../../components/ListaDoMes';
import { ResumoDoMes } from '../../components/ResumoDoMes';
import {
  useAcoesLancamento,
  useCategoriasAtivas,
  useDadosDoMes,
  useMesStore,
  type ItemDoMes,
} from '../../hooks/useMes';
import { useObjetivosAtivos } from '../../hooks/useObjetivos';
import { formatarMesAno } from '../../lib/format';
import { cores, espaco, REGUA, tipografia } from '../../lib/tema';

/**
 * Tela do mês — a tela principal do app.
 */
export default function TelaDoMes() {
  const insets = useSafeAreaInsets();
  const { anoMes, anterior, seguinte, voltarParaHoje } = useMesStore();
  const { dados, erro: erroLeitura } = useDadosDoMes(anoMes);
  const categorias = useCategoriasAtivas();
  const objetivos = useObjetivosAtivos();
  const acoes = useAcoesLancamento();

  const [folhaAberta, setFolhaAberta] = useState(false);
  const [emEdicao, setEmEdicao] = useState<ItemDoMes | null>(null);

  function abrirNovo() {
    acoes.limparErro();
    setEmEdicao(null);
    setFolhaAberta(true);
  }

  function abrirEdicao(item: ItemDoMes) {
    acoes.limparErro();
    setEmEdicao(item);
    setFolhaAberta(true);
  }

  return (
    <View style={[estilos.tela, { paddingTop: insets.top }]}>
      <CabecalhoMes
        anoMes={anoMes}
        aoVoltar={anterior}
        aoAvancar={seguinte}
        aoVoltarParaHoje={voltarParaHoje}
      />

      {erroLeitura ? <Text style={estilos.erro}>{erroLeitura}</Text> : null}

      <ListaDoMes
        grupos={dados?.grupos ?? []}
        aoTocarItem={abrirEdicao}
        aoAlternarPago={acoes.alternarPago}
        cabecalho={
          dados && dados.quantidade > 0 ? <ResumoDoMes resumo={dados.resumo} /> : undefined
        }
        rodape={
          dados && dados.quantidade > 0 ? (
            <Link href="/debug" style={estilos.rodapeLink}>
              Diagnóstico do banco
            </Link>
          ) : null
        }
        mesVazio={<Vazio anoMes={anoMes} />}
      />

      <Pressable
        onPress={abrirNovo}
        accessibilityRole="button"
        accessibilityLabel="Novo lançamento"
        style={({ pressed }) => [
          estilos.botaoFlutuante,
          { bottom: espaco.xl },
          pressed && estilos.botaoPressionado,
        ]}
      >
        <Text style={estilos.botaoGlifo}>+</Text>
      </Pressable>

      <FolhaLancamento
        visivel={folhaAberta}
        aoFechar={() => setFolhaAberta(false)}
        categorias={categorias}
        objetivos={objetivos}
        anoMes={anoMes}
        emEdicao={emEdicao}
        aoSalvar={acoes.salvar}
        aoExcluir={acoes.excluir}
        erro={acoes.erro}
      />
    </View>
  );
}

function Vazio({ anoMes }: { anoMes: string }) {
  return (
    <View style={estilos.vazio}>
      <Text style={estilos.vazioTitulo}>{formatarMesAno(anoMes)} está em branco</Text>
      <Text style={estilos.vazioTexto}>
        Toque em + para registrar o primeiro lançamento do mês.
      </Text>
      <Link href="/debug" style={estilos.rodapeLink}>
        Diagnóstico do banco
      </Link>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.papel },
  erro: {
    ...tipografia.apoio,
    color: cores.saida,
    marginHorizontal: espaco.lg,
    marginBottom: espaco.sm,
  },
  vazio: {
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.xl,
    paddingTop: espaco.xxl,
  },
  vazioTitulo: { ...tipografia.corpo, color: cores.tintaMedia },
  vazioTexto: { ...tipografia.apoio, color: cores.tintaFraca, textAlign: 'center' },
  rodapeLink: {
    ...tipografia.apoio,
    color: cores.tintaFraca,
    textAlign: 'center',
    padding: espaco.lg,
  },
  botaoFlutuante: {
    position: 'absolute',
    right: espaco.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.tinta,
    borderWidth: REGUA,
    borderColor: cores.tinta,
    // Sombra discreta: o resto da tela usa régua, mas o botão precisa flutuar.
    elevation: 6,
    shadowColor: cores.tinta,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  botaoPressionado: { backgroundColor: cores.tintaMedia },
  botaoGlifo: { fontSize: 30, lineHeight: 34, color: cores.papel },
});
