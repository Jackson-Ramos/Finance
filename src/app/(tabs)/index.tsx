import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecalhoMes } from '../../components/CabecalhoMes';
import { RoscaCategorias } from '../../components/RoscaCategorias';
import { Cartao, ChipIcone, Icone, PillValor, Seccao } from '../../components/ui';
import { useDadosDoMes, useMesStore } from '../../hooks/useMes';
import { useDistribuicaoDoMes } from '../../hooks/useSaude';
import { formatarMoeda } from '../../lib/format';
import { ALVO_TOQUE, cores, espaco, LIMITE_FATIAS, raio, tipografia } from '../../lib/tema';

/**
 * Painel do mês — a primeira tela do app.
 *
 * Responde a uma pergunta só: como está o mês. O detalhe de cada lançamento é
 * assunto da aba Transações; aqui ficam o saldo, para onde o dinheiro foi, e um
 * caminho para a leitura longa da saúde financeira.
 */
export default function TelaPrincipal() {
  const insets = useSafeAreaInsets();
  const { anoMes, anterior, seguinte, voltarParaHoje } = useMesStore();
  const { dados, erro } = useDadosDoMes(anoMes);
  const { fatias, total } = useDistribuicaoDoMes(anoMes, LIMITE_FATIAS);

  // Não persistido de propósito: fechar o app traz os valores de volta.
  const [oculto, setOculto] = useState(false);

  const resumo = dados?.resumo;
  const saldo = resumo?.realizado.saldo ?? 0;

  return (
    <View style={[estilos.tela, { paddingTop: insets.top }]}>
      <CabecalhoMes
        anoMes={anoMes}
        aoVoltar={anterior}
        aoAvancar={seguinte}
        aoVoltarParaHoje={voltarParaHoje}
      />

      <ScrollView
        contentContainerStyle={[estilos.conteudo, { paddingBottom: insets.bottom + espaco.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

        <Cartao>
          <View style={estilos.heroiTopo}>
            <Text style={estilos.heroiEtiqueta}>Saldo realizado</Text>
            <Pressable
              onPress={() => setOculto((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={oculto ? 'Mostrar valores' : 'Ocultar valores'}
              hitSlop={12}
              style={estilos.olho}
            >
              <Icone
                nome={oculto ? 'olhoFechado' : 'olhoAberto'}
                tamanho={20}
                cor={cores.textoFraco}
              />
            </Pressable>
          </View>

          <Text
            style={[estilos.heroiValor, saldo < 0 && { color: cores.saida }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {oculto ? '••••••' : formatarMoeda(saldo)}
          </Text>
          <Text style={estilos.heroiApoio}>
            {oculto
              ? 'valores ocultos'
              : `previsto para o mês ${formatarMoeda(resumo?.previsto.saldo ?? 0)}`}
          </Text>

          <View style={estilos.par}>
            <PillValor
              nome="entrada"
              tom="entrada"
              rotulo="Receitas"
              valor={formatarMoeda(resumo?.realizado.receitas ?? 0)}
              apoio={`de ${formatarMoeda(resumo?.previsto.receitas ?? 0)}`}
              oculto={oculto}
            />
            <PillValor
              nome="saida"
              tom="saida"
              rotulo="Despesas"
              valor={formatarMoeda(resumo?.realizado.despesas ?? 0)}
              apoio={`de ${formatarMoeda(resumo?.previsto.despesas ?? 0)}`}
              oculto={oculto}
            />
          </View>

          {resumo && resumo.contagem.pendentes > 0 ? (
            <View style={estilos.pendentes}>
              <Text style={estilos.pendentesTexto}>
                {resumo.contagem.pendentes}{' '}
                {resumo.contagem.pendentes === 1
                  ? 'lançamento em aberto'
                  : 'lançamentos em aberto'}
              </Text>
            </View>
          ) : null}
        </Cartao>

        <Seccao
          titulo="Despesas por categoria"
          legenda="Pagas e em aberto · as três maiores, o resto em Outras"
        >
          <Cartao>
            <RoscaCategorias fatias={fatias} total={total} oculto={oculto} />
          </Cartao>
        </Seccao>

        <Seccao titulo="Ir mais fundo">
          <Link href="/saude" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Saúde financeira"
              style={({ pressed }) => [estilos.atalho, pressed && estilos.atalhoPressionado]}
            >
              <ChipIcone nome="saude" tom="acento" />
              <View style={estilos.atalhoTexto}>
                <Text style={estilos.atalhoTitulo}>Saúde financeira</Text>
                <Text style={estilos.atalhoApoio}>Indicadores e os últimos 12 meses</Text>
              </View>
              <Icone nome="seguinte" tamanho={20} cor={cores.textoFraco} />
            </Pressable>
          </Link>
        </Seccao>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg },
  erro: { ...tipografia.apoio, color: cores.saida, marginBottom: espaco.sm },

  heroiTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroiEtiqueta: tipografia.etiqueta,
  olho: {
    width: ALVO_TOQUE,
    height: ALVO_TOQUE,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  heroiValor: { ...tipografia.saldoHeroi, marginTop: espaco.xs },
  heroiApoio: { ...tipografia.apoio, fontSize: 12, marginTop: espaco.xs },
  par: { flexDirection: 'row', gap: espaco.md, marginTop: espaco.lg },
  pendentes: {
    marginTop: espaco.lg,
    paddingTop: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.contorno,
  },
  pendentesTexto: { ...tipografia.apoio, fontSize: 12 },

  atalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: ALVO_TOQUE,
    padding: espaco.lg,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
  },
  atalhoPressionado: { backgroundColor: cores.superficieBaixa },
  atalhoTexto: { flex: 1 },
  atalhoTitulo: tipografia.secao,
  atalhoApoio: { ...tipografia.apoio, fontSize: 12, marginTop: 2 },
});
