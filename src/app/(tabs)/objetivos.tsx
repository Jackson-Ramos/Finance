import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FolhaLancamento } from '../../components/FolhaLancamento';
import { FolhaObjetivo } from '../../components/FolhaObjetivo';
import { TrilhaDupla } from '../../components/TrilhaDupla';
import { useAcoesLancamento, useCategoriasAtivas, useMesStore } from '../../hooks/useMes';
import {
  useAcoesObjetivo,
  useObjetivosAtivos,
  usePainelObjetivos,
  type Objetivo,
} from '../../hooks/useObjetivos';
import { formatarData, formatarMesAnoCurto, formatarMoeda, formatarPercentual } from '../../lib/format';
import { cores, espaco, raio, REGUA, tipografia } from '../../lib/tema';
import type { ProgressoObjetivo } from '../../services/progressoObjetivos';

/**
 * Objetivos — quanto já foi guardado, e quando chega no alvo mantendo o ritmo.
 *
 * A trilha é a mesma da tela do mês, com os papéis trocados: o contorno é o
 * ALVO, o preenchimento é o GUARDADO. Continua sendo "o todo e a parte".
 */
export default function TelaObjetivos() {
  const insets = useSafeAreaInsets();
  const anoMes = useMesStore((s) => s.anoMes);

  const { dados, erro: erroLeitura } = usePainelObjetivos(anoMes);
  const acoes = useAcoesObjetivo();

  const categorias = useCategoriasAtivas();
  const objetivosAtivos = useObjetivosAtivos();
  const acoesLancamento = useAcoesLancamento();

  const [folhaObjetivo, setFolhaObjetivo] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Objetivo | null>(null);
  const [aporteEm, setAporteEm] = useState<number | null>(null);

  function abrirObjetivo(objetivo: Objetivo | null) {
    acoes.limparErro();
    setEmEdicao(objetivo);
    setFolhaObjetivo(true);
  }

  function abrirAporte(objetivoId: number) {
    acoesLancamento.limparErro();
    setAporteEm(objetivoId);
  }

  const vazio = dados !== null && dados.total === 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[estilos.tela, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[estilos.conteudo, { paddingBottom: 120 }]}
        >
          <Text style={estilos.titulo}>Objetivos</Text>
          <Text style={estilos.subtitulo}>
            Guardado é o que já foi aportado e pago. A previsão usa o ritmo médio desde o primeiro
            aporte — parar de guardar empurra a data.
          </Text>

          {dados && dados.guardadoNoTotal > 0 ? (
            <View style={estilos.totalCaixa}>
              <Text style={estilos.totalEtiqueta}>Guardado no total</Text>
              <Text style={estilos.totalValor}>{formatarMoeda(dados.guardadoNoTotal)}</Text>
            </View>
          ) : null}

          {erroLeitura ? <Text style={estilos.erro}>{erroLeitura}</Text> : null}

          {vazio ? (
            <View style={estilos.vazio}>
              <Text style={estilos.vazioTitulo}>Nenhum objetivo ainda</Text>
              <Text style={estilos.vazioTexto}>
                Reserva de emergência, viagem, troca de carro — defina o alvo e registre aportes
                para acompanhar o progresso.
              </Text>
            </View>
          ) : null}

          {dados?.progressos.map((p) => (
            <Cartao key={p.objetivo.id} progresso={p} aoEditar={abrirObjetivo} aoAportar={abrirAporte} />
          ))}
        </ScrollView>

        <Pressable
          onPress={() => abrirObjetivo(null)}
          accessibilityRole="button"
          accessibilityLabel="Novo objetivo"
          style={({ pressed }) => [
            estilos.botaoFlutuante,
            { bottom: espaco.xl },
            pressed && estilos.botaoPressionado,
          ]}
        >
          <Text style={estilos.botaoGlifo}>+</Text>
        </Pressable>

        <FolhaObjetivo
          visivel={folhaObjetivo}
          aoFechar={() => setFolhaObjetivo(false)}
          emEdicao={emEdicao}
          aoSalvar={acoes.salvar}
          aoExcluir={acoes.excluir}
          erro={acoes.erro}
        />

        <FolhaLancamento
          visivel={aporteEm !== null}
          aoFechar={() => setAporteEm(null)}
          categorias={categorias}
          objetivos={objetivosAtivos}
          anoMes={anoMes}
          emEdicao={null}
          tipoInicial="APORTE"
          objetivoInicial={aporteEm}
          aoSalvar={acoesLancamento.salvar}
          aoExcluir={acoesLancamento.excluir}
          erro={acoesLancamento.erro}
        />
      </View>
    </>
  );
}

function Cartao({
  progresso,
  aoEditar,
  aoAportar,
}: {
  progresso: ProgressoObjetivo<Objetivo>;
  aoEditar: (o: Objetivo) => void;
  aoAportar: (id: number) => void;
}) {
  const { objetivo } = progresso;
  const pausado = objetivo.ativo !== 1;
  const cor = progresso.concluido ? cores.entrada : cores.aporte;

  return (
    <View style={[estilos.cartao, pausado && estilos.cartaoPausado]}>
      <Pressable
        onPress={() => aoEditar(objetivo)}
        accessibilityRole="button"
        accessibilityLabel={`${objetivo.nome}, ${formatarPercentual(progresso.percentual)} do alvo. Tocar para editar.`}
      >
        <View style={estilos.cartaoTopo}>
          <Text style={estilos.cartaoNome} numberOfLines={1}>
            {objetivo.nome}
          </Text>
          <Text style={[estilos.cartaoPercentual, { color: cor }]}>
            {formatarPercentual(progresso.percentual)}
          </Text>
        </View>

        <Text style={[estilos.guardado, { color: cor }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatarMoeda(progresso.guardado)}
        </Text>

        <View style={estilos.trilhaLinha}>
          <TrilhaDupla fracao={progresso.fracao} cor={cor} />
          <Text style={estilos.alvo}>de {formatarMoeda(objetivo.valorAlvo)}</Text>
        </View>

        <View style={estilos.regua} />

        {progresso.concluido ? (
          <Text style={[estilos.selo, { color: cores.entrada }]}>
            Meta batida{progresso.ultimoAporte ? ` em ${formatarData(progresso.ultimoAporte)}` : ''}
          </Text>
        ) : progresso.ritmoMedio === null ? (
          <Text style={estilos.detalhe}>
            Sem aportes ainda. O ritmo e a previsão aparecem depois do primeiro.
          </Text>
        ) : (
          <>
            <Detalhe
              rotulo={`Ritmo de ${progresso.mesesDeHistorico} ${
                progresso.mesesDeHistorico === 1 ? 'mês' : 'meses'
              }`}
              valor={`${formatarMoeda(progresso.ritmoMedio)}/mês`}
            />
            <Detalhe
              rotulo="Faltam"
              valor={`${formatarMoeda(progresso.restante)}${
                progresso.mesesParaConcluir !== null ? ` · ${progresso.mesesParaConcluir} meses` : ''
              }`}
            />
            {progresso.previsaoConclusao ? (
              <Detalhe
                rotulo="Conclusão prevista"
                valor={formatarMesAnoCurto(progresso.previsaoConclusao)}
                destaque
              />
            ) : null}
            {progresso.previsaoPelaMeta &&
            progresso.previsaoPelaMeta !== progresso.previsaoConclusao ? (
              <Detalhe
                rotulo={`Se cumprir a meta de ${formatarMoeda(objetivo.metaMensal ?? 0)}/mês`}
                valor={formatarMesAnoCurto(progresso.previsaoPelaMeta)}
              />
            ) : null}
          </>
        )}

        {progresso.programado > 0 ? (
          <Detalhe rotulo="Aportes lançados e não pagos" valor={formatarMoeda(progresso.programado)} />
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => aoAportar(objetivo.id)}
        accessibilityRole="button"
        accessibilityLabel={`Registrar aporte em ${objetivo.nome}`}
        style={({ pressed }) => [estilos.aportar, pressed && estilos.aportarPressionado]}
      >
        <Text style={estilos.aportarTexto}>Registrar aporte</Text>
      </Pressable>
    </View>
  );
}

function Detalhe({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <View style={estilos.detalheLinha}>
      <Text style={estilos.detalhe} numberOfLines={1}>
        {rotulo}
      </Text>
      <Text style={[estilos.detalheValor, destaque && estilos.detalheValorDestaque]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.papel },
  conteudo: { paddingHorizontal: espaco.lg },
  titulo: { ...tipografia.mes, fontSize: 18, letterSpacing: 1.6, marginTop: espaco.lg },
  subtitulo: { ...tipografia.apoio, color: cores.tintaFraca, marginTop: espaco.sm },
  erro: { ...tipografia.apoio, color: cores.saida, marginTop: espaco.md },

  totalCaixa: {
    marginTop: espaco.lg,
    paddingVertical: espaco.md,
    borderTopWidth: REGUA,
    borderBottomWidth: REGUA,
    borderColor: cores.regua,
  },
  totalEtiqueta: tipografia.etiqueta,
  totalValor: { ...tipografia.numeroHeroi, fontSize: 26, marginTop: espaco.xs },

  vazio: { alignItems: 'center', gap: espaco.sm, paddingVertical: espaco.xxl },
  vazioTitulo: { ...tipografia.corpo, color: cores.tintaMedia },
  vazioTexto: { ...tipografia.apoio, color: cores.tintaFraca, textAlign: 'center' },

  cartao: {
    marginTop: espaco.lg,
    padding: espaco.lg,
    backgroundColor: cores.folha,
    borderRadius: raio.lg,
    borderWidth: REGUA,
    borderColor: cores.regua,
  },
  cartaoPausado: { backgroundColor: cores.papelFundo },
  cartaoTopo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cartaoNome: { ...tipografia.corpo, flex: 1 },
  cartaoPercentual: { ...tipografia.numeroLinha, fontSize: 14 },
  guardado: { ...tipografia.numeroHeroi, fontSize: 28, marginTop: espaco.sm },
  trilhaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  alvo: tipografia.numeroApoio,
  regua: { height: REGUA, backgroundColor: cores.regua, marginVertical: espaco.md },

  detalheLinha: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: espaco.sm,
    marginBottom: espaco.xs,
  },
  detalhe: { ...tipografia.apoio, fontSize: 11, color: cores.tintaFraca, flexShrink: 1 },
  detalheValor: { ...tipografia.numeroApoio, color: cores.tintaMedia },
  detalheValorDestaque: { color: cores.tinta, fontSize: 14 },
  selo: { ...tipografia.etiqueta, color: cores.entrada },

  aportar: {
    marginTop: espaco.md,
    paddingVertical: espaco.sm,
    alignItems: 'center',
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.aporte,
  },
  aportarPressionado: { backgroundColor: cores.aporteFraca },
  aportarTexto: { ...tipografia.etiqueta, color: cores.aporte },

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
