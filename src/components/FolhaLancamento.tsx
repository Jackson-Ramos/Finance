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
import { anoMesDe, deDate, hoje, paraDate, primeiroDia } from '../lib/date';
import { formatarCabecalhoDia, formatarMoeda, ROTULO_TIPO } from '../lib/format';
import { digitarCentavos, type Centavos } from '../lib/money';
import { cores, corDoTipo, espaco, raio, REGUA, tipografia } from '../lib/tema';
import type { Categoria } from '../repositories/categorias';

/** O mínimo que a folha precisa saber de um objetivo. */
export interface OpcaoObjetivo {
  id: number;
  nome: string;
}
import type { DadosLancamento } from '../repositories/lancamentos';
import type { ItemDoMes } from '../hooks/useMes';
import { useAlturaTeclado } from '../hooks/useTeclado';
import {
  TIPOS_LANCAMENTO,
  type AnoMes,
  type DataISO,
  type Natureza,
  type TipoLancamento,
} from '../types/dominio';
import { TecladoNumerico } from './TecladoNumerico';

/**
 * Folha de lançamento — o bottom sheet de registrar/editar.
 *
 * Caminho rápido (é o critério da fase): abrir → digitar o valor → ✓.
 * Tipo, data e situação já vêm com o padrão mais provável: DESPESA, hoje, pago.
 * A categoria é opcional, a um toque de distância.
 */
export function FolhaLancamento({
  visivel,
  aoFechar,
  categorias,
  objetivos,
  anoMes,
  emEdicao,
  tipoInicial,
  objetivoInicial,
  aoSalvar,
  aoExcluir,
  erro,
}: {
  visivel: boolean;
  aoFechar: () => void;
  categorias: Categoria[];
  /** Destinos possíveis de um APORTE. */
  objetivos: OpcaoObjetivo[];
  /** Mês em exibição: define a data padrão quando não é o mês corrente. */
  anoMes: AnoMes;
  emEdicao: ItemDoMes | null;
  /** Pré-seleção ao abrir um lançamento novo. Escalares para não reiniciar o efeito à toa. */
  tipoInicial?: TipoLancamento;
  objetivoInicial?: number | null;
  aoSalvar: (dados: DadosLancamento, id?: number) => boolean;
  aoExcluir: (id: number) => boolean;
  erro: string | null;
}) {
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();

  const [tipo, setTipo] = useState<TipoLancamento>('DESPESA');
  const [valor, setValor] = useState<Centavos>(0);
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [objetivoId, setObjetivoId] = useState<number | null>(null);
  const [natureza, setNatureza] = useState<Natureza>('VARIAVEL');
  const [data, setData] = useState<DataISO>(hoje());
  const [pago, setPago] = useState(true);
  const [digitandoTexto, setDigitandoTexto] = useState(false);

  // Reinicia o formulário a cada abertura: novo lançamento começa limpo,
  // edição começa com os valores da linha.
  useEffect(() => {
    if (!visivel) return;
    setDigitandoTexto(false);
    if (emEdicao) {
      setTipo(emEdicao.tipo);
      setValor(emEdicao.valor);
      setDescricao(emEdicao.descricao ?? '');
      setCategoriaId(emEdicao.categoriaId);
      setObjetivoId(emEdicao.objetivoId);
      setNatureza(emEdicao.natureza ?? 'VARIAVEL');
      setData(emEdicao.data);
      setPago(emEdicao.pago === 1);
    } else {
      setTipo(tipoInicial ?? 'DESPESA');
      setValor(0);
      setDescricao('');
      setCategoriaId(null);
      setObjetivoId(objetivoInicial ?? null);
      setNatureza('VARIAVEL');
      setData(anoMesDe(hoje()) === anoMes ? hoje() : primeiroDia(anoMes));
      setPago(true);
    }
  }, [visivel, emEdicao, anoMes, tipoInicial, objetivoInicial]);

  const cor = corDoTipo[tipo];
  const podeSalvar = valor > 0;

  const categoriasDoTipo = categorias.filter((c) =>
    tipo === 'RECEITA' ? c.grupo === null : tipo === 'DESPESA' ? c.grupo !== null : false,
  );

  function trocarTipo(novo: TipoLancamento) {
    setTipo(novo);
    // A categoria escolhida não vale para o outro lado do razão, e objetivo só
    // faz sentido em aporte.
    setCategoriaId(null);
    if (novo !== 'APORTE') setObjetivoId(null);
  }

  function andarDia(passo: number) {
    const d = paraDate(data);
    d.setDate(d.getDate() + passo);
    setData(deDate(d));
  }

  function salvar() {
    if (!podeSalvar) return;
    const ok = aoSalvar(
      {
        data,
        descricao: descricao.trim() || null,
        valor,
        tipo,
        natureza: tipo === 'DESPESA' ? natureza : null,
        categoriaId,
        objetivoId: tipo === 'APORTE' ? objetivoId : null,
        pago,
        dataPagamento: pago ? data : null,
      },
      emEdicao?.id,
    );
    if (ok) aoFechar();
  }

  function confirmarExclusao() {
    if (!emEdicao) return;
    Alert.alert(
      'Excluir lançamento',
      `${emEdicao.descricao ?? 'Este lançamento'} · ${formatarMoeda(emEdicao.valor)}`,
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
          // Com o teclado do sistema aberto, a folha sobe o equivalente à
          // altura dele; fechado, respeita a barra de navegação.
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
              const ativo = t === tipo;
              return (
                <Pressable
                  key={t}
                  onPress={() => trocarTipo(t)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: ativo }}
                  style={[
                    estilos.tipo,
                    ativo && { backgroundColor: corDoTipo[t], borderColor: corDoTipo[t] },
                  ]}
                >
                  <Text style={[estilos.tipoTexto, ativo && estilos.tipoTextoAtivo]}>
                    {ROTULO_TIPO[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[estilos.valorCaixa, { borderBottomColor: cor }]}>
            <Text
              style={[estilos.valor, { color: valor === 0 ? cores.tintaFraca : cor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              accessibilityLabel={`Valor ${formatarMoeda(valor)}`}
            >
              {formatarMoeda(valor)}
            </Text>
          </View>

          <TextInput
            value={descricao}
            onChangeText={setDescricao}
            onFocus={() => setDigitandoTexto(true)}
            onBlur={() => setDigitandoTexto(false)}
            placeholder="Descrição (opcional)"
            placeholderTextColor={cores.tintaFraca}
            style={estilos.descricao}
            returnKeyType="done"
            maxLength={80}
          />

          {tipo === 'APORTE' ? (
            objetivos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={estilos.chips}
                keyboardShouldPersistTaps="handled"
              >
                {objetivos.map((o) => {
                  const ativo = o.id === objetivoId;
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => setObjetivoId(ativo ? null : o.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo }}
                      style={[
                        estilos.chip,
                        ativo && { backgroundColor: cor, borderColor: cor },
                      ]}
                    >
                      <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>
                        🎯 {o.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={estilos.dica}>
                Sem objetivo cadastrado. O aporte fica solto — crie um objetivo para acompanhar o
                progresso.
              </Text>
            )
          ) : null}

          {categoriasDoTipo.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.chips}
              keyboardShouldPersistTaps="handled"
            >
              {categoriasDoTipo.map((c) => {
                const ativa = c.id === categoriaId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoriaId(ativa ? null : c.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativa }}
                    style={[
                      estilos.chip,
                      ativa && { backgroundColor: c.cor ?? cor, borderColor: c.cor ?? cor },
                    ]}
                  >
                    <Text style={[estilos.chipTexto, ativa && estilos.chipTextoAtivo]}>
                      {c.icone ? `${c.icone} ` : ''}
                      {c.nome}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={estilos.opcoes}>
            <View style={estilos.dataCaixa}>
              <Pressable onPress={() => andarDia(-1)} hitSlop={10} accessibilityLabel="Dia anterior">
                <Text style={estilos.dataSeta}>‹</Text>
              </Pressable>
              <Pressable onPress={() => setData(hoje())} style={estilos.dataRotuloArea}>
                <Text style={estilos.dataRotulo}>{formatarCabecalhoDia(data)}</Text>
              </Pressable>
              <Pressable onPress={() => andarDia(1)} hitSlop={10} accessibilityLabel="Próximo dia">
                <Text style={estilos.dataSeta}>›</Text>
              </Pressable>
            </View>

            <Alternador
              ativo={pago}
              aoTocar={() => setPago((p) => !p)}
              rotuloAtivo={tipo === 'RECEITA' ? 'Recebido' : 'Pago'}
              rotuloInativo={tipo === 'RECEITA' ? 'A receber' : 'Em aberto'}
              cor={cor}
            />

            {tipo === 'DESPESA' ? (
              <Alternador
                ativo={natureza === 'FIXA'}
                aoTocar={() => setNatureza((n) => (n === 'FIXA' ? 'VARIAVEL' : 'FIXA'))}
                rotuloAtivo="Fixa"
                rotuloInativo="Variável"
                cor={cor}
              />
            ) : null}
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

          {emEdicao ? (
            <Pressable
              onPress={confirmarExclusao}
              style={estilos.excluir}
              accessibilityRole="button"
            >
              <Text style={estilos.excluirTexto}>Excluir lançamento</Text>
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
              rotuloConfirmar={emEdicao ? 'Salvar alterações' : 'Salvar lançamento'}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

function Alternador({
  ativo,
  aoTocar,
  rotuloAtivo,
  rotuloInativo,
  cor,
}: {
  ativo: boolean;
  aoTocar: () => void;
  rotuloAtivo: string;
  rotuloInativo: string;
  cor: string;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="switch"
      accessibilityState={{ checked: ativo }}
      style={[estilos.alternador, ativo && { borderColor: cor, backgroundColor: cores.folha }]}
    >
      <Text style={[estilos.alternadorTexto, ativo && { color: cor }]}>
        {ativo ? rotuloAtivo : rotuloInativo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  veu: { flex: 1, backgroundColor: cores.veu },
  folha: {
    backgroundColor: cores.papel,
    borderTopLeftRadius: raio.folha,
    borderTopRightRadius: raio.folha,
    maxHeight: '92%',
  },
  puxadorArea: { alignItems: 'center', paddingVertical: espaco.md },
  puxador: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: cores.reguaForte,
  },

  // No RN o padrão de flexShrink é 0: sem isto a rolagem estoura a folha.
  rolagem: { flexGrow: 0, flexShrink: 1 },
  rolagemConteudo: { paddingBottom: espaco.md },

  tipos: {
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
  },
  tipo: {
    flex: 1,
    paddingVertical: espaco.sm,
    alignItems: 'center',
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
    backgroundColor: cores.folha,
  },
  tipoTexto: { ...tipografia.etiqueta, color: cores.tintaMedia },
  tipoTextoAtivo: { color: cores.folha },

  valorCaixa: {
    marginHorizontal: espaco.lg,
    marginTop: espaco.xl,
    paddingBottom: espaco.sm,
    borderBottomWidth: 2,
    alignItems: 'flex-end',
  },
  valor: { ...tipografia.numeroHeroi, fontSize: 40 },

  descricao: {
    ...tipografia.corpo,
    marginHorizontal: espaco.lg,
    marginTop: espaco.md,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.md,
    backgroundColor: cores.folha,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
  },

  chips: { gap: espaco.sm, paddingHorizontal: espaco.lg, paddingVertical: espaco.md },
  chip: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
    backgroundColor: cores.folha,
  },
  chipTexto: { ...tipografia.apoio, color: cores.tinta },
  dica: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.tintaFraca,
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.md,
  },
  chipTextoAtivo: { color: cores.folha },

  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    alignItems: 'center',
  },
  dataCaixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
    backgroundColor: cores.folha,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
  },
  dataSeta: { fontSize: 20, color: cores.tintaMedia, lineHeight: 24 },
  dataRotuloArea: { minWidth: 92, alignItems: 'center' },
  dataRotulo: { ...tipografia.apoio, color: cores.tinta },
  alternador: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
    backgroundColor: cores.papelFundo,
  },
  alternadorTexto: { ...tipografia.apoio, color: cores.tintaMedia },

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
