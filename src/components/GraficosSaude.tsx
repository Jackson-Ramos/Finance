import { StyleSheet, Text, View } from 'react-native';
import { formatarMesCurto, formatarMoeda, formatarPercentual } from '../lib/format';
import {
  cores,
  coresSituacao,
  espaco,
  raio,
  REGUA,
  rotulosSituacao,
  tipografia,
} from '../lib/tema';
import type {
  FatiaCategoria,
  FatiaGrupo,
  PontoHistorico,
  Situacao,
} from '../services/saudeFinanceira';
import { TrilhaDupla } from './TrilhaDupla';

// ------------------------------------------------------------ indicador

/**
 * Cartão de indicador.
 *
 * O número grande usa tinta, nunca a cor de situação: texto veste token de
 * texto. Quem carrega a situação é a marca colorida ao lado do rótulo escrito
 * — então a informação nunca depende só de cor, e o amarelo de "Atenção"
 * (contraste 2,94:1) nunca precisa ser lido.
 */
export function CartaoIndicador({
  rotulo,
  valor,
  situacao,
  explicacao,
  fracao,
}: {
  rotulo: string;
  valor: string;
  situacao: Situacao;
  explicacao: string;
  /** 0..1 para a trilha. Omitido quando o indicador não é uma proporção. */
  fracao?: number;
}) {
  const cor = coresSituacao[situacao];

  return (
    <View style={estilos.indicador}>
      <Text style={estilos.indicadorRotulo}>{rotulo}</Text>
      <Text style={estilos.indicadorValor} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>

      {fracao !== undefined ? (
        <View style={estilos.indicadorTrilha}>
          <TrilhaDupla fracao={fracao} cor={cor} />
        </View>
      ) : null}

      <View style={estilos.situacaoLinha}>
        <View style={[estilos.situacaoMarca, { backgroundColor: cor }]} />
        <Text style={estilos.situacaoTexto}>{rotulosSituacao[situacao]}</Text>
      </View>

      <Text style={estilos.indicadorExplicacao}>{explicacao}</Text>
    </View>
  );
}

// -------------------------------------------------------- saldo 12 meses

/**
 * Saldo mês a mês como tira divergente em torno do zero.
 *
 * O significado vem da POSIÇÃO — acima da régua sobrou, abaixo faltou. A cor
 * é redundante, então o par verde/vermelho é seguro aqui, ao contrário de duas
 * séries lado a lado.
 */
export function TiraSaldo({ serie }: { serie: readonly PontoHistorico[] }) {
  const maiorModulo = Math.max(1, ...serie.map((p) => Math.abs(p.saldo)));
  const ultimo = serie.length - 1;

  return (
    <View>
      <View style={estilos.tira}>
        {serie.map((p, i) => {
          const altura = Math.max(2, (Math.abs(p.saldo) / maiorModulo) * METADE);
          const positivo = p.saldo >= 0;
          const cor = p.saldo === 0 ? cores.regua : positivo ? coresSituacao.bom : coresSituacao.ruim;

          return (
            <View
              key={p.anoMes}
              style={estilos.coluna}
              accessible
              accessibilityLabel={`${formatarMesCurto(p.anoMes)}: saldo ${formatarMoeda(p.saldo)}`}
            >
              <View style={estilos.metadeSuperior}>
                {positivo ? (
                  <View style={[estilos.barra, estilos.barraCima, { height: altura, backgroundColor: cor }]} />
                ) : null}
              </View>
              <View style={estilos.zero} />
              <View style={estilos.metadeInferior}>
                {!positivo ? (
                  <View style={[estilos.barra, estilos.barraBaixo, { height: altura, backgroundColor: cor }]} />
                ) : null}
              </View>
              <Text style={estilos.tiraRotulo} numberOfLines={1}>
                {i % 3 === 0 || i === ultimo ? formatarMesCurto(p.anoMes) : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={estilos.legendaTira}>
        <View style={estilos.legendaItem}>
          <View style={[estilos.amostra, { backgroundColor: coresSituacao.bom }]} />
          <Text style={estilos.legendaTexto}>Acima da régua: sobrou</Text>
        </View>
        <View style={estilos.legendaItem}>
          <View style={[estilos.amostra, { backgroundColor: coresSituacao.ruim }]} />
          <Text style={estilos.legendaTexto}>Abaixo: faltou</Text>
        </View>
      </View>
    </View>
  );
}

// ------------------------------------------------------ por categoria

/**
 * Despesas por categoria, da maior para a menor.
 *
 * Barras ranqueadas em vez de pizza: com sete fatias uma pizza vira adivinhação
 * de ângulo. Cada barra é rotulada com o nome, então a identidade nunca depende
 * da cor — o que também torna seguro reusar as cores livres que o usuário
 * escolheu para as categorias.
 */
export function BarrasPorCategoria({ fatias }: { fatias: readonly FatiaCategoria[] }) {
  return (
    <View style={estilos.categorias}>
      {fatias.map((f) => (
        <View key={`${f.categoriaId ?? 'x'}-${f.nome}`} style={estilos.categoria}>
          <View style={estilos.categoriaTopo}>
            <Text style={estilos.categoriaNome} numberOfLines={1}>
              {f.icone ? `${f.icone}  ` : ''}
              {f.nome}
            </Text>
            <Text style={estilos.categoriaValor}>{formatarMoeda(f.valor)}</Text>
            <Text style={estilos.categoriaPercentual}>{formatarPercentual(f.percentual)}</Text>
          </View>
          <View style={estilos.categoriaTrilho}>
            <View
              style={[
                estilos.categoriaBarra,
                { width: `${Math.max(2, f.fracaoDoMaior * 100)}%`, backgroundColor: f.cor ?? cores.tintaFraca },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// -------------------------------------------------------- casa x pessoal

/** Barra empilhada de dois (ou três) segmentos, com vão de 2px entre eles. */
export function DivisaoGrupos({ fatias }: { fatias: readonly FatiaGrupo[] }) {
  const coresGrupo = { CASA: '#0284C7', PESSOAL: '#B45309', SEM_GRUPO: cores.tintaFraca } as const;

  return (
    <View>
      <View style={estilos.empilhada}>
        {fatias.map((f, i) => (
          <View
            key={f.grupo}
            style={[
              estilos.segmento,
              {
                flex: Math.max(0.04, f.fracao),
                backgroundColor: coresGrupo[f.grupo],
                marginRight: i === fatias.length - 1 ? 0 : 2,
              },
            ]}
          />
        ))}
      </View>

      <View style={estilos.grupos}>
        {fatias.map((f) => (
          <View key={f.grupo} style={estilos.grupo}>
            <View style={estilos.grupoTopo}>
              <View style={[estilos.amostra, { backgroundColor: coresGrupo[f.grupo] }]} />
              <Text style={estilos.grupoRotulo}>{f.rotulo}</Text>
            </View>
            <Text style={estilos.grupoValor}>{formatarMoeda(f.valor)}</Text>
            <Text style={estilos.grupoPercentual}>{formatarPercentual(f.percentual)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const METADE = 30;

const estilos = StyleSheet.create({
  indicador: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: espaco.md,
    backgroundColor: cores.folha,
    borderRadius: raio.md,
    borderWidth: REGUA,
    borderColor: cores.regua,
  },
  indicadorRotulo: tipografia.etiqueta,
  indicadorValor: { ...tipografia.numeroHeroi, fontSize: 24, marginTop: espaco.xs },
  indicadorTrilha: { marginTop: espaco.xs },
  situacaoLinha: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs, marginTop: espaco.sm },
  situacaoMarca: { width: 8, height: 8, borderRadius: 4 },
  situacaoTexto: { ...tipografia.apoio, fontSize: 11, color: cores.tintaMedia },
  indicadorExplicacao: {
    ...tipografia.apoio,
    fontSize: 10,
    color: cores.tintaFraca,
    marginTop: espaco.xs,
  },

  tira: { flexDirection: 'row', alignItems: 'flex-start' },
  coluna: { flex: 1, alignItems: 'center' },
  metadeSuperior: { height: METADE, justifyContent: 'flex-end', alignSelf: 'stretch', paddingHorizontal: 2 },
  metadeInferior: { height: METADE, justifyContent: 'flex-start', alignSelf: 'stretch', paddingHorizontal: 2 },
  zero: { height: REGUA, alignSelf: 'stretch', backgroundColor: cores.reguaForte },
  barra: { alignSelf: 'stretch' },
  barraCima: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barraBaixo: { borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  tiraRotulo: { ...tipografia.numeroApoio, fontSize: 9, color: cores.tintaFraca, marginTop: espaco.xs },

  legendaTira: { flexDirection: 'row', gap: espaco.lg, marginTop: espaco.sm, flexWrap: 'wrap' },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  amostra: { width: 9, height: 9, borderRadius: 2 },
  legendaTexto: { ...tipografia.apoio, fontSize: 10, color: cores.tintaFraca },

  categorias: { gap: espaco.md },
  categoria: { gap: espaco.xs },
  categoriaTopo: { flexDirection: 'row', alignItems: 'baseline', gap: espaco.sm },
  categoriaNome: { ...tipografia.apoio, color: cores.tinta, flex: 1 },
  categoriaValor: tipografia.numeroApoio,
  categoriaPercentual: { ...tipografia.numeroApoio, color: cores.tintaFraca, minWidth: 34, textAlign: 'right' },
  categoriaTrilho: { height: 8, borderRadius: 4, backgroundColor: cores.papelFundo, overflow: 'hidden' },
  categoriaBarra: { height: 8, borderRadius: 4 },

  empilhada: { flexDirection: 'row', height: 14, marginBottom: espaco.md },
  segmento: { borderRadius: 3 },
  grupos: { flexDirection: 'row', gap: espaco.lg, flexWrap: 'wrap' },
  grupo: { gap: 2 },
  grupoTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  grupoRotulo: tipografia.etiqueta,
  grupoValor: tipografia.numeroLinha,
  grupoPercentual: { ...tipografia.numeroApoio, fontSize: 11, color: cores.tintaFraca },
});
