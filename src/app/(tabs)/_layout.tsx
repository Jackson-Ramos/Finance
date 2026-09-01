import Tabs from 'expo-router/js-tabs';
import { BarraDeAbas } from '../../components/BarraDeAbas';

/**
 * As quatro telas de produto. `debug` fica de fora: é ferramenta, não destino.
 *
 * A ordem segue o uso: o mês é o dia a dia, recorrências e objetivos são
 * manutenção, saúde é revisão.
 */
export default function LayoutAbas() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraDeAbas {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Mês' }} />
      <Tabs.Screen name="recorrencias" options={{ title: 'Recorrências' }} />
      <Tabs.Screen name="objetivos" options={{ title: 'Objetivos' }} />
      <Tabs.Screen name="saude" options={{ title: 'Saúde' }} />
    </Tabs>
  );
}
