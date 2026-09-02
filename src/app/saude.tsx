import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecalhoMes } from '../components/CabecalhoMes';
import { CabecalhoPilha, Cartao, Seccao } from '../components/ui';
import { GraficoReceita } from '../components/GraficoReceita';
import {
  BarrasPorCategoria,
  CartaoIndicador,
  DivisaoGrupos,
  TiraSaldo,
} from '../components/GraficosSaude';
import { useMesStore } from '../hooks/useMes';
import { usePainelSaude } from '../hooks/useSaude';
import { formatarMesCurto, formatarMeses, formatarMoeda, formatarPercentual } from '../lib/format';
import { cores, elevacao, espaco, raio, tipografia } from '../lib/tema';
import {
  situacaoDividas,
  situacaoFixas,
  situacaoPoupanca,
  situacaoReserva,
} from '../services/saudeFinanceira';

/**
 * Saúde financeira.
 *
 * Compartilha o mês com a tela do mês (`useMesStore`), então navegar aqui
 * navega lá — é sempre o mesmo recorte de tempo.
 */
export default function TelaSaude() {
  const insets = useSafeAreaInsets();
  const { anoMes, anterior, seguinte, voltarParaHoje } = useMesStore();
  const { dados, erro } = usePainelSaude(anoMes);

  const i = dados?.indicadores;
  const fracao = (p: number | null) => (p === null ? 0 : Math.min(1, Math.max(0, p) / 100));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[estilos.tela, { paddingTop: insets.top }]}>
        <CabecalhoPilha titulo="Saúde financeira" />
        <CabecalhoMes
          anoMes={anoMes}
          aoVoltar={anterior}
          aoAvancar={seguinte}
          aoVoltarParaHoje={voltarParaHoje}
        />

        <ScrollView contentContainerStyle={estilos.conteudo}>
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

          {dados && dados.quantidade === 0 ? (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>Sem histórico para medir</Text>
              <Text style={estilos.vazioTexto}>
                Os indicadores aparecem quando houver lançamentos. As médias de três meses precisam
                dos meses anteriores a este.
              </Text>
            </View>
          ) : null}

          {i ? (
            <>
              {i.mesesComHistorico < 3 ? (
                <Text style={estilos.aviso}>
                  As médias usam {i.janela.map(formatarMesCurto).join(', ')}, e só{' '}
                  {i.mesesComHistorico} {i.mesesComHistorico === 1 ? 'tem' : 'têm'} lançamento. Os
                  meses vazios contam como zero e puxam a média para baixo.
                </Text>
              ) : null}

              <View style={estilos.grade}>
                <CartaoIndicador
                  rotulo="Comprometimento fixo"
                  valor={formatarPercentual(i.comprometimentoFixas)}
                  situacao={situacaoFixas(i.comprometimentoFixas)}
                  fracao={fracao(i.comprometimentoFixas)}
                  explicacao={`${formatarMoeda(i.despesasFixasDoMes)} de despesa fixa sobre a receita do mês. Até 30% é confortável.`}
                />
                <CartaoIndicador
                  rotulo="Comprometimento com dívidas"
                  valor={formatarPercentual(i.comprometimentoDividas)}
                  situacao={situacaoDividas(i.comprometimentoDividas)}
                  fracao={fracao(i.comprometimentoDividas)}
                  explicacao={`${formatarMoeda(i.despesasDeDividaDoMes)} em categorias marcadas como dívida. Até 10% é confortável.`}
                />
                <CartaoIndicador
                  rotulo="Taxa de poupança"
                  valor={formatarPercentual(i.taxaPoupanca)}
                  situacao={situacaoPoupanca(i.taxaPoupanca)}
                  fracao={fracao(i.taxaPoupanca)}
                  explicacao={`${formatarMoeda(i.aportesDoMes)} aportados sobre a receita do mês. 20% ou mais é a meta.`}
                />
                <CartaoIndicador
                  rotulo="Reserva"
                  valor={formatarMeses(i.reservaEmMeses)}
                  situacao={situacaoReserva(i.reservaEmMeses)}
                  fracao={i.reservaEmMeses === null ? 0 : Math.min(1, i.reservaEmMeses / 6)}
                  explicacao={`${formatarMoeda(i.totalGuardado)} guardados sobre a média de despesa fixa. A régua clássica é 6 meses.`}
                />
              </View>

              <View style={estilos.baseCaixa}>
                <Text style={estilos.baseEtiqueta}>Base de planejamento</Text>
                <Text style={estilos.baseValor}>
                  {i.mediaMovelReceita === null ? '—' : formatarMoeda(i.mediaMovelReceita)}
                </Text>
                <Text style={estilos.baseExplicacao}>
                  Média das receitas dos três meses anteriores. Como a renda é irregular, planeje
                  por este número, não pelo que entrou neste mês
                  {i.receitasDoMes > 0 ? ` (${formatarMoeda(i.receitasDoMes)})` : ''}.
                </Text>
              </View>

              <Secao
                titulo="Receita mês a mês"
                legenda="Doze meses até o mês exibido, com a média de três meses como referência."
              >
                <GraficoReceita serie={dados.serie} mediaMovel={i.mediaMovelReceita} />
              </Secao>

              <Secao
                titulo="Saldo mês a mês"
                legenda="Receitas menos despesas e aportes, mês a mês."
              >
                <TiraSaldo serie={dados.serie} />
              </Secao>

              <Secao
                titulo="Despesas por categoria"
                legenda={
                  dados.totalDespesas > 0
                    ? `${formatarMoeda(dados.totalDespesas)} no mês exibido.`
                    : 'Nenhuma despesa no mês exibido.'
                }
              >
                {dados.porCategoria.length > 0 ? (
                  <BarrasPorCategoria fatias={dados.porCategoria} />
                ) : (
                  <Text style={estilos.semDado}>Sem despesa para distribuir.</Text>
                )}
              </Secao>

              <Secao titulo="Casa e Pessoal" legenda="A mesma despesa, dividida por grupo.">
                {dados.grupos.length > 0 ? (
                  <DivisaoGrupos fatias={dados.grupos} />
                ) : (
                  <Text style={estilos.semDado}>Sem despesa para dividir.</Text>
                )}
              </Secao>
            </>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}

function Secao({
  titulo,
  legenda,
  children,
}: {
  titulo: string;
  legenda: string;
  children: React.ReactNode;
}) {
  return (
    <Seccao titulo={titulo} legenda={legenda}>
      <Cartao>{children}</Cartao>
    </Seccao>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg, paddingBottom: espaco.xxl },
  erro: { ...tipografia.apoio, color: cores.saida, marginBottom: espaco.md },

  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioTitulo: { ...tipografia.corpo, color: cores.textoMedio },
  vazioTexto: { ...tipografia.apoio, color: cores.textoFraco, textAlign: 'center' },

  aviso: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.textoMedio,
    backgroundColor: cores.superficieBaixa,
    padding: espaco.md,
    borderRadius: raio.md,
    marginBottom: espaco.md,
  },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },

  baseCaixa: {
    marginTop: espaco.lg,
    padding: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    ...elevacao.cartao,
  },
  baseEtiqueta: tipografia.etiqueta,
  baseValor: { ...tipografia.saldoHeroi, fontSize: 28, marginTop: espaco.xs },
  baseExplicacao: { ...tipografia.apoio, fontSize: 11, color: cores.textoFraco, marginTop: espaco.sm },
  semDado: { ...tipografia.apoio, color: cores.textoFraco, fontStyle: 'italic' },
});
