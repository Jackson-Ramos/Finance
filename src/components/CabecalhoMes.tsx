import { Pressable, StyleSheet, Text, View } from 'react-native';
import { anoMesAtual } from '../lib/date';
import { formatarMesAno } from '../lib/format';
import { ALVO_TOQUE, cores, espaco, tipografia } from '../lib/tema';
import type { AnoMes } from '../types/dominio';
import { Icone, type NomeIcone } from './ui/Icone';

/**
 * Navegação entre meses. O nome do mês é um botão: toca e volta para hoje.
 */
export function CabecalhoMes({
  anoMes,
  aoVoltar,
  aoAvancar,
  aoVoltarParaHoje,
}: {
  anoMes: AnoMes;
  aoVoltar: () => void;
  aoAvancar: () => void;
  aoVoltarParaHoje: () => void;
}) {
  const noMesCorrente = anoMes === anoMesAtual();

  return (
    <View style={estilos.linha}>
      <Seta rotulo="Mês anterior" icone="anterior" aoTocar={aoVoltar} />

      <Pressable
        onPress={aoVoltarParaHoje}
        disabled={noMesCorrente}
        style={estilos.centro}
        accessibilityRole="button"
        accessibilityLabel={
          noMesCorrente ? formatarMesAno(anoMes) : `${formatarMesAno(anoMes)}. Voltar para o mês atual`
        }
      >
        <Text style={estilos.mes}>{formatarMesAno(anoMes)}</Text>
        {noMesCorrente ? null : <Text style={estilos.voltar}>voltar para hoje</Text>}
      </Pressable>

      <Seta rotulo="Próximo mês" icone="seguinte" aoTocar={aoAvancar} />
    </View>
  );
}

function Seta({
  icone,
  rotulo,
  aoTocar,
}: {
  icone: NomeIcone;
  rotulo: string;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={12}
      style={({ pressed }) => [estilos.seta, pressed && estilos.setaPressionada]}
    >
      <Icone nome={icone} tamanho={22} cor={cores.textoMedio} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.lg,
    paddingTop: espaco.sm,
    paddingBottom: espaco.md,
  },
  centro: { alignItems: 'center', flex: 1 },
  mes: tipografia.titulo,
  voltar: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.textoFraco,
    marginTop: 2,
  },
  seta: {
    width: ALVO_TOQUE,
    height: ALVO_TOQUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ALVO_TOQUE / 2,
  },
  setaPressionada: { backgroundColor: cores.superficieBaixa },
});
