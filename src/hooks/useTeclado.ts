import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Altura do teclado do sistema, 0 quando fechado.
 *
 * A folha de lançamento fica ancorada na base da tela; sem isto, o teclado do
 * Android cobriria o campo de descrição em vez de empurrá-lo. `KeyboardAvoidingView`
 * não é confiável dentro de `Modal` no Android, então medimos direto.
 */
export function useAlturaTeclado(): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const naSubida = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const naDescida = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const mostrar = Keyboard.addListener(naSubida, (e) => setAltura(e.endCoordinates.height));
    const esconder = Keyboard.addListener(naDescida, () => setAltura(0));

    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, []);

  return altura;
}
