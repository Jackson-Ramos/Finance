import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAvisosAgendados } from '../hooks/useAvisos';
import { useBootStore } from '../hooks/useBoot';
import { useDadosDebug } from '../hooks/useDadosDebug';
import { formatarMesAno, formatarMoeda, ROTULO_TIPO } from '../lib/format';
import { cores, elevacao, espaco, raio, tipografia } from '../lib/tema';

/**
 * Diagnóstico do banco.
 *
 * Não é tela de produto: existe para inspecionar migrations, seed e
 * repositories no aparelho enquanto as fases avançam. Vira tela de ajustes
 * (com exportar/importar) na Fase 6.
 */
export default function TelaDebug() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const boot = useBootStore((s) => s.resultado);
  const { dados, erro, recarregar, criarDadosDeExemplo, recriarBanco, semear, limparLancamentos } =
    useDadosDebug();
  const avisos = useAvisosAgendados();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={estilos.tela}
        contentContainerStyle={[
          estilos.conteudo,
          { paddingTop: insets.top + espaco.md, paddingBottom: insets.bottom + espaco.xxl },
        ]}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={12}
          style={estilos.voltar}
        >
          <Text style={estilos.voltarTexto}>‹ Voltar</Text>
        </Pressable>

        <Text style={estilos.titulo}>Diagnóstico</Text>
        <Text style={estilos.legenda}>
          {dados ? formatarMesAno(dados.anoMes) : '—'} · banco v{boot?.versaoAtual ?? '?'} de{' '}
          {boot?.versaoAlvo ?? '?'} · boot em {boot?.duracaoMs ?? 0} ms
        </Text>
        <Text style={estilos.legenda}>
          geração no boot: {boot?.geracao.criados ?? 0} criadas · {boot?.geracao.jaExistiam ?? 0} já
          existiam · {boot?.geracao.inativas ?? 0} pausadas
        </Text>

        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

        <View style={estilos.botoes}>
          <Botao
            rotulo="Recarregar"
            aoTocar={() => {
              recarregar();
              avisos.recarregar();
            }}
          />
          <Botao rotulo="Dados de exemplo" aoTocar={criarDadosDeExemplo} />
          <Botao rotulo="Semear categorias" aoTocar={semear} />
          <Botao rotulo="Limpar mês" aoTocar={limparLancamentos} perigo />
          <Botao rotulo="Recriar banco" aoTocar={recriarBanco} perigo />
        </View>

        <Secao
          titulo={
            avisos.disponivel
              ? `Avisos agendados · ${avisos.carregando ? '…' : avisos.avisos.length}`
              : 'Avisos agendados · indisponíveis'
          }
        >
          {avisos.disponivel ? (
            <>
              {avisos.avisos.map((a) => (
                <Linha key={a.identificador} esquerda={a.corpo} direita={a.identificador} />
              ))}
              {!avisos.carregando && avisos.avisos.length === 0 ? <Vazio /> : null}
            </>
          ) : (
            <Text style={estilos.nota}>
              O expo-notifications não existe no Expo Go do Android desde o SDK 53. Rode um
              development build (eas build --profile development) para os avisos funcionarem. O
              resto do app não é afetado.
            </Text>
          )}
        </Secao>

        <Secao titulo="Migrations">
          {dados?.migracoes.map((m) => (
            <Linha key={m.id} esquerda={`#${m.id} ${m.nome}`} direita={m.aplicada_em} />
          ))}
          {dados?.migracoes.length === 0 ? <Vazio /> : null}
        </Secao>

        <Secao titulo={`Categorias · ${dados?.totais.categorias ?? 0}`}>
          {dados?.categorias.map((c) => (
            <Linha
              key={c.id}
              esquerda={`${c.icone ?? '•'}  ${c.nome}`}
              direita={[
                c.grupo ?? 'receita',
                c.divida === 1 ? 'dívida' : null,
                c.arquivada === 1 ? 'arquivada' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              cor={c.cor}
            />
          ))}
          {dados?.categorias.length === 0 ? <Vazio /> : null}
        </Secao>

        <Secao titulo={`Objetivos · ${dados?.totais.objetivos ?? 0}`}>
          {dados?.objetivos.map((o) => (
            <Linha
              key={o.id}
              esquerda={o.nome}
              direita={`alvo ${formatarMoeda(o.valorAlvo)}${
                o.metaMensal ? ` · ${formatarMoeda(o.metaMensal)}/mês` : ''
              }`}
            />
          ))}
          {dados?.objetivos.length === 0 ? <Vazio /> : null}
        </Secao>

        <Secao titulo={`Recorrências · ${dados?.totais.recorrencias ?? 0}`}>
          {dados?.recorrencias.map((r) => (
            <Linha
              key={r.id}
              esquerda={`dia ${r.diaDoMes}  ${r.descricao}`}
              direita={`${ROTULO_TIPO[r.tipo]} ${formatarMoeda(r.valorPrevisto)}`}
            />
          ))}
          {dados?.recorrencias.length === 0 ? <Vazio /> : null}
        </Secao>

        <Secao
          titulo={`Lançamentos do mês · ${dados?.lancamentosDoMes.length ?? 0} de ${
            dados?.totais.lancamentos ?? 0
          }`}
        >
          {dados?.lancamentosDoMes.map((l) => (
            <Linha
              key={l.id}
              esquerda={`${l.data.slice(8)}/${l.data.slice(5, 7)}  ${l.descricao ?? '—'}`}
              direita={`${ROTULO_TIPO[l.tipo]} ${formatarMoeda(l.valor)} ${l.pago === 1 ? '✓' : '○'}`}
              cor={l.categoriaCor}
            />
          ))}
          {dados?.lancamentosDoMes.length === 0 ? <Vazio /> : null}
        </Secao>
      </ScrollView>
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.secaoTitulo}>{titulo}</Text>
      <View style={estilos.cartao}>{children}</View>
    </View>
  );
}

function Linha({
  esquerda,
  direita,
  cor,
}: {
  esquerda: string;
  direita?: string;
  cor?: string | null;
}) {
  return (
    <View style={estilos.linha}>
      {cor ? <View style={[estilos.ponto, { backgroundColor: cor }]} /> : null}
      <Text style={estilos.linhaEsquerda} numberOfLines={1}>
        {esquerda}
      </Text>
      {direita ? <Text style={estilos.linhaDireita}>{direita}</Text> : null}
    </View>
  );
}

function Vazio() {
  return <Text style={estilos.vazio}>nada por aqui</Text>;
}

function Botao({
  rotulo,
  aoTocar,
  perigo = false,
}: {
  rotulo: string;
  aoTocar: () => void;
  perigo?: boolean;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.botao,
        perigo && estilos.botaoPerigo,
        pressed && estilos.botaoPressionado,
      ]}
    >
      <Text style={[estilos.botaoTexto, perigo && estilos.botaoTextoPerigo]}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { paddingHorizontal: espaco.lg },
  voltar: { paddingVertical: espaco.sm, alignSelf: 'flex-start' },
  voltarTexto: { ...tipografia.apoio, color: cores.textoMedio },
  titulo: { ...tipografia.titulo, fontSize: 18, letterSpacing: 1.6, marginTop: espaco.sm },
  legenda: { ...tipografia.valorApoio, fontSize: 11, marginTop: espaco.xs },
  erro: {
    ...tipografia.apoio,
    color: cores.saida,
    backgroundColor: cores.saidaFundo,
    padding: espaco.md,
    borderRadius: raio.md,
    marginTop: espaco.md,
  },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, marginTop: espaco.lg },
  botao: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.contorno,
  },
  botaoPerigo: { borderColor: cores.saidaFundo, backgroundColor: cores.saidaFundo },
  botaoPressionado: { opacity: 0.65 },
  botaoTexto: { ...tipografia.apoio, color: cores.texto },
  botaoTextoPerigo: { color: cores.saida },
  secao: { marginTop: espaco.xl },
  secaoTitulo: { ...tipografia.etiqueta, marginBottom: espaco.sm },
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    ...elevacao.cartao,
    paddingVertical: espaco.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  linhaEsquerda: { ...tipografia.apoio, flex: 1, color: cores.texto },
  linhaDireita: { ...tipografia.valorApoio, fontSize: 11 },
  vazio: { ...tipografia.apoio, color: cores.textoFraco, padding: espaco.md, fontStyle: 'italic' },
  nota: { ...tipografia.apoio, fontSize: 11, color: cores.textoMedio, padding: espaco.md },
});
