import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { formatarMesCurto, formatarMoeda, formatarMoedaCompacta } from '../lib/format';
import { cores, espaco, fontes, tipografia } from '../lib/tema';
import type { PontoHistorico } from '../services/saudeFinanceira';

/**
 * Receita mês a mês, 12 meses, com a média móvel de 3 meses como linha de
 * referência.
 *
 * Por que UMA série e não receitas x despesas: o validador de paleta reprovou
 * o par verde #1F7A4D / vermelho #A32C2C do app — ΔE 4,8 em deuteranopia,
 * abaixo até do piso de 6. Duas linhas nessas cores seriam indistinguíveis
 * para daltonismo vermelho-verde, e trocar as cores quebraria a semântica
 * "verde entra / vermelho sai" usada no app inteiro. Com uma série só, o
 * problema não existe — e receita é justamente o que importa aqui, porque a
 * renda é irregular e a média móvel é a base de planejamento.
 *
 * O saldo mês a mês aparece logo abaixo, na tira divergente, onde o
 * significado vem da posição em relação ao zero e não da cor.
 */
export function GraficoReceita({
  serie,
  mediaMovel,
}: {
  serie: readonly PontoHistorico[];
  /** Centavos. `null` sem histórico — a linha some. */
  mediaMovel: number | null;
}) {
  const { width } = useWindowDimensions();

  // Largura útil: tela − padding da tela − padding do cartão − eixo Y.
  const larguraGrafico = Math.max(180, width - espaco.lg * 2 - espaco.lg * 2 - 46);
  const passo = larguraGrafico / Math.max(1, serie.length);
  const larguraBarra = Math.max(6, Math.round(passo * 0.56));
  const vao = Math.max(3, Math.round(passo * 0.44));

  const emReais = (centavos: number) => centavos / 100;
  const ultimo = serie.length - 1;

  const dados = serie.map((p, i) => ({
    value: emReais(p.receitas),
    // Rótulo a cada 3 meses: doze rótulos de três letras colidiriam.
    label: i % 3 === 0 || i === ultimo ? formatarMesCurto(p.anoMes) : '',
    frontColor: i === ultimo ? cores.texto : cores.entrada,
  }));

  const maiorReceita = Math.max(0, ...serie.map((p) => p.receitas));
  const referencia = mediaMovel ?? 0;
  const teto = Math.max(maiorReceita, referencia);
  // Nunca zero: a lib divide pelo maxValue ao posicionar as barras.
  const maxValue = teto > 0 ? emReais(teto) * 1.15 : 1;

  const receitaDoMes = serie.length > 0 ? serie[ultimo].receitas : 0;

  return (
    <View>
      <View style={estilos.legenda}>
        <View style={estilos.legendaItem}>
          <View style={[estilos.amostra, { backgroundColor: cores.texto }]} />
          <Text style={estilos.legendaTexto}>
            Mês exibido · {formatarMoeda(receitaDoMes)}
          </Text>
        </View>
        {mediaMovel !== null ? (
          <View style={estilos.legendaItem}>
            <View style={estilos.amostraTracejada} />
            <Text style={estilos.legendaTexto}>Média de 3 meses · {formatarMoeda(mediaMovel)}</Text>
          </View>
        ) : null}
      </View>

      <BarChart
        data={dados}
        width={larguraGrafico}
        height={132}
        barWidth={larguraBarra}
        spacing={vao}
        initialSpacing={vao}
        endSpacing={0}
        roundedTop
        barBorderRadius={3}
        maxValue={maxValue}
        noOfSections={3}
        hideRules={false}
        rulesColor={cores.contorno}
        rulesThickness={1}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={cores.contorno}
        yAxisTextStyle={estilos.eixo}
        xAxisLabelTextStyle={estilos.eixo}
        formatYLabel={(rotulo: string) => formatarMoedaCompacta(Number(rotulo) * 100)}
        disableScroll
        showReferenceLine1={mediaMovel !== null}
        referenceLine1Position={emReais(referencia)}
        referenceLine1Config={{
          color: cores.textoMedio,
          dashWidth: 4,
          dashGap: 4,
          thickness: 1,
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  legenda: { gap: espaco.xs, marginBottom: espaco.md },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  amostra: { width: 10, height: 10, borderRadius: 2 },
  amostraTracejada: {
    width: 10,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.textoMedio,
  },
  legendaTexto: { ...tipografia.apoio, fontSize: 11, color: cores.textoMedio },
  eixo: { fontFamily: fontes.numero, fontSize: 9, color: cores.textoFraco },
});
