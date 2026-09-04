import type { StatusChamado } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { TagChamado } from '@/components/ConversaChamado';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useChamadosAdmin } from '@/hooks/useChamados';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

const FILTROS: { rotulo: string; valor?: StatusChamado }[] = [
  { rotulo: 'Aguardando', valor: 'ABERTO' },
  { rotulo: 'Respondidos', valor: 'RESPONDIDO' },
  { rotulo: 'Resolvidos', valor: 'RESOLVIDO' },
  { rotulo: 'Todos', valor: undefined },
];

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminChamadosScreen() {
  // Abre no que espera resposta: e a fila de trabalho, nao o arquivo.
  const [filtro, setFiltro] = useState<StatusChamado | undefined>('ABERTO');
  const { data, isLoading } = useChamadosAdmin(filtro);
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  const chamados = data?.items ?? [];

  return (
    <Screen scroll={false} maxWidth={720} style={styles.tela}>
      <View style={styles.filtros}>
        {FILTROS.map((f) => {
          const ativo = filtro === f.valor;
          return (
            <Pressable
              key={f.rotulo}
              onPress={() => setFiltro(f.valor)}
              style={({ pressed }) => [
                styles.filtro,
                {
                  backgroundColor: ativo ? theme.primary : theme.backgroundElement,
                  borderColor: ativo ? theme.primary : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="small" themeColor={ativo ? 'primaryText' : 'textSecondary'}>
                {f.rotulo}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {chamados.length} {chamados.length === 1 ? 'conversa' : 'conversas'}
        {data?.abertos ? ` · ${data.abertos} aguardando resposta` : ''}
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : chamados.length ? (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={chamados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const ultima = item.mensagens[0];

            return (
              <Pressable
                onPress={() => router.push(ROTAS.adminChamado(item.id))}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.cardTopo}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.assunto}>
                    {item.assunto}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>

                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.usuario.nome} · {item.usuario.email}
                </ThemedText>

                <TagChamado status={item.status} />

                {ultima ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {ultima.autor === 'LOJA' ? 'Você: ' : 'Cliente: '}
                    {ultima.texto}
                  </ThemedText>
                ) : null}

                <ThemedText type="small" themeColor="textSecondary">
                  {quando(item.updatedAt)}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.vazio}>
          <Ionicons name="chatbubbles-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Nada neste filtro.
          </ThemedText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filtro: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  lista: { gap: Spacing.two, paddingBottom: Spacing.four },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  assunto: { flex: 1 },
  carregando: { marginTop: Spacing.four },
  vazio: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
});
