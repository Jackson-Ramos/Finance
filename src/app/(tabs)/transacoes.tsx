import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecalhoMes } from '../../components/CabecalhoMes';
import { ListaDoMes } from '../../components/ListaDoMes';
import { useAcoesLancamento, useDadosDoMes, useMesStore } from '../../hooks/useMes';
import { useFolhaLancamento } from '../../hooks/useFolhaLancamento';
import { formatarMesAno } from '../../lib/format';
import { cores, espaco, tipografia } from '../../lib/tema';

/**
 * Transações — todo lançamento do mês, agrupado por dia.
 *
 * Compartilha o mês com o Painel e com a Saúde: navegar aqui navega lá. Quem
 * abre a folha de edição é o store, não esta tela — o mesmo caminho que o FAB
 * da barra de abas usa.
 */
export default function TelaTransacoes() {
  const insets = useSafeAreaInsets();
  const { anoMes, anterior, seguinte, voltarParaHoje } = useMesStore();
  const { dados, erro } = useDadosDoMes(anoMes);
  const acoes = useAcoesLancamento();
  const abrirFolha = useFolhaLancamento((s) => s.abrir);

  return (
    <View style={[estilos.tela, { paddingTop: insets.top }]}>
      <CabecalhoMes
        anoMes={anoMes}
        aoVoltar={anterior}
        aoAvancar={seguinte}
        aoVoltarParaHoje={voltarParaHoje}
      />

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      <ListaDoMes
        grupos={dados?.grupos ?? []}
        aoTocarItem={(item) => {
          acoes.limparErro();
          abrirFolha(item);
        }}
        aoAlternarPago={acoes.alternarPago}
        mesVazio={
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTitulo}>{formatarMesAno(anoMes)} está em branco</Text>
            <Text style={estilos.vazioTexto}>
              Toque no + para registrar o primeiro lançamento do mês.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
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
  vazioTitulo: { ...tipografia.secao, color: cores.textoMedio },
  vazioTexto: { ...tipografia.apoio, color: cores.textoFraco, textAlign: 'center' },
});
