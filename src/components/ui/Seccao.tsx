import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { espaco, tipografia } from '../../lib/tema';

/**
 * Título de bloco, legenda opcional e uma ação à direita.
 *
 * A legenda existe para dizer o que o bloco significa quando o título sozinho
 * não basta — não para repetir o título com outras palavras.
 */
export function Seccao({
  titulo,
  legenda,
  acao,
  children,
}: {
  titulo: string;
  legenda?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={estilos.seccao}>
      <View style={estilos.cabecalho}>
        <View style={estilos.textos}>
          <Text style={estilos.titulo}>{titulo}</Text>
          {legenda ? <Text style={estilos.legenda}>{legenda}</Text> : null}
        </View>
        {acao}
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccao: { marginTop: espaco.xl },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.sm,
    marginBottom: espaco.md,
    paddingHorizontal: espaco.xs,
  },
  textos: { flex: 1 },
  titulo: tipografia.secao,
  legenda: { ...tipografia.apoio, fontSize: 11, marginTop: 2 },
});
