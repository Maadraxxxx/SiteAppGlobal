import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Tag } from '@/components/Tag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

export default function ProdutoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useProduto(id);
  const { addItem } = useCart();
  const theme = useTheme();
  const [quantidade, setQuantidade] = useState(1);
  const [confirmacao, setConfirmacao] = useState<{ quantidade: number } | null>(null);

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen style={styles.centered}>
        <ThemedText themeColor="textSecondary">Produto nao encontrado.</ThemedText>
      </Screen>
    );
  }

  const { produto } = data;

  function handleAddItem() {
    addItem(produto, quantidade);
    setConfirmacao({ quantidade });
    setQuantidade(1);
  }

  return (
    <Screen>
      {produto.imagemUrl ? (
        <Image source={{ uri: produto.imagemUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.secondary }]} />
      )}

      <ThemedText type="subtitle">{produto.nome}</ThemedText>
      <ThemedText type="title" themeColor="primary" style={styles.preco}>
        R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
      </ThemedText>

      <View style={styles.tags}>
        {produto.formato ? <Tag label={produto.formato.nome} /> : null}
        {produto.estilo ? <Tag label={produto.estilo.nome} /> : null}
        {produto.categoria ? <Tag label={produto.categoria.nome} /> : null}
      </View>

      {produto.descricao ? <ThemedText themeColor="textSecondary">{produto.descricao}</ThemedText> : null}

      <View style={styles.specs}>
        {produto.comprimento || produto.largura || produto.altura ? (
          <ThemedText type="small" themeColor="textSecondary">
            Dimensões: {produto.comprimento ?? '—'} x {produto.largura ?? '—'} x {produto.altura ?? '—'} cm
            (C x L x A)
          </ThemedText>
        ) : null}
        {produto.peso ? (
          <ThemedText type="small" themeColor="textSecondary">
            Peso: {produto.peso} kg
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.comprarRow}>
        <View style={[styles.stepper, { borderColor: theme.border }]}>
          <Pressable
            onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
            style={styles.stepperButton}
            hitSlop={8}>
            <Ionicons name="remove" size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.stepperValue}>
            {quantidade}
          </ThemedText>
          <Pressable onPress={() => setQuantidade((q) => q + 1)} style={styles.stepperButton} hitSlop={8}>
            <Ionicons name="add" size={18} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.addButton}>
          <Button title="Adicionar ao carrinho" onPress={handleAddItem} />
        </View>
      </View>

      <Modal visible={!!confirmacao} transparent animationType="fade" onRequestClose={() => setConfirmacao(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <View style={styles.modalThumbWrap}>
              {produto.imagemUrl ? (
                <Image source={{ uri: produto.imagemUrl }} style={styles.modalThumb} contentFit="cover" />
              ) : (
                <View style={[styles.modalThumb, { backgroundColor: theme.secondary }]} />
              )}
              <View style={[styles.modalCheck, { backgroundColor: theme.success, borderColor: theme.background }]}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.modalTextGroup}>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.modalTitle}>
                {produto.nome}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.modalTitle}>
                {confirmacao?.quantidade} {confirmacao?.quantidade === 1 ? 'unidade adicionada' : 'unidades adicionadas'} ao
                carrinho
              </ThemedText>
            </View>

            <View style={styles.modalActions}>
              <View style={styles.modalActionButton}>
                <Button title="Continuar comprando" variant="ghost" onPress={() => setConfirmacao(null)} />
              </View>
              <View style={styles.modalActionButton}>
                <Button
                  title="Ir para o carrinho"
                  onPress={() => {
                    setConfirmacao(null);
                    router.push('/carrinho');
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.large,
  },
  preco: {
    fontSize: 28,
    lineHeight: 34,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  specs: {
    gap: Spacing.one,
  },
  comprarRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'stretch',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
  },
  stepperButton: {
    padding: Spacing.two,
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.large,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  modalThumbWrap: {
    width: 88,
    height: 88,
  },
  modalThumb: {
    width: 88,
    height: 88,
    borderRadius: Radius.medium,
  },
  modalCheck: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextGroup: {
    gap: Spacing.half,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
  },
  modalActionButton: {
    flex: 1,
  },
});
