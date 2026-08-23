import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { estilosHooks, formatosHooks, useCategorias } from '@/hooks/useCatalogo';
import { useAdminProduto, useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';

export default function AdminProdutoFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'novo';

  const { data } = useAdminProduto(isNew ? undefined : id);
  const categorias = useCategorias();
  const formatos = formatosHooks.useList();
  const estilos = estilosHooks.useList();
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [medidas, setMedidas] = useState('');
  const [peso, setPeso] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>();
  const [formatoId, setFormatoId] = useState<string>();
  const [estiloId, setEstiloId] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const produto = data?.produto;
    if (produto) {
      setNome(produto.nome);
      setDescricao(produto.descricao ?? '');
      setPreco(String(produto.preco));
      setMedidas(produto.medidas ?? '');
      setPeso(produto.peso ? String(produto.peso) : '');
      setImagemUrl(produto.imagemUrl ?? '');
      setCategoriaId(produto.categoriaId);
      setFormatoId(produto.formatoId);
      setEstiloId(produto.estiloId);
    }
  }, [data]);

  async function handleSave() {
    const precoNumero = Number(preco.replace(',', '.'));
    if (!nome.trim() || !categoriaId || !formatoId || !estiloId || Number.isNaN(precoNumero)) {
      setError('Preencha nome, preço, categoria, formato e estilo.');
      return;
    }
    setError(undefined);

    const input = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      preco: precoNumero,
      medidas: medidas.trim() || undefined,
      peso: peso ? Number(peso.replace(',', '.')) : undefined,
      imagemUrl: imagemUrl.trim() || undefined,
      categoriaId,
      formatoId,
      estiloId,
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync(input);
      } else {
        await updateMutation.mutateAsync({ id, input });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Screen style={{ gap: Spacing.three }}>
      <ThemedText type="title">{isNew ? 'Novo produto' : 'Editar produto'}</ThemedText>

      <TextField label="Nome" value={nome} onChangeText={setNome} />
      <TextField label="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <TextField label="Preço (R$)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" />
      <TextField label="Medidas" value={medidas} onChangeText={setMedidas} placeholder="ex: 1.5m diâmetro" />
      <TextField label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
      <TextField label="URL da imagem" value={imagemUrl} onChangeText={setImagemUrl} autoCapitalize="none" />

      <View style={styles.pickerGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Categoria
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {categorias.data?.items.map((categoria) => (
              <Chip
                key={categoria.id}
                label={categoria.nome}
                selected={categoriaId === categoria.id}
                onPress={() => setCategoriaId(categoria.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.pickerGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Formato
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {formatos.data?.items.map((formato) => (
              <Chip
                key={formato.id}
                label={formato.nome}
                selected={formatoId === formato.id}
                onPress={() => setFormatoId(formato.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.pickerGroup}>
        <ThemedText type="small" themeColor="textSecondary">
          Estilo
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {estilos.data?.items.map((estilo) => (
              <Chip
                key={estilo.id}
                label={estilo.nome}
                selected={estiloId === estilo.id}
                onPress={() => setEstiloId(estilo.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Salvar" onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickerGroup: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
