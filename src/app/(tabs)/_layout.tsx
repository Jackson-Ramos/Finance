import Tabs from 'expo-router/js-tabs';
import { BarraDeAbas } from '../../components/BarraDeAbas';
import { FolhaLancamento } from '../../components/FolhaLancamento';
import { useFolhaLancamento } from '../../hooks/useFolhaLancamento';
import { useAcoesLancamento, useCategoriasAtivas, useMesStore } from '../../hooks/useMes';
import { useObjetivosAtivos } from '../../hooks/useObjetivos';

/**
 * Os quatro destinos, mais a folha de lançamento.
 *
 * A ordem segue o uso: o painel responde "como está o mês", transações é o
 * detalhe, planejamento é manutenção, mais é leitura longa e ferramenta.
 * `saude` e `debug` ficam fora — são destinos empilhados, não abas.
 *
 * A folha é montada AQUI e não dentro de uma tela porque o FAB vive na barra de
 * abas: ele precisa abrir a folha esteja o usuário em qualquer aba, e uma tela
 * não alcança o estado de outra.
 */
export default function LayoutAbas() {
  const { aberta, emEdicao, fechar } = useFolhaLancamento();
  const anoMes = useMesStore((s) => s.anoMes);
  const categorias = useCategoriasAtivas();
  const objetivos = useObjetivosAtivos();
  const acoes = useAcoesLancamento();

  return (
    <>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraDeAbas {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Painel' }} />
        <Tabs.Screen name="transacoes" options={{ title: 'Transações' }} />
        <Tabs.Screen name="planejamento" options={{ title: 'Planejamento' }} />
        <Tabs.Screen name="mais" options={{ title: 'Mais' }} />
      </Tabs>

      <FolhaLancamento
        visivel={aberta}
        aoFechar={fechar}
        categorias={categorias}
        objetivos={objetivos}
        anoMes={anoMes}
        emEdicao={emEdicao}
        aoSalvar={acoes.salvar}
        aoExcluir={acoes.excluir}
        erro={acoes.erro}
      />
    </>
  );
}
