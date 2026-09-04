import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { ImageUploadField } from '@/components/ImageUploadField';
import { Screen } from '@/components/Screen';
import { TagSelector } from '@/components/TagSelector';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  estilosHooks,
  formatosHooks,
  useCategorias,
  useCreateCategoria,
  useRemoveCategoria,
} from '@/hooks/useCatalogo';
import { useAdminProduto, useCreateProduto, useUpdateProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

export default function AdminProdutoFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const isNew = id === 'novo';

  const { data } = useAdminProduto(isNew ? undefined : id);
  const categorias = useCategorias();
  const formatos = formatosHooks.useList();
  const estilos = estilosHooks.useList();
  const createCategoria = useCreateCategoria();
  const createFormato = formatosHooks.useCreate();
  const createEstilo = estilosHooks.useCreate();
  const removeCategoria = useRemoveCategoria();
  const removeFormato = formatosHooks.useRemove();
  const removeEstilo = estilosHooks.useRemove();
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
  // Erro por campo: uma frase geral no rodape obriga a pessoa a procurar qual
  // dos dez campos esta faltando.
  const [erros, setErros] = useState<Record<string, string>>({});

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

    const faltando: Record<string, string> = {};
    if (!nome.trim()) faltando.nome = 'Dê um nome ao produto';
    if (!preco.trim()) faltando.preco = 'Informe o preço';
    else if (Number.isNaN(precoNumero)) faltando.preco = 'Preço inválido';
    else if (precoNumero <= 0) faltando.preco = 'O preço precisa ser maior que zero';
    if (!categoriaId) faltando.categoria = 'Escolha uma categoria';
    if (!formatoId) faltando.formato = 'Escolha um formato';
    if (!estiloId) faltando.estilo = 'Escolha um estilo';

    setErros(faltando);
    // Os tres ids entram na condicao alem da contagem: e o que diz ao
    // TypeScript que, dali pra baixo, nenhum deles e indefinido.
    if (Object.keys(faltando).length || !categoriaId || !formatoId || !estiloId) {
      setError('Faltam campos obrigatórios — eles estão marcados abaixo.');
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
    <Screen maxWidth={720} style={styles.screen}>
      <View style={styles.topo}>
        <ThemedText type="title">{isNew ? 'Novo produto' : 'Editar produto'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Os campos marcados com{' '}
          <ThemedText type="smallBold" themeColor="primary">
            *
          </ThemedText>{' '}
          são obrigatórios.
        </ThemedText>
      </View>

      <FormSection title="Informações básicas" icone="pricetag-outline">
        <TextField
          label="Nome"
          obrigatorio
          value={nome}
          onChangeText={setNome}
          error={erros.nome}
          placeholder="Ex: Painel redondo Halloween"
        />
        <TextField
          label="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          hint="Aparece na página do produto, abaixo do preço."
          placeholder="Material, o que acompanha, detalhes da arte..."
        />
        <TextField
          label="Preço"
          obrigatorio
          prefixo="R$"
          value={preco}
          onChangeText={setPreco}
          keyboardType="decimal-pad"
          error={erros.preco}
          placeholder="0,00"
        />
      </FormSection>

      {/* Dois por linha em vez de tres: com tres, cada campo ficava com pouco
          mais de cem pixels no celular e o rotulo nao cabia. */}
      <FormSection
        title="Dimensões e peso"
        icone="cube-outline"
        descricao="É com isso que a transportadora calcula o frete. Sem preencher, o cálculo sai errado.">
        <View style={styles.medidas}>
          <View style={styles.medida}>
            <TextField
              label="Comprimento"
              sufixo="cm"
              value={comprimento}
              onChangeText={setComprimento}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.medida}>
            <TextField
              label="Largura"
              sufixo="cm"
              value={largura}
              onChangeText={setLargura}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.medida}>
            <TextField
              label="Altura"
              sufixo="cm"
              value={altura}
              onChangeText={setAltura}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.medida}>
            <TextField
              label="Peso"
              sufixo="kg"
              value={peso}
              onChangeText={setPeso}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </FormSection>

      <FormSection
        title="Imagem"
        icone="image-outline"
        descricao="É a foto que aparece no catálogo e na tela inicial.">
        <ImageUploadField value={imagemUrl} onChange={setImagemUrl} />
      </FormSection>

      <FormSection
        title="Classificação"
        icone="funnel-outline"
        descricao="É por aqui que o cliente filtra o catálogo.">
        <TagSelector
          label="Categoria"
          genero="f"
          options={categorias.data?.items ?? []}
          selectedId={categoriaId}
          onSelect={setCategoriaId}
          onCreate={async (nome) => {
            // A API de categoria responde { categoria }, o TagSelector espera { item }.
            const { categoria } = await createCategoria.mutateAsync({ nome });
            return { item: categoria };
          }}
          creating={createCategoria.isPending}
          onRemove={(id) => removeCategoria.mutateAsync(id)}
          error={erros.categoria}
        />

        <TagSelector
          label="Formato"
          options={formatos.data?.items ?? []}
          selectedId={formatoId}
          onSelect={setFormatoId}
          onCreate={(nome) => createFormato.mutateAsync(nome)}
          creating={createFormato.isPending}
          onRemove={(id) => removeFormato.mutateAsync(id)}
          error={erros.formato}
        />

        <TagSelector
          label="Estilo"
          options={estilos.data?.items ?? []}
          selectedId={estiloId}
          onSelect={setEstiloId}
          onCreate={(nome) => createEstilo.mutateAsync(nome)}
          creating={createEstilo.isPending}
          onRemove={(id) => removeEstilo.mutateAsync(id)}
          error={erros.estilo}
        />
      </FormSection>

      {error ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.acoes}>
        <View style={styles.acaoSecundaria}>
          <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
        </View>
        <View style={styles.acaoPrincipal}>
          <Button
            title={isNew ? 'Cadastrar produto' : 'Salvar alterações'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  topo: {
    gap: Spacing.one,
  },
  medidas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  medida: {
    // Pede metade da linha e quebra sozinho: dois por linha no celular, os
    // quatro lado a lado numa tela larga.
    flexGrow: 1,
    flexBasis: 130,
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
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acaoSecundaria: {
    flexGrow: 1,
    flexBasis: 110,
  },
  acaoPrincipal: {
    flexGrow: 2,
    flexBasis: 180,
  },
});
