import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlturaTeclado } from '../hooks/useTeclado';
import { formatarMeses, formatarMoeda } from '../lib/format';
import { digitarCentavos, dividirSeguro, type Centavos } from '../lib/money';
import { cores, espaco, raio, tipografia } from '../lib/tema';
import type { DadosObjetivo, Objetivo } from '../repositories/objetivos';
import { TecladoNumerico } from './TecladoNumerico';

type Campo = 'alvo' | 'meta';

/**
 * Folha de objetivo.
 *
 * Dois valores em dinheiro na mesma folha, e um teclado só: o campo tocado
 * fica ativo e recebe os dígitos. A alternativa seria abrir duas folhas, o que
 * custa mais toques e esconde a relação entre alvo e meta mensal — que é
 * justamente o que a linha de baixo mostra ao vivo.
 */
export function FolhaObjetivo({
  visivel,
  aoFechar,
  emEdicao,
  aoSalvar,
  aoExcluir,
  erro,
}: {
  visivel: boolean;
  aoFechar: () => void;
  emEdicao: Objetivo | null;
  aoSalvar: (dados: DadosObjetivo, id?: number) => boolean;
  aoExcluir: (id: number) => boolean;
  erro: string | null;
}) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();

  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState<Centavos>(0);
  const [metaMensal, setMetaMensal] = useState<Centavos>(0);
  const [campo, setCampo] = useState<Campo>('alvo');
  const [digitandoTexto, setDigitandoTexto] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setDigitandoTexto(false);
    setCampo('alvo');
    if (emEdicao) {
      setNome(emEdicao.nome);
      setValorAlvo(emEdicao.valorAlvo);
      setMetaMensal(emEdicao.metaMensal ?? 0);
    } else {
      setNome('');
      setValorAlvo(0);
      setMetaMensal(0);
    }
  }, [visivel, emEdicao]);

  const podeSalvar = nome.trim().length > 0 && valorAlvo > 0;

  // Quanto tempo a meta declarada levaria para cobrir o alvo inteiro.
  const razao = metaMensal > 0 ? dividirSeguro(valorAlvo, metaMensal) : null;
  const mesesPelaMeta = razao === null ? null : Math.ceil(razao);

  function digitar(tecla: string) {
    if (campo === 'alvo') setValorAlvo((v) => digitarCentavos(v, tecla));
    else setMetaMensal((v) => digitarCentavos(v, tecla));
  }

  function salvar() {
    if (!podeSalvar) return;
    const ok = aoSalvar(
      {
        nome: nome.trim(),
        valorAlvo,
        metaMensal: metaMensal > 0 ? metaMensal : null,
        ativo: emEdicao ? emEdicao.ativo === 1 : true,
      },
      emEdicao?.id,
    );
    if (ok) aoFechar();
  }

  function confirmarExclusao() {
    if (!emEdicao) return;
    Alert.alert(
      'Excluir objetivo',
      `"${emEdicao.nome}" some da lista. Os aportes já feitos continuam no histórico como lançamentos sem destino — o dinheiro saiu do caixa de verdade.`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (aoExcluir(emEdicao.id)) aoFechar();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={aoFechar}
      statusBarTranslucent
    >
      <Pressable style={estilos.veu} onPress={aoFechar} accessibilityLabel="Fechar" />

      <View
        style={[
          estilos.folha,
          { paddingBottom: (alturaTeclado > 0 ? alturaTeclado : insets.bottom) + espaco.md },
        ]}
      >
        <Pressable onPress={aoFechar} hitSlop={12} style={estilos.puxadorArea}>
          <View style={estilos.puxador} />
        </Pressable>

        <ScrollView
          style={estilos.rolagem}
          contentContainerStyle={estilos.rolagemConteudo}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={nome}
            onChangeText={setNome}
            onFocus={() => setDigitandoTexto(true)}
            onBlur={() => setDigitandoTexto(false)}
            placeholder="Nome do objetivo (ex.: Reserva de emergência)"
            placeholderTextColor={cores.textoFraco}
            style={estilos.nome}
            returnKeyType="done"
            maxLength={60}
          />

          <CampoValor
            rotulo="Quanto quero juntar"
            valor={valorAlvo}
            ativo={campo === 'alvo'}
            aoTocar={() => setCampo('alvo')}
            obrigatorio
          />

          <CampoValor
            rotulo="Quanto pretendo guardar por mês"
            valor={metaMensal}
            ativo={campo === 'meta'}
            aoTocar={() => setCampo('meta')}
          />

          <Text style={estilos.nota}>
            {mesesPelaMeta === null
              ? 'A meta mensal é opcional. Sem ela, a projeção usa só o ritmo observado.'
              : `Nesse ritmo, ${formatarMeses(mesesPelaMeta)} até chegar em ${formatarMoeda(valorAlvo)}.`}
          </Text>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

          {emEdicao ? (
            <Pressable onPress={confirmarExclusao} style={estilos.excluir} accessibilityRole="button">
              <Text style={estilos.excluirTexto}>Excluir objetivo</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {digitandoTexto ? null : (
          <View style={estilos.teclado}>
            <TecladoNumerico
              aoDigitar={digitar}
              aoConfirmar={salvar}
              corConfirmar={cores.aporte}
              podeConfirmar={podeSalvar}
              rotuloConfirmar={emEdicao ? 'Salvar alterações' : 'Criar objetivo'}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function CampoValor({
  rotulo,
  valor,
  ativo,
  aoTocar,
  obrigatorio = false,
}: {
  rotulo: string;
  valor: Centavos;
  ativo: boolean;
  aoTocar: () => void;
  obrigatorio?: boolean;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={`${rotulo}: ${formatarMoeda(valor)}. Tocar para digitar.`}
      style={[estilos.campo, ativo && estilos.campoAtivo]}
    >
      <Text style={estilos.campoRotulo}>
        {rotulo}
        {obrigatorio ? '' : '  ·  opcional'}
      </Text>
      <Text
        style={[estilos.campoValor, valor === 0 && estilos.campoValorVazio]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatarMoeda(valor)}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  veu: { flex: 1, backgroundColor: cores.veu },
  folha: {
    backgroundColor: cores.fundo,
    borderTopLeftRadius: raio.folha,
    borderTopRightRadius: raio.folha,
    maxHeight: '92%',
  },
  puxadorArea: { alignItems: 'center', paddingVertical: espaco.md },
  puxador: { width: 40, height: 4, borderRadius: 2, backgroundColor: cores.contorno },

  rolagem: { flexGrow: 0, flexShrink: 1 },
  rolagemConteudo: { paddingBottom: espaco.md },

  nome: {
    ...tipografia.corpo,
    marginHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
  },

  campo: {
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.md,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
  },
  // O campo ativo é o que recebe os dígitos: borda grossa na cor de aporte.
  campoAtivo: { borderWidth: 2, borderColor: cores.aporte, backgroundColor: cores.superficie },
  campoRotulo: tipografia.etiqueta,
  campoValor: { ...tipografia.visorDigitacao, fontSize: 28, textAlign: 'right', marginTop: espaco.xs },
  campoValorVazio: { color: cores.textoFraco },

  nota: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.textoFraco,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
  },
  erro: {
    ...tipografia.apoio,
    color: cores.saida,
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
  },
  excluir: { alignSelf: 'center', marginTop: espaco.lg, padding: espaco.sm },
  excluirTexto: { ...tipografia.apoio, color: cores.saida },
  teclado: { paddingTop: espaco.md },
});
