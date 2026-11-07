import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFieldKb } from '../../state/fieldKb';
import { TermKeyboard } from './TermKeyboard';

/** Bottom of a screen with KbTextInput fields: our keyboard while one of them is focused. */
export function KeyboardDock() {
  const actions = useFieldKb((s) => s.actions);
  // Android back closes the keyboard first, like the system one
  useEffect(() => {
    if (!actions || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      actions.hide();
      return true;
    });
    return () => sub.remove();
  }, [actions]);
  if (!actions) return null;
  return <TermKeyboard actions={actions} />;
}
