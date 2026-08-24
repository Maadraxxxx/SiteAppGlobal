import type { Endereco, EnderecoInput } from '@global-decora/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { enderecosApi } from '@/api/enderecos';
import { Spacing } from '@/constants/theme';
import { Button } from './Button';
import { TextField } from './TextField';
import { ThemedText } from './themed-text';

export function formatarCep(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function EnderecoForm({
  inicial,
  salvando,
  onSalvar,
  onCancelar,
}: {
  inicial?: Endereco;
  salvando?: boolean;
  onSalvar: (input: EnderecoInput) => void;
  onCancelar?: () => void;
}) {
  const [apelido, setApelido] = useState(inicial?.apelido ?? '');
  const [cep, setCep] = useState(inicial ? formatarCep(inicial.cep) : '');
  const [logradouro, setLogradouro] = useState(inicial?.logradouro ?? '');
  const [numero, setNumero] = useState(inicial?.numero ?? '');
  const [complemento, setComplemento] = useState(inicial?.complemento ?? '');
  const [bairro, setBairro] = useState(inicial?.bairro ?? '');
  const [cidade, setCidade] = useState(inicial?.cidade ?? '');
  const [uf, setUf] = useState(inicial?.uf ?? '');
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string>();

  /** Ao completar os 8 dígitos, busca o endereço e preenche o resto. */
  async function handleCep(valor: string) {
    const formatado = formatarCep(valor);
    setCep(formatado);
    setError(undefined);

    const digitos = formatado.replace(/\D/g, '');
    if (digitos.length !== 8) return;

    setBuscando(true);
    try {
      const { endereco } = await enderecosApi.buscarCep(digitos);
      // Só preenche o que veio; CEP de rua sem nome volta vazio e o cliente digita.
      if (endereco.logradouro) setLogradouro(endereco.logradouro);
      if (endereco.bairro) setBairro(endereco.bairro);
      if (endereco.cidade) setCidade(endereco.cidade);
      if (endereco.uf) setUf(endereco.uf);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel buscar o CEP');
    } finally {
      setBuscando(false);
    }
  }

  function handleSalvar() {
    if (!cep.replace(/\D/g, '') || !logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
      setError('Preencha CEP, rua, número, bairro, cidade e UF.');
      return;
    }
    setError(undefined);
    onSalvar({
      apelido: apelido.trim() || null,
      cep: cep.replace(/\D/g, ''),
      logradouro: logradouro.trim(),
      numero: numero.trim(),
      complemento: complemento.trim() || null,
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf: uf.trim().toUpperCase(),
    });
  }

  return (
    <View style={styles.container}>
      <TextField label="Apelido (opcional)" value={apelido} onChangeText={setApelido} placeholder="Casa, Trabalho..." />

      <View style={styles.linha}>
        <View style={styles.cepCampo}>
          <TextField
            label="CEP"
            value={cep}
            onChangeText={handleCep}
            keyboardType="number-pad"
            maxLength={9}
            placeholder="00000-000"
          />
        </View>
        {buscando ? <ActivityIndicator style={styles.buscando} /> : null}
      </View>

      <TextField label="Rua" value={logradouro} onChangeText={setLogradouro} />

      <View style={styles.linha}>
        <View style={styles.numeroCampo}>
          <TextField label="Número" value={numero} onChangeText={setNumero} />
        </View>
        <View style={styles.complementoCampo}>
          <TextField label="Complemento" value={complemento} onChangeText={setComplemento} placeholder="Apto, bloco..." />
        </View>
      </View>

      <TextField label="Bairro" value={bairro} onChangeText={setBairro} />

      <View style={styles.linha}>
        <View style={styles.cidadeCampo}>
          <TextField label="Cidade" value={cidade} onChangeText={setCidade} />
        </View>
        <View style={styles.ufCampo}>
          <TextField label="UF" value={uf} onChangeText={(v) => setUf(v.toUpperCase())} maxLength={2} />
        </View>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Salvar endereço" onPress={handleSalvar} loading={salvando} />
      {onCancelar ? <Button title="Cancelar" variant="ghost" onPress={onCancelar} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  cepCampo: {
    flex: 1,
  },
  buscando: {
    marginBottom: Spacing.three,
  },
  numeroCampo: {
    flex: 1,
  },
  complementoCampo: {
    flex: 2,
  },
  cidadeCampo: {
    flex: 3,
  },
  ufCampo: {
    flex: 1,
  },
});
