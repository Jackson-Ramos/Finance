import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cores, espaco, fontes, raio } from '../lib/tema';

/**
 * Teclado próprio, no lugar do teclado do Android.
 *
 * Três motivos: (1) só produz dígito, então o valor nunca vira texto inválido;
 * (2) a tecla ✓ salva sem tirar o polegar da zona de alcance, que é o que põe
 * o lançamento abaixo de 5 segundos; (3) fica sempre visível, sem a animação
 * de abrir/fechar do teclado do sistema.
 *
 * A entrada é "estilo caixa": cada dígito empurra o valor uma casa. Ver
 * `digitarCentavos` em lib/money.ts.
 */
export function TecladoNumerico({
  aoDigitar,
  aoConfirmar,
  corConfirmar,
  podeConfirmar,
  rotuloConfirmar = 'Salvar lançamento',
}: {
  aoDigitar: (tecla: string) => void;
  aoConfirmar: () => void;
  corConfirmar: string;
  podeConfirmar: boolean;
  rotuloConfirmar?: string;
}) {
  return (
    <View style={estilos.grade}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <Tecla key={d} rotulo={d} aoTocar={() => aoDigitar(d)} />
      ))}

      <Tecla
        rotulo="⌫"
        acessivel="Apagar último dígito"
        aoTocar={() => aoDigitar('backspace')}
        discreta
      />
      <Tecla rotulo="0" aoTocar={() => aoDigitar('0')} />

      <Pressable
        onPress={aoConfirmar}
        disabled={!podeConfirmar}
        accessibilityRole="button"
        accessibilityLabel={rotuloConfirmar}
        accessibilityState={{ disabled: !podeConfirmar }}
        style={({ pressed }) => [
          estilos.tecla,
          estilos.confirmar,
          { backgroundColor: podeConfirmar ? corConfirmar : cores.superficieBaixa },
          pressed && estilos.pressionada,
        ]}
      >
        <Text
          style={[
            estilos.confirmarGlifo,
            { color: podeConfirmar ? cores.superficie : cores.textoFraco },
          ]}
        >
          ✓
        </Text>
      </Pressable>
    </View>
  );
}

function Tecla({
  rotulo,
  aoTocar,
  acessivel,
  discreta = false,
}: {
  rotulo: string;
  aoTocar: () => void;
  acessivel?: string;
  discreta?: boolean;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityLabel={acessivel ?? rotulo}
      style={({ pressed }) => [estilos.tecla, pressed && estilos.pressionada]}
    >
      <Text style={[estilos.teclaGlifo, discreta && estilos.teclaGlifoDiscreta]}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
  },
  tecla: {
    // 3 colunas: base folgada + flexGrow para consumir os dois vãos de 8.
    flexBasis: '30%',
    flexGrow: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.contorno,
  },
  pressionada: { opacity: 0.65 },
  teclaGlifo: {
    fontFamily: fontes.numero,
    fontSize: 22,
    color: cores.texto,
  },
  teclaGlifoDiscreta: { color: cores.textoMedio, fontSize: 20 },
  confirmar: { borderWidth: 0 },
  confirmarGlifo: { fontSize: 24, fontWeight: '700' },
});
