import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ImageUploadField } from '@/components/ImageUploadField';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAdminBanners, useCreateBanner, useRemoveBanner } from '@/hooks/useBanners';
import { useTheme } from '@/hooks/use-theme';

/**
 * A mesma proporção que a Home usa pro slide. Antes o recorte era quadrado e a
 * miniatura aqui também, então o admin escolhia uma foto e a Home cortava o
 * topo e o pé dela sem aviso. Agora o que se recorta é o que se vê.
 */
const PROPORCAO = 4 / 3;
/** Altura da caixa de adicionar: uma faixa, não um retângulo 4:3 vazio e enorme. */
const ALTURA_ADICIONAR = 132;

/** Pastilha escura sobre a foto — legível em cima de qualquer imagem. */
function Pastilha({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.pastilha, style]}>{children}</View>;
}

export default function AdminBannersScreen() {
  const { data, isLoading } = useAdminBanners();
  const createMutation = useCreateBanner();
  const removeMutation = useRemoveBanner();
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();
  const [error, setError] = useState<string>();
  const [removendoId, setRemovendoId] = useState<string>();

  // Derivado da janela, e não medido com onLayout: aqui o onLayout não reemite
  // de forma confiável, e o Screen só tem o padding lateral.
  const { width: janela } = useWindowDimensions();
  const largura = Math.min(janela - Spacing.four * 2, MaxContentWidth);
  const alturaFoto = Math.round(largura / PROPORCAO);

  const fotos = data?.items ?? [];

  async function handleAdd(url: string | undefined) {
    if (!url) return;
    setError(undefined);
    try {
      await createMutation.mutateAsync(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar a foto');
    }
  }

  // mutate() engole a falha em silencio — com mutateAsync da pra avisar
  // quando a exclusao nao foi, em vez da foto so continuar ali sem explicacao.
  async function handleRemove(id: string) {
    setError(undefined);
    setRemovendoId(id);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir a foto');
    } finally {
      setRemovendoId(undefined);
    }
  }

  const cabecalho = (
    <View style={styles.cabecalho}>
      {/* Sem titulo repetido: a barra de navegacao ja diz "Carrossel da Home". */}
      <ThemedText type="small" themeColor="textSecondary">
        As fotos giram sozinhas na tela inicial, uma a cada 4 segundos. O recorte
        é o mesmo que você vê aqui.
      </ThemedText>

      <ImageUploadField
        aspect={[4, 3]}
        boxWidth={largura}
        boxHeight={ALTURA_ADICIONAR}
        onChange={handleAdd}
      />

      {error ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {fotos.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.secaoTitulo}>
          NO CARROSSEL · {fotos.length} {fotos.length === 1 ? 'FOTO' : 'FOTOS'}
        </ThemedText>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        showsVerticalScrollIndicator={mostrarBarra}
        data={fotos}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={cabecalho}
        contentContainerStyle={styles.lista}
        renderItem={({ item, index }) => {
          const removendo = removendoId === item.id;

          return (
            <View style={[styles.cartao, { width: largura, backgroundColor: theme.backgroundElement }]}>
              <Image
                source={{ uri: item.imagemUrl }}
                style={{ width: largura, height: alturaFoto }}
                contentFit="cover"
              />

              {/* A ordem importa num carrossel — sem o número não dá pra saber
                  qual entra primeiro. */}
              <Pastilha style={styles.posicao}>
                <ThemedText type="smallBold" style={styles.pastilhaTexto}>
                  {index + 1}
                </ThemedText>
              </Pastilha>

              <Pressable
                onPress={() => handleRemove(item.id)}
                disabled={!!removendoId}
                hitSlop={8}
                style={({ pressed }) => [styles.excluir, { opacity: pressed ? 0.6 : 1 }]}>
                <Pastilha style={styles.pastilhaRedonda}>
                  {removendo ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="trash" size={16} color="#FFFFFF" />
                  )}
                </Pastilha>
              </Pressable>

              {/* Enquanto exclui, escurece a foto: mostra que aquela ali é a
                  que está saindo, e não uma vizinha. */}
              {removendo ? <View style={styles.veu} /> : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Ionicons name="images-outline" size={40} color={theme.textSecondary} />
            <ThemedText type="smallBold">Nenhuma foto ainda</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.vazioTexto}>
              Adicione a primeira aí em cima — ela aparece na Home na hora.
            </ThemedText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  cabecalho: {
    gap: Spacing.three,
  },
  secaoTitulo: {
    letterSpacing: 0.6,
    marginTop: Spacing.one,
  },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  erroTexto: {
    flex: 1,
  },
  cartao: {
    borderRadius: Radius.medium,
    // Sem isto os cantos da foto vazam por cima do cartão.
    overflow: 'hidden',
  },
  pastilha: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pastilhaRedonda: {
    width: 32,
    height: 32,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  pastilhaTexto: {
    color: '#FFFFFF',
    minWidth: 12,
    textAlign: 'center',
  },
  posicao: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
  },
  excluir: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  veu: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  vazioTexto: {
    textAlign: 'center',
  },
});
