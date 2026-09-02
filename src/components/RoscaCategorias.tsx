import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { formatarMoeda } from '../lib/format';
import { COR_OUTRAS, cores, coresCategorias, espaco, tipografia } from '../lib/tema';
import { OUTRAS, type FatiaCategoria } from '../services/saudeFinanceira';

/**
 * Despesas do mês por categoria.
 *
 * A paleta é de três slots mais o cinza de "Outras" — não é preguiça, é o corte
 * exato que passa na separação para daltonismo com TODOS os pares em jogo. Ver
 * `coresCategorias` em `lib/tema.ts`.
 *
 * Duas coisas aqui não são decorativas e não podem sair:
 *
 * 1. Cada fatia é rotulada com nome e valor na legenda. Duas fatias ficam
 *    abaixo de 3:1 contra o branco, e o par cinza/verde fica na banda de CVD que
 *    só é legal COM codificação secundária. O rótulo é essa codificação.
 * 2. O vão de 2px entre fatias, na cor da superfície, para duas cores vizinhas
 *    nunca encostarem uma na outra.
 *
 * Número e nome vestem token de texto. A cor mora no ponto da legenda e na
 * fatia, nunca na palavra.
 */
export function RoscaCategorias({
  fatias,
  total,
  oculto = false,
}: {
  fatias: readonly FatiaCategoria[];
  total: number;
  oculto?: boolean;
}) {
  if (fatias.length === 0) {
    return <Text style={estilos.vazio}>Nenhuma despesa neste mês.</Text>;
  }

  const comCor = fatias.map((fatia, indice) => ({
    fatia,
    cor: fatia.nome === OUTRAS ? COR_OUTRAS : (coresCategorias[indice] ?? COR_OUTRAS),
  }));

  return (
    <View style={estilos.bloco}>
      <PieChart
        data={comCor.map(({ fatia, cor }) => ({ value: fatia.valor, color: cor }))}
        donut
        radius={68}
        innerRadius={46}
        innerCircleColor={cores.superficie}
        strokeWidth={2}
        strokeColor={cores.superficie}
        centerLabelComponent={() => (
          <View style={estilos.centro}>
            <Text style={estilos.centroEtiqueta}>Total</Text>
            <Text style={estilos.centroValor} numberOfLines={1} adjustsFontSizeToFit>
              {oculto ? '•••' : formatarMoeda(total)}
            </Text>
          </View>
        )}
      />

      <View style={estilos.legenda}>
        {comCor.map(({ fatia, cor }) => (
          <View key={`${fatia.categoriaId ?? 'n'}-${fatia.nome}`} style={estilos.item}>
            <View style={[estilos.ponto, { backgroundColor: cor }]} />
            <Text style={estilos.nome} numberOfLines={1}>
              {fatia.nome}
            </Text>
            <Text style={estilos.valor}>{oculto ? '•••' : formatarMoeda(fatia.valor)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { flexDirection: 'row', alignItems: 'center', gap: espaco.lg },
  centro: { alignItems: 'center', paddingHorizontal: espaco.xs },
  centroEtiqueta: { ...tipografia.etiqueta, fontSize: 10 },
  centroValor: { ...tipografia.valor, fontSize: 13, marginTop: 1 },
  legenda: { flex: 1, gap: espaco.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  nome: { ...tipografia.corpo, flex: 1 },
  valor: tipografia.valorApoio,
  vazio: { ...tipografia.apoio, color: cores.textoFraco, fontStyle: 'italic' },
});
