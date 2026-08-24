import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

function iniciaisDe(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const letras = [partes[0], partes.length > 1 ? partes[partes.length - 1] : undefined]
    .filter(Boolean)
    .map((p) => (p as string)[0].toUpperCase());
  return letras.join('');
}

/** Agrupa as opcoes num cartao so, com titulo por cima — evita a fila de blocos soltos. */
function MenuGroup({ titulo, children }: { titulo: string; children: ReactNode }) {
  const theme = useTheme();
  // toArray aceita tanto uma linha so quanto varias, e ja descarta null/false.
  const linhas = Children.toArray(children);

  return (
    <View style={styles.grupo}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.grupoTitulo}>
        {titulo}
      </ThemedText>
      <View style={[styles.grupoCard, { backgroundColor: theme.backgroundElement }]}>
        {linhas.map((linha, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
            {linha}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  descricao,
  onPress,
  destaque,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  descricao: string;
  onPress: () => void;
  /** Pinta so o icone de laranja — chama atencao sem virar uma barra inteira colorida. */
  destaque?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.6 : 1 }]}>
      <View
        style={[
          styles.linhaIcone,
          { backgroundColor: destaque ? theme.primary : theme.backgroundSelected },
        ]}>
        <Ionicons name={icon} size={18} color={destaque ? theme.primaryText : theme.text} />
      </View>
      <View style={styles.linhaTexto}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {descricao}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function Rodape() {
  const versao = Constants.expoConfig?.version;
  return (
    <View style={styles.rodape}>
      <Image
        source={require('@/assets/images/hero-logo.png')}
        style={styles.rodapeLogo}
        contentFit="contain"
      />
      {versao ? (
        <ThemedText type="small" themeColor="textSecondary">
          Versão {versao}
        </ThemedText>
      ) : null}
    </View>
  );
}

export default function PerfilScreen() {
  const { usuario, isLoading, logout } = useAuth();
  const theme = useTheme();

  if (isLoading) return null;

  if (!usuario) {
    return (
      <Screen maxWidth={640} style={styles.screen}>
        <ThemedText type="subtitle">Perfil</ThemedText>

        <View style={styles.deslogado}>
          <View style={[styles.avatarVazio, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="person-outline" size={32} color={theme.textSecondary} />
          </View>
          <ThemedText type="smallBold">Você ainda não entrou</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.deslogadoTexto}>
            Entre na sua conta para acompanhar seus pedidos e salvar suas informações.
          </ThemedText>
          <View style={styles.deslogadoAcoes}>
            <Button title="Entrar" onPress={() => router.push('/(auth)/login')} />
            <Button title="Criar conta" variant="ghost" onPress={() => router.push('/(auth)/register')} />
          </View>
        </View>

        <Rodape />
      </Screen>
    );
  }

  const isAdmin = usuario.role === 'ADMIN';

  return (
    <Screen maxWidth={640} style={styles.screen}>
      <ThemedText type="subtitle">Perfil</ThemedText>

      <View style={[styles.identidade, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText type="smallBold" themeColor="primaryText" style={styles.iniciais}>
            {iniciaisDe(usuario.nome)}
          </ThemedText>
        </View>
        <View style={styles.identidadeTexto}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {usuario.nome}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {usuario.email}
          </ThemedText>
        </View>
        {isAdmin ? (
          <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">Admin</ThemedText>
          </View>
        ) : null}
      </View>

      <MenuGroup titulo="Minha conta">
        <MenuRow
          icon="receipt-outline"
          label="Meus Pedidos"
          descricao="Acompanhe o que você já pediu"
          onPress={() => router.push('/pedidos')}
        />
        <MenuRow
          icon="person-outline"
          label="Editar Perfil"
          descricao="Nome, e-mail e senha"
          onPress={() => router.push('/editar-perfil')}
        />
      </MenuGroup>

      {isAdmin ? (
        <MenuGroup titulo="Administração">
          <MenuRow
            icon="cube-outline"
            label="Painel Admin"
            descricao="Produtos e fotos do carrossel"
            destaque
            onPress={() => router.push('/admin')}
          />
        </MenuGroup>
      ) : null}

      <Pressable
        onPress={logout}
        style={({ pressed }) => [
          styles.sair,
          { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <ThemedText type="smallBold" themeColor="danger">
          Sair da conta
        </ThemedText>
      </Pressable>

      <Rodape />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  identidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciais: {
    fontSize: 18,
    lineHeight: 24,
  },
  identidadeTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  selo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  grupo: {
    gap: Spacing.two,
  },
  grupoTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grupoCard: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  divisor: {
    height: 1,
    marginLeft: 36 + Spacing.three * 2,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  linhaIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  sair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  rodape: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  rodapeLogo: {
    width: 88,
    aspectRatio: 16 / 9,
    borderRadius: Radius.small,
    opacity: 0.65,
  },
  deslogado: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  avatarVazio: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  deslogadoTexto: {
    textAlign: 'center',
  },
  deslogadoAcoes: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
