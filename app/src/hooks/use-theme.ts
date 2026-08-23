import { Colors } from '@/constants/theme';

// O app fica sempre no tema claro (cores da marca), sem seguir o modo
// escuro do sistema — o app ainda nao tem uma versao escura desenhada.
export function useTheme() {
  return Colors.light;
}
