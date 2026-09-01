import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import { formatarCabecalhoDia, formatarMoeda, formatarMoedaComSinal } from '../lib/format';
import { cores, corDoTipo, espaco, raio, REGUA, tipografia } from '../lib/tema';
import type { GrupoDia } from '../services/agrupamento';
import type { ItemDoMes } from '../hooks/useMes';
import { LinhaDeslizavel } from './LinhaDeslizavel';

/**
 * Lista do mês, agrupada por dia.
 *
 * Cada dia abre com uma régua — rótulo à esquerda, linha atravessando, saldo do
 * dia à direita — como a pauta de um livro-caixa.
 */
export function ListaDoMes({
  grupos,
  aoTocarItem,
  aoAlternarPago,
  cabecalho,
  rodape,
  mesVazio,
}: {
  grupos: GrupoDia<ItemDoMes>[];
  aoTocarItem: (item: ItemDoMes) => void;
  /** Disparado pelo deslize para a direita. */
  aoAlternarPago: (item: ItemDoMes) => void;
  cabecalho?: React.ReactElement;
  rodape?: React.ReactElement | null;
  mesVazio: React.ReactElement;
}) {
  return (
    <SectionList
      sections={grupos.map((g) => ({ ...g, key: g.data, data: g.itens }))}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={cabecalho}
      ListFooterComponent={rodape}
      ListEmptyComponent={mesVazio}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <ReguaDia data={section.key} saldoDoDia={section.saldoDoDia} />
      )}
      renderItem={({ item }) => (
        <LinhaDeslizavel
          aoAtivar={() => aoAlternarPago(item)}
          rotulo={
            item.pago === 1 ? 'Reabrir' : item.tipo === 'RECEITA' ? 'Recebido' : 'Pago'
          }
          glifo={item.pago === 1 ? '↩' : '✓'}
          cor={item.pago === 1 ? cores.tintaFraca : corDoTipo[item.tipo]}
        >
          <ItemLancamento item={item} aoTocar={() => aoTocarItem(item)} />
        </LinhaDeslizavel>
      )}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function ReguaDia({ data, saldoDoDia }: { data: string; saldoDoDia: number }) {
  const cor = saldoDoDia < 0 ? cores.saida : saldoDoDia > 0 ? cores.entrada : cores.tintaFraca;

  return (
    <View style={estilos.regua}>
      <Text style={estilos.reguaRotulo}>{formatarCabecalhoDia(data)}</Text>
      <View style={estilos.reguaLinha} />
      <Text style={[estilos.reguaSaldo, { color: cor }]}>
        {saldoDoDia === 0
          ? formatarMoeda(0)
          : `${saldoDoDia > 0 ? '+ ' : '− '}${formatarMoeda(Math.abs(saldoDoDia))}`}
      </Text>
    </View>
  );
}

function ItemLancamento({ item, aoTocar }: { item: ItemDoMes; aoTocar: () => void }) {
  const cor = corDoTipo[item.tipo];
  const pendente = item.pago !== 1;
  const titulo = item.descricao ?? item.categoriaNome ?? 'Sem descrição';
  const legenda = [
    item.descricao && item.categoriaNome ? item.categoriaNome : null,
    pendente ? (item.tipo === 'RECEITA' ? 'a receber' : 'a pagar') : null,
    item.natureza === 'FIXA' ? 'fixa' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${formatarMoedaComSinal(item.valor, item.tipo)}${
        pendente ? ', em aberto' : ''
      }. Tocar para editar.`}
      style={({ pressed }) => [estilos.item, pressed && estilos.itemPressionado]}
    >
      <View style={[estilos.icone, { backgroundColor: item.categoriaCor ?? cores.papelFundo }]}>
        <Text style={estilos.iconeGlifo}>{item.categoriaIcone ?? '•'}</Text>
      </View>

      <View style={estilos.itemTextos}>
        <Text style={estilos.itemTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        {legenda ? (
          <Text style={estilos.itemLegenda} numberOfLines={1}>
            {legenda}
          </Text>
        ) : null}
      </View>

      <View style={estilos.itemDireita}>
        <Text style={[estilos.itemValor, { color: pendente ? cores.tintaMedia : cor }]}>
          {formatarMoedaComSinal(item.valor, item.tipo)}
        </Text>
        {pendente ? <View style={[estilos.pendente, { borderColor: cor }]} /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingBottom: 120 },

  regua: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    marginTop: espaco.lg,
    marginBottom: espaco.sm,
  },
  reguaRotulo: tipografia.etiqueta,
  reguaLinha: { flex: 1, height: REGUA, backgroundColor: cores.regua },
  reguaSaldo: { ...tipografia.numeroApoio, fontSize: 11 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    marginHorizontal: espaco.lg,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    backgroundColor: cores.folha,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
    marginBottom: espaco.sm,
  },
  itemPressionado: { backgroundColor: cores.papelFundo },
  icone: {
    width: 34,
    height: 34,
    borderRadius: raio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeGlifo: { fontSize: 16 },
  itemTextos: { flex: 1, gap: 2 },
  itemTitulo: tipografia.corpo,
  itemLegenda: { ...tipografia.apoio, fontSize: 11, color: cores.tintaFraca },
  itemDireita: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  itemValor: tipografia.numeroLinha,
  pendente: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
