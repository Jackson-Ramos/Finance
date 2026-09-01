import { Pressable, StyleSheet, Text, View } from 'react-native';
import { anoMesAtual } from '../lib/date';
import { formatarMesAno } from '../lib/format';
import { cores, espaco, tipografia } from '../lib/tema';
import type { AnoMes } from '../types/dominio';

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
      <Seta rotulo="Mês anterior" glifo="‹" aoTocar={aoVoltar} />

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

      <Seta rotulo="Próximo mês" glifo="›" aoTocar={aoAvancar} />
    </View>
  );
}

function Seta({
  glifo,
  rotulo,
  aoTocar,
}: {
  glifo: string;
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
      <Text style={estilos.setaGlifo}>{glifo}</Text>
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
  mes: tipografia.mes,
  voltar: {
    ...tipografia.apoio,
    fontSize: 11,
    color: cores.tintaFraca,
    marginTop: 2,
  },
  seta: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  setaPressionada: { backgroundColor: cores.papelFundo },
  setaGlifo: {
    fontSize: 26,
    lineHeight: 30,
    color: cores.tintaMedia,
  },
});
