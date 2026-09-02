import type { UsuarioAdmin } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useDefinirRole, useUsuarios } from '@/hooks/useConfiguracao';
import { useTheme } from '@/hooks/use-theme';

function Linha({
  usuario,
  souEu,
  ocupado,
  onAlternar,
}: {
  usuario: UsuarioAdmin;
  souEu: boolean;
  ocupado: boolean;
  onAlternar: () => void;
}) {
  const theme = useTheme();
  const admin = usuario.role === 'ADMIN';

  return (
    <View style={[styles.linha, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.avatar, { backgroundColor: admin ? theme.primary : theme.secondary }]}>
        <ThemedText type="smallBold" themeColor={admin ? 'primaryText' : 'text'}>
          {usuario.nome.trim().charAt(0).toUpperCase()}
        </ThemedText>
      </View>

      <View style={styles.linhaTexto}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {usuario.nome}
          {souEu ? ' · você' : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {usuario.email}
        </ThemedText>
      </View>

      {/* O cargo e o botão são a mesma coisa: mostra o que a pessoa é hoje e,
          tocando, vira o contrário. Dois controles separados fariam o admin
          procurar onde clicar. */}
      <Pressable
        onPress={onAlternar}
        disabled={ocupado || souEu}
        style={({ pressed }) => [
          styles.cargo,
          {
            backgroundColor: admin ? theme.primary : 'transparent',
            borderColor: admin ? theme.primary : theme.border,
            opacity: souEu ? 0.5 : pressed ? 0.7 : 1,
          },
        ]}>
        {ocupado ? (
          <ActivityIndicator size="small" color={admin ? theme.primaryText : theme.primary} />
        ) : (
          <ThemedText type="small" themeColor={admin ? 'primaryText' : 'textSecondary'}>
            {admin ? 'Admin' : 'Cliente'}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

export default function AdminUsuariosScreen() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [mexendoEm, setMexendoEm] = useState<string>();
  const [error, setError] = useState<string>();
  const { usuario: eu } = useAuth();
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  useEffect(() => {
    const timeout = setTimeout(() => setFiltro(busca.trim()), 300);
    return () => clearTimeout(timeout);
  }, [busca]);

  const { data, isLoading } = useUsuarios(filtro || undefined);
  const definir = useDefinirRole();

  const usuarios = data?.items ?? [];
  const admins = usuarios.filter((u) => u.role === 'ADMIN').length;

  async function alternar(usuario: UsuarioAdmin) {
    setError(undefined);
    setMexendoEm(usuario.id);
    try {
      await definir.mutateAsync({
        id: usuario.id,
        role: usuario.role === 'ADMIN' ? 'CLIENTE' : 'ADMIN',
      });
    } catch (err) {
      // As recusas do servidor (último admin, rebaixar a si mesmo) chegam aqui
      // já escritas pra pessoa ler.
      setError(err instanceof Error ? err.message : 'Não deu para mudar o cargo');
    } finally {
      setMexendoEm(undefined);
    }
  }

  return (
    <Screen scroll={false} maxWidth={640} style={styles.tela}>
      <View style={[styles.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou e-mail"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          style={[styles.buscaInput, { color: theme.text, fontFamily: Fonts.sans }]}
        />
        {busca ? (
          <Pressable onPress={() => setBusca('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {data?.total ?? 0} {data?.total === 1 ? 'pessoa' : 'pessoas'} · {admins}{' '}
        {admins === 1 ? 'administrador' : 'administradores'}
      </ThemedText>

      {error ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : usuarios.length ? (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Linha
              usuario={item}
              souEu={item.id === eu?.id}
              ocupado={mexendoEm === item.id}
              onAlternar={() => alternar(item)}
            />
          )}
        />
      ) : (
        <View style={styles.vazio}>
          <Ionicons name="people-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Ninguém encontrado
          </ThemedText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.three,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  buscaInput: {
    flex: 1,
    fontSize: 14,
  },
  lista: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  cargo: {
    minWidth: 78,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  carregando: {
    marginTop: Spacing.four,
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
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
