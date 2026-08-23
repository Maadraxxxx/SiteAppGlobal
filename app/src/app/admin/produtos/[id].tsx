import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormSection } from '@/components/FormSection';
import { ProdutoImagePicker } from '@/components/ProdutoImagePicker';
import { Screen } from '@/components/Screen';
import { TagSelector } from '@/components/TagSelector';
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
  const createFormato = formatosHooks.useCreate();
  const createEstilo = estilosHooks.useCreate();
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string>();
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
      setComprimento(produto.comprimento ? String(produto.comprimento) : '');
      setLargura(produto.largura ? String(produto.largura) : '');
      setAltura(produto.altura ? String(produto.altura) : '');
      setPeso(produto.peso ? String(produto.peso) : '');
      setImagemUrl(produto.imagemUrl ?? undefined);
      setCategoriaId(produto.categoriaId);
      setFormatoId(produto.formatoId);
      setEstiloId(produto.estiloId);
    }
  }, [data]);

  function toNumber(value: string) {
    return value.trim() ? Number(value.replace(',', '.')) : undefined;
  }

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
      comprimento: toNumber(comprimento),
      largura: toNumber(largura),
      altura: toNumber(altura),
      peso: toNumber(peso),
      imagemUrl,
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
    <Screen style={styles.screen}>
      <ThemedText type="title">{isNew ? 'Novo produto' : 'Editar produto'}</ThemedText>

      <FormSection title="Informações básicas">
        <TextField label="Nome" value={nome} onChangeText={setNome} />
        <TextField label="Descrição" value={descricao} onChangeText={setDescricao} multiline />
        <TextField label="Preço (R$)" value={preco} onChangeText={setPreco} keyboardType="decimal-pad" />
      </FormSection>

      <FormSection title="Dimensões e peso">
        <View style={styles.dimensionsRow}>
          <View style={styles.dimensionField}>
            <TextField
              label="Compr. (cm)"
              value={comprimento}
              onChangeText={setComprimento}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.dimensionField}>
            <TextField label="Larg. (cm)" value={largura} onChangeText={setLargura} keyboardType="decimal-pad" />
          </View>
          <View style={styles.dimensionField}>
            <TextField label="Alt. (cm)" value={altura} onChangeText={setAltura} keyboardType="decimal-pad" />
          </View>
        </View>
        <TextField label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
      </FormSection>

      <FormSection title="Imagem">
        <ProdutoImagePicker value={imagemUrl} onChange={setImagemUrl} />
      </FormSection>

      <FormSection title="Classificação">
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

        <TagSelector
          label="Formato"
          options={formatos.data?.items ?? []}
          selectedId={formatoId}
          onSelect={setFormatoId}
          onCreate={(nome) => createFormato.mutateAsync(nome)}
          creating={createFormato.isPending}
        />

        <TagSelector
          label="Estilo"
          options={estilos.data?.items ?? []}
          selectedId={estiloId}
          onSelect={setEstiloId}
          onCreate={(nome) => createEstilo.mutateAsync(nome)}
          creating={createEstilo.isPending}
        />
      </FormSection>

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
  screen: {
    gap: Spacing.four,
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dimensionField: {
    flex: 1,
  },
  pickerGroup: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
