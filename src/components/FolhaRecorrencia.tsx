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
import { anoMesAtual, diaDoMesGrampeado, diasNoMes } from '../lib/date';
import { formatarDataCurta, formatarMoeda, ROTULO_TIPO } from '../lib/format';
import { digitarCentavos, type Centavos } from '../lib/money';
import { cores, corDoTipo, espaco, raio, tipografia } from '../lib/tema';
import type { Categoria } from '../repositories/categorias';
import type { DadosRecorrencia, Recorrencia } from '../repositories/recorrencias';
import { useAlturaTeclado } from '../hooks/useTeclado';
import { TIPOS_LANCAMENTO, type Natureza, type TipoLancamento } from '../types/dominio';
import { TecladoNumerico } from './TecladoNumerico';

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);

/**
 * Folha de recorrência — criar e editar a REGRA, não o lançamento.
 *
 * O que se define aqui é o molde: o app carimba um lançamento em aberto por
 * mês a partir dele.
 */
export function FolhaRecorrencia({
  visivel,
  aoFechar,
  categorias,
  emEdicao,
  aoSalvar,
  aoExcluir,
  erro,
}: {
  visivel: boolean;
  aoFechar: () => void;
  categorias: Categoria[];
  emEdicao: Recorrencia | null;
  aoSalvar: (dados: DadosRecorrencia, id?: number) => boolean;
  aoExcluir: (id: number) => boolean;
  erro: string | null;
}) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<Centavos>(0);
  const [diaDoMes, setDiaDoMes] = useState(5);
  const [tipo, setTipo] = useState<TipoLancamento>('DESPESA');
  const [natureza, setNatureza] = useState<Natureza>('FIXA');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [ativo, setAtivo] = useState(true);
  const [digitandoTexto, setDigitandoTexto] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    setDigitandoTexto(false);
    if (emEdicao) {
      setDescricao(emEdicao.descricao);
      setValor(emEdicao.valorPrevisto);
      setDiaDoMes(emEdicao.diaDoMes);
      setTipo(emEdicao.tipo);
      setNatureza(emEdicao.natureza);
      setCategoriaId(emEdicao.categoriaId);
      setAtivo(emEdicao.ativo === 1);
    } else {
      setDescricao('');
      setValor(0);
      setDiaDoMes(5);
      setTipo('DESPESA');
      setNatureza('FIXA');
      setCategoriaId(null);
      setAtivo(true);
    }
  }, [visivel, emEdicao]);

  const cor = corDoTipo[tipo];
  const podeSalvar = valor > 0 && descricao.trim().length > 0;

  const categoriasDoTipo = categorias.filter((c) =>
    tipo === 'RECEITA' ? c.grupo === null : tipo === 'DESPESA' ? c.grupo !== null : false,
  );

  const mesAtual = anoMesAtual();
  const grampeado = diaDoMes > diasNoMes(mesAtual);

  function salvar() {
    if (!podeSalvar) return;
    const ok = aoSalvar(
      {
        descricao: descricao.trim(),
        valorPrevisto: valor,
        diaDoMes,
        tipo,
        natureza: tipo === 'DESPESA' ? natureza : 'FIXA',
        categoriaId,
        ativo,
      },
      emEdicao?.id,
    );
    if (ok) aoFechar();
  }

  function confirmarExclusao() {
    if (!emEdicao) return;
    Alert.alert(
      'Excluir recorrência',
      `"${emEdicao.descricao}" deixa de gerar lançamentos. Os que já foram gerados continuam no histórico, como lançamentos avulsos.`,
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
          <View style={estilos.tipos}>
            {TIPOS_LANCAMENTO.map((t) => {
              const selecionado = t === tipo;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    setTipo(t);
                    setCategoriaId(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selecionado }}
                  style={[
                    estilos.tipo,
                    selecionado && { backgroundColor: corDoTipo[t], borderColor: corDoTipo[t] },
                  ]}
                >
                  <Text style={[estilos.tipoTexto, selecionado && estilos.tipoTextoAtivo]}>
                    {ROTULO_TIPO[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={descricao}
            onChangeText={setDescricao}
            onFocus={() => setDigitandoTexto(true)}
            onBlur={() => setDigitandoTexto(false)}
            placeholder="Nome da conta (ex.: Aluguel)"
            placeholderTextColor={cores.textoFraco}
            style={estilos.descricao}
            returnKeyType="done"
            maxLength={60}
          />

          <View style={[estilos.valorCaixa, { borderBottomColor: cor }]}>
            <Text style={estilos.valorEtiqueta}>Valor previsto</Text>
            <Text
              style={[estilos.valor, { color: valor === 0 ? cores.textoFraco : cor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatarMoeda(valor)}
            </Text>
          </View>

          <Text style={estilos.secaoEtiqueta}>Dia do vencimento</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.dias}
            keyboardShouldPersistTaps="handled"
          >
            {DIAS.map((d) => {
              const selecionado = d === diaDoMes;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDiaDoMes(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`Dia ${d}`}
                  accessibilityState={{ selected: selecionado }}
                  style={[estilos.dia, selecionado && { backgroundColor: cor, borderColor: cor }]}
                >
                  <Text style={[estilos.diaTexto, selecionado && estilos.diaTextoAtivo]}>{d}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={estilos.nota}>
            {grampeado
              ? `Neste mês cai em ${formatarDataCurta(diaDoMesGrampeado(mesAtual, diaDoMes))} — o dia ${diaDoMes} não existe, então vale o último dia do mês.`
              : `Neste mês cai em ${formatarDataCurta(diaDoMesGrampeado(mesAtual, diaDoMes))}.`}
          </Text>

          {categoriasDoTipo.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.chips}
              keyboardShouldPersistTaps="handled"
            >
              {categoriasDoTipo.map((c) => {
                const selecionada = c.id === categoriaId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoriaId(selecionada ? null : c.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selecionada }}
                    style={[
                      estilos.chip,
                      selecionada && { backgroundColor: c.cor ?? cor, borderColor: c.cor ?? cor },
                    ]}
                  >
                    <Text style={[estilos.chipTexto, selecionada && estilos.chipTextoAtivo]}>
                      {c.icone ? `${c.icone} ` : ''}
                      {c.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={estilos.opcoes}>
            {tipo === 'DESPESA' ? (
              <Alternador
                ligado={natureza === 'FIXA'}
                aoTocar={() => setNatureza((n) => (n === 'FIXA' ? 'VARIAVEL' : 'FIXA'))}
                rotuloLigado="Fixa"
                rotuloDesligado="Variável"
                cor={cor}
              />
            ) : null}
            <Alternador
              ligado={ativo}
              aoTocar={() => setAtivo((a) => !a)}
              rotuloLigado="Gerando todo mês"
              rotuloDesligado="Pausada"
              cor={cor}
            />
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

          {emEdicao ? (
            <Pressable onPress={confirmarExclusao} style={estilos.excluir} accessibilityRole="button">
              <Text style={estilos.excluirTexto}>Excluir recorrência</Text>
            </Pressable>
          ) : null}
        </ScrollView>

        {digitandoTexto ? null : (
          <View style={estilos.teclado}>
            <TecladoNumerico
              aoDigitar={(tecla) => setValor((v) => digitarCentavos(v, tecla))}
              aoConfirmar={salvar}
              corConfirmar={cor}
              podeConfirmar={podeSalvar}
              rotuloConfirmar={emEdicao ? 'Salvar alterações' : 'Criar recorrência'}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function Alternador({
  ligado,
  aoTocar,
  rotuloLigado,
  rotuloDesligado,
  cor,
}: {
  ligado: boolean;
  aoTocar: () => void;
  rotuloLigado: string;
  rotuloDesligado: string;
  cor: string;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="switch"
      accessibilityState={{ checked: ligado }}
      style={[estilos.alternador, ligado && { borderColor: cor, backgroundColor: cores.superficie }]}
    >
      <Text style={[estilos.alternadorTexto, ligado && { color: cor }]}>
        {ligado ? rotuloLigado : rotuloDesligado}
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

  tipos: { flexDirection: 'row', gap: espaco.sm, paddingHorizontal: espaco.lg },
  tipo: {
    flex: 1,
    paddingVertical: espaco.sm,
    alignItems: 'center',
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
    backgroundColor: cores.superficie,
  },
  tipoTexto: { ...tipografia.etiqueta, color: cores.textoMedio },
  tipoTextoAtivo: { color: cores.superficie },

  descricao: {
    ...tipografia.corpo,
    marginHorizontal: espaco.lg,
    marginTop: espaco.lg,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
  },

  valorCaixa: {
    marginHorizontal: espaco.lg,
    marginTop: espaco.lg,
    paddingBottom: espaco.sm,
    borderBottomWidth: 2,
  },
  valorEtiqueta: tipografia.etiqueta,
  valor: { ...tipografia.visorDigitacao, fontSize: 34, textAlign: 'right', marginTop: espaco.xs },

  secaoEtiqueta: { ...tipografia.etiqueta, marginTop: espaco.lg, paddingHorizontal: espaco.lg },
  dias: { gap: espaco.sm, paddingHorizontal: espaco.lg, paddingVertical: espaco.sm },
  dia: {
    minWidth: 40,
    paddingVertical: espaco.sm,
    alignItems: 'center',
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
    backgroundColor: cores.superficie,
  },
  diaTexto: { ...tipografia.valor, fontSize: 14 },
  diaTextoAtivo: { color: cores.superficie },
  nota: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.textoFraco,
    paddingHorizontal: espaco.lg,
  },

  chips: { gap: espaco.sm, paddingHorizontal: espaco.lg, paddingVertical: espaco.md },
  chip: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
    backgroundColor: cores.superficie,
  },
  chipTexto: { ...tipografia.apoio, color: cores.texto },
  chipTextoAtivo: { color: cores.superficie },

  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    marginTop: espaco.sm,
  },
  alternador: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
    backgroundColor: cores.superficieBaixa,
  },
  alternadorTexto: { ...tipografia.apoio, color: cores.textoMedio },

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
