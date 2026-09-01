import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FolhaRecorrencia } from '../../components/FolhaRecorrencia';
import {
  useAcoesRecorrencia,
  useCategoriasDespesa,
  useListaRecorrencias,
  type Recorrencia,
} from '../../hooks/useRecorrencias';
import { anoMesAtual, diaDoMesGrampeado, diasNoMes } from '../../lib/date';
import { formatarDataCurta, formatarMoedaComSinal } from '../../lib/format';
import { cores, corDoTipo, espaco, raio, REGUA, tipografia } from '../../lib/tema';

/**
 * Recorrências — as contas que se repetem todo mês.
 *
 * Cada linha é uma REGRA, não um lançamento. O app carimba um lançamento em
 * aberto por mês a partir dela, sempre no dia escolhido.
 */
export default function TelaRecorrencias() {
  const insets = useSafeAreaInsets();
  const { dados, erro: erroLeitura } = useListaRecorrencias();
  const categorias = useCategoriasDespesa();
  const acoes = useAcoesRecorrencia();

  const [folhaAberta, setFolhaAberta] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Recorrencia | null>(null);

  function abrir(recorrencia: Recorrencia | null) {
    acoes.limparErro();
    setEmEdicao(recorrencia);
    setFolhaAberta(true);
  }

  const vazio = dados !== null && dados.total === 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[estilos.tela, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[estilos.conteudo, { paddingBottom: 120 }]}
        >
          <Text style={estilos.titulo}>Recorrências</Text>
          <Text style={estilos.subtitulo}>
            Ao abrir o app, cada recorrência ativa ganha um lançamento em aberto no mês corrente.
            Rodar de novo não duplica.
          </Text>

          {erroLeitura ? <Text style={estilos.erro}>{erroLeitura}</Text> : null}

          {vazio ? (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>Nenhuma recorrência ainda</Text>
              <Text style={estilos.vazioTexto}>
                Cadastre aluguel, assinaturas, mensalidades — tudo que cai todo mês na mesma data.
              </Text>
            </View>
          ) : null}

          {dados && dados.ativas.length > 0 ? (
            <Grupo titulo={`Ativas · ${dados.ativas.length}`}>
              {dados.ativas.map((r) => (
                <Linha
                  key={r.id}
                  recorrencia={r}
                  categorias={categorias}
                  aoTocar={() => abrir(r)}
                  aoAlternar={() => acoes.alternarAtivo(r)}
                />
              ))}
            </Grupo>
          ) : null}

          {dados && dados.pausadas.length > 0 ? (
            <Grupo titulo={`Pausadas · ${dados.pausadas.length}`}>
              {dados.pausadas.map((r) => (
                <Linha
                  key={r.id}
                  recorrencia={r}
                  categorias={categorias}
                  aoTocar={() => abrir(r)}
                  aoAlternar={() => acoes.alternarAtivo(r)}
                />
              ))}
            </Grupo>
          ) : null}
        </ScrollView>

        <Pressable
          onPress={() => abrir(null)}
          accessibilityRole="button"
          accessibilityLabel="Nova recorrência"
          style={({ pressed }) => [
            estilos.botaoFlutuante,
            { bottom: espaco.xl },
            pressed && estilos.botaoPressionado,
          ]}
        >
          <Text style={estilos.botaoGlifo}>+</Text>
        </Pressable>

        <FolhaRecorrencia
          visivel={folhaAberta}
          aoFechar={() => setFolhaAberta(false)}
          categorias={categorias}
          emEdicao={emEdicao}
          aoSalvar={acoes.salvar}
          aoExcluir={acoes.excluir}
          erro={acoes.erro}
        />
      </View>
    </>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.grupo}>
      <View style={estilos.grupoCabecalho}>
        <Text style={estilos.grupoTitulo}>{titulo}</Text>
        <View style={estilos.grupoLinha} />
      </View>
      {children}
    </View>
  );
}

function Linha({
  recorrencia,
  categorias,
  aoTocar,
  aoAlternar,
}: {
  recorrencia: Recorrencia;
  categorias: { id: number; nome: string; cor: string | null; icone: string | null }[];
  aoTocar: () => void;
  aoAlternar: () => void;
}) {
  const ativa = recorrencia.ativo === 1;
  const cor = corDoTipo[recorrencia.tipo];
  const categoria = categorias.find((c) => c.id === recorrencia.categoriaId);

  const mes = anoMesAtual();
  const grampeado = recorrencia.diaDoMes > diasNoMes(mes);
  const dataNoMes = diaDoMesGrampeado(mes, recorrencia.diaDoMes);

  const legenda = [
    categoria?.nome,
    recorrencia.tipo === 'DESPESA' ? recorrencia.natureza.toLowerCase() : null,
    grampeado ? `dia ${recorrencia.diaDoMes} → ${formatarDataCurta(dataNoMes)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[estilos.linha, !ativa && estilos.linhaPausada]}>
      <Pressable
        onPress={aoTocar}
        accessibilityRole="button"
        accessibilityLabel={`${recorrencia.descricao}, dia ${recorrencia.diaDoMes}. Tocar para editar.`}
        style={estilos.linhaToque}
      >
        <View style={[estilos.dia, { borderColor: ativa ? cor : cores.regua }]}>
          <Text style={[estilos.diaNumero, { color: ativa ? cor : cores.tintaFraca }]}>
            {recorrencia.diaDoMes}
          </Text>
        </View>

        <View style={estilos.textos}>
          <Text style={estilos.descricao} numberOfLines={1}>
            {categoria?.icone ? `${categoria.icone}  ` : ''}
            {recorrencia.descricao}
          </Text>
          {legenda ? (
            <Text style={estilos.legenda} numberOfLines={1}>
              {legenda}
            </Text>
          ) : null}
        </View>

        <Text style={[estilos.valor, { color: ativa ? cor : cores.tintaFraca }]}>
          {formatarMoedaComSinal(recorrencia.valorPrevisto, recorrencia.tipo)}
        </Text>
      </Pressable>

      <Pressable
        onPress={aoAlternar}
        hitSlop={8}
        accessibilityRole="switch"
        accessibilityState={{ checked: ativa }}
        accessibilityLabel={ativa ? 'Pausar recorrência' : 'Reativar recorrência'}
        style={[estilos.selo, ativa && { borderColor: cor }]}
      >
        <Text style={[estilos.seloTexto, ativa && { color: cor }]}>{ativa ? 'ativa' : 'pausada'}</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.papel },
  conteudo: { paddingHorizontal: espaco.lg },
  titulo: { ...tipografia.mes, fontSize: 18, letterSpacing: 1.6, marginTop: espaco.lg },
  subtitulo: { ...tipografia.apoio, color: cores.tintaFraca, marginTop: espaco.sm },
  erro: { ...tipografia.apoio, color: cores.saida, marginTop: espaco.md },

  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioTitulo: { ...tipografia.corpo, color: cores.tintaMedia },
  vazioTexto: { ...tipografia.apoio, color: cores.tintaFraca, textAlign: 'center' },

  grupo: { marginTop: espaco.xl },
  grupoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    marginBottom: espaco.sm,
  },
  grupoTitulo: tipografia.etiqueta,
  grupoLinha: { flex: 1, height: REGUA, backgroundColor: cores.regua },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    backgroundColor: cores.folha,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
    paddingRight: espaco.md,
    marginBottom: espaco.sm,
  },
  linhaPausada: { backgroundColor: cores.papelFundo },
  linhaToque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    padding: espaco.md,
  },
  dia: {
    width: 36,
    height: 36,
    borderRadius: raio.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaNumero: { ...tipografia.numeroLinha, fontSize: 14 },
  textos: { flex: 1, gap: 2 },
  descricao: tipografia.corpo,
  legenda: { ...tipografia.apoio, fontSize: 11, color: cores.tintaFraca },
  valor: tipografia.numeroLinha,

  selo: {
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
    borderRadius: raio.sm,
    borderWidth: REGUA,
    borderColor: cores.regua,
  },
  seloTexto: { ...tipografia.etiqueta, fontSize: 9, color: cores.tintaFraca },

  botaoFlutuante: {
    position: 'absolute',
    right: espaco.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.tinta,
    elevation: 6,
    shadowColor: cores.tinta,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  botaoPressionado: { backgroundColor: cores.tintaMedia },
  botaoGlifo: { fontSize: 30, lineHeight: 34, color: cores.papel },
});
