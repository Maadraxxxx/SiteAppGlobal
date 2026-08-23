import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function CartButton() {
  const { totalItens } = useCart();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/carrinho')}
      style={[styles.button, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name="cart-outline" size={20} color={theme.text} />
      {totalItens > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" themeColor="primaryText" style={styles.badgeText}>
            {totalItens}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
