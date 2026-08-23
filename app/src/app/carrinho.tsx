import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCart, type CartItem } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';

function CartRow({ item }: { item: CartItem }) {
  const { updateQuantidade, removeItem } = useCart();
  const theme = useTheme();
  const { produto, quantidade } = item;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {produto.imagemUrl ? (
        <Image source={{ uri: produto.imagemUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
      )}

      <View style={styles.rowInfo}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {produto.nome}
        </ThemedText>
        <ThemedText type="small" themeColor="primary">
          R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
        </ThemedText>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => updateQuantidade(produto.id, quantidade - 1)}
            style={[styles.stepperButton, { borderColor: theme.border }]}
            hitSlop={8}>
            <Ionicons name="remove" size={16} color={theme.text} />
          </Pressable>
          <ThemedText type="small" style={styles.stepperValue}>
            {quantidade}
          </ThemedText>
          <Pressable
            onPress={() => updateQuantidade(produto.id, quantidade + 1)}
            style={[styles.stepperButton, { borderColor: theme.border }]}
            hitSlop={8}>
            <Ionicons name="add" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => removeItem(produto.id)} hitSlop={8} style={styles.removeButton}>
        <Ionicons name="trash" size={18} color={theme.danger} />
      </Pressable>
    </View>
  );
}

export default function CarrinhoScreen() {
  const { items, totalPreco, clear } = useCart();
  const [avisoCheckout, setAvisoCheckout] = useState(false);
  const theme = useTheme();

  if (!items.length) {
    return (
      <Screen style={styles.empty}>
        <Ionicons name="cart-outline" size={40} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.emptyText}>
          Seu carrinho está vazio.
        </ThemedText>
        <Button title="Ver catálogo" onPress={() => router.replace('/(tabs)/catalogo')} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.produto.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <CartRow item={item} />}
      />

      <View style={[styles.summary, { borderColor: theme.border }]}>
        <View style={styles.summaryRow}>
          <ThemedText type="smallBold">Total</ThemedText>
          <ThemedText type="smallBold" themeColor="primary">
            R$ {totalPreco.toFixed(2).replace('.', ',')}
          </ThemedText>
        </View>

        {avisoCheckout ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.aviso}>
            O pagamento ainda não está disponível — essa parte chega na próxima etapa.
          </ThemedText>
        ) : null}

        <Button title="Finalizar compra" onPress={() => setAvisoCheckout(true)} />
        <Button title="Esvaziar carrinho" variant="ghost" onPress={clear} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.small,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    padding: Spacing.one,
  },
  summary: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aviso: {
    textAlign: 'center',
  },
});
