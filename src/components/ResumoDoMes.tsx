import { StyleSheet, Text, View } from 'react-native';
import { formatarMoeda } from '../lib/format';
import { cores, corDoTipo, espaco, raio, REGUA, tipografia } from '../lib/tema';
import { fracaoRealizada, type ResumoMes } from '../services/resumoMes';
import type { TipoLancamento } from '../types/dominio';
import { TrilhaDupla } from './TrilhaDupla';

/**
 * Cartão de resumo. As duas visões aparecem juntas em toda linha:
 * o número em destaque é o REALIZADO, o "de X" é o PREVISTO, e a trilha
 * mostra a proporção entre eles.
 */
export function ResumoDoMes({ resumo }: { resumo: ResumoMes }) {
  const saldoPositivo = resumo.realizado.saldo >= 0;

  return (
    <View style={estilos.cartao}>
      <View style={estilos.heroi}>
        <Text style={estilos.etiqueta}>Saldo realizado</Text>
        <Text
          style={[estilos.saldo, { color: saldoPositivo ? cores.tinta : cores.saida }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatarMoeda(resumo.realizado.saldo)}
        </Text>
        <Text style={estilos.saldoPrevisto}>
          previsto para o mês {formatarMoeda(resumo.previsto.saldo)}
        </Text>
      </View>

      <View style={estilos.regua} />

      <Linha
        rotulo="Entradas"
        tipo="RECEITA"
        realizado={resumo.realizado.receitas}
        previsto={resumo.previsto.receitas}
      />
      <Linha
        rotulo="Saídas"
        tipo="DESPESA"
        realizado={resumo.realizado.despesas}
        previsto={resumo.previsto.despesas}
      />
      <Linha
        rotulo="Aportes"
        tipo="APORTE"
        realizado={resumo.realizado.aportes}
        previsto={resumo.previsto.aportes}
      />

      {resumo.contagem.pendentes > 0 ? (
        <>
          <View style={estilos.regua} />
          <View style={estilos.rodape}>
            <Text style={estilos.rodapeTexto}>
              {resumo.contagem.pendentes}{' '}
              {resumo.contagem.pendentes === 1 ? 'lançamento aberto' : 'lançamentos abertos'}
            </Text>
            <Text style={estilos.rodapeNumero}>
              {resumo.aPagar > 0 ? `a pagar ${formatarMoeda(resumo.aPagar)}` : ''}
              {resumo.aPagar > 0 && resumo.aReceber > 0 ? '   ·   ' : ''}
              {resumo.aReceber > 0 ? `a receber ${formatarMoeda(resumo.aReceber)}` : ''}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function Linha({
  rotulo,
  tipo,
  realizado,
  previsto,
}: {
  rotulo: string;
  tipo: TipoLancamento;
  realizado: number;
  previsto: number;
}) {
  const cor = corDoTipo[tipo];
  const fracao = fracaoRealizada({ previsto, realizado });

  return (
    <View style={estilos.linha}>
      <View style={estilos.linhaTopo}>
        <Text style={estilos.etiqueta}>{rotulo}</Text>
        <Text style={[estilos.linhaValor, { color: previsto === 0 ? cores.tintaFraca : cor }]}>
          {formatarMoeda(realizado)}
        </Text>
      </View>
      <View style={estilos.linhaBaixo}>
        <TrilhaDupla fracao={fracao} cor={cor} />
        <Text style={estilos.linhaPrevisto}>de {formatarMoeda(previsto)}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.folha,
    borderRadius: raio.lg,
    borderWidth: REGUA,
    borderColor: cores.regua,
    marginHorizontal: espaco.lg,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.lg,
  },
  heroi: { marginBottom: espaco.md },
  etiqueta: tipografia.etiqueta,
  saldo: { ...tipografia.numeroHeroi, marginTop: espaco.xs },
  saldoPrevisto: { ...tipografia.numeroApoio, marginTop: espaco.xs },
  regua: {
    height: REGUA,
    backgroundColor: cores.regua,
    marginVertical: espaco.md,
  },
  linha: { marginBottom: espaco.md },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  linhaValor: tipografia.numeroLinha,
  linhaBaixo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    marginTop: espaco.xs,
  },
  linhaPrevisto: tipografia.numeroApoio,
  rodape: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: espaco.xs,
  },
  rodapeTexto: tipografia.apoio,
  rodapeNumero: { ...tipografia.numeroApoio, fontSize: 11 },
});
