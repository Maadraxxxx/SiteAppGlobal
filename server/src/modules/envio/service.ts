import { StatusPedido } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { comprarEtiqueta, rastrear } from '../../lib/melhor-envio-etiqueta';

const PADRAO = { comprimento: 20, largura: 20, altura: 10, peso: 0.5 };

/** Só faz sentido despachar o que já foi pago. */
const STATUS_DESPACHAVEIS: StatusPedido[] = [
  StatusPedido.PAGO,
  StatusPedido.EM_PRODUCAO,
  StatusPedido.ENVIADO,
];

export async function gerarEtiqueta(pedidoId: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { itens: { include: { produto: true } }, usuario: true },
  });
  if (!pedido) throw notFound('Pedido nao encontrado');

  if (pedido.urlEtiqueta) throw badRequest('Esse pedido ja tem etiqueta');
  if (!STATUS_DESPACHAVEIS.includes(pedido.status)) {
    throw badRequest('So da pra gerar etiqueta de pedido pago');
  }
  if (!pedido.cepDestino || !pedido.enderecoLogradouro) {
    throw badRequest('Esse pedido nao tem endereco de entrega');
  }

  // O serviço escolhido no checkout ficou guardado só pelo nome; pra recomprar
  // a etiqueta o Melhor Envio quer o id. Recupera pelo endereço do pedido.
  const servicoId = await descobrirServicoId(pedido);

  // O CPF fica no endereço do cliente, e o pedido guarda uma cópia do endereço
  // sem o documento — então busca no cadastro dele pelo mesmo CEP.
  const endereco = await prisma.endereco.findFirst({
    where: { usuarioId: pedido.usuarioId, cep: pedido.cepDestino },
  });
  if (!endereco?.documento) {
    throw badRequest(
      'O cliente ainda nao informou o CPF/CNPJ desse endereco — a transportadora exige pra emitir a etiqueta.',
    );
  }

  const volumes = pedido.itens.map((item) => ({
    nome: item.produto?.nome ?? 'Produto',
    quantidade: item.quantidade,
    valorUnitario: Number(item.precoUnitario),
    comprimento: Number(item.produto?.comprimento ?? PADRAO.comprimento),
    largura: Number(item.produto?.largura ?? PADRAO.largura),
    altura: Number(item.produto?.altura ?? PADRAO.altura),
    peso: Number(item.produto?.peso ?? PADRAO.peso),
  }));

  const resultado = await comprarEtiqueta({
    servicoId,
    referencia: pedido.id,
    destinatario: {
      nome: pedido.usuario.nome,
      email: pedido.usuario.email,
      documento: endereco.documento,
      logradouro: pedido.enderecoLogradouro,
      numero: pedido.enderecoNumero ?? 'S/N',
      complemento: pedido.enderecoComplemento,
      bairro: pedido.enderecoBairro ?? '',
      cidade: pedido.enderecoCidade ?? '',
      uf: pedido.enderecoUf ?? '',
      cep: pedido.cepDestino,
    },
    volumes,
  });

  return prisma.pedido.update({
    where: { id: pedidoId },
    data: {
      melhorEnvioEnvioId: resultado.envioId,
      urlEtiqueta: resultado.urlEtiqueta,
      codigoRastreio: resultado.codigoRastreio,
      // Com etiqueta emitida o pedido saiu da bancada.
      status: pedido.status === StatusPedido.ENVIADO ? pedido.status : StatusPedido.ENVIADO,
    },
  });
}

/** Recota o frete daquele endereço e acha o id do serviço que foi escolhido. */
async function descobrirServicoId(pedido: {
  cepDestino: string | null;
  freteServico: string | null;
  itens: { produtoId: string | null; quantidade: number }[];
}) {
  const { cotar } = await import('../frete/service');
  const itens = pedido.itens
    .filter((i): i is { produtoId: string; quantidade: number } => !!i.produtoId)
    .map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade }));

  const opcoes = await cotar(pedido.cepDestino as string, itens);
  const escolhido = opcoes.find((o) => o.nome === pedido.freteServico) ?? opcoes[0];
  if (!escolhido) throw badRequest('Nenhuma transportadora disponivel pra esse endereco agora');
  return escolhido.id;
}

/** Admin cola o código quando despacha por fora (balcão dos Correios etc). */
export async function definirRastreioManual(pedidoId: string, codigo: string) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw notFound('Pedido nao encontrado');

  return prisma.pedido.update({
    where: { id: pedidoId },
    data: {
      codigoRastreio: codigo.trim().toUpperCase(),
      status: pedido.status === StatusPedido.PAGO ? StatusPedido.ENVIADO : pedido.status,
    },
  });
}

export async function rastreioDoPedido(pedidoId: string, usuarioId?: string) {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw notFound('Pedido nao encontrado');
  if (usuarioId && pedido.usuarioId !== usuarioId) throw notFound('Pedido nao encontrado');

  const base = {
    codigoRastreio: pedido.codigoRastreio,
    transportadora: pedido.freteTransportadora,
    servico: pedido.freteServico,
    prazoDias: pedido.fretePrazoDias,
    status: pedido.status,
  };

  // Sem envio no Melhor Envio (rastreio colado a mao) devolve so o codigo:
  // o cliente acompanha no site da transportadora.
  if (!pedido.melhorEnvioEnvioId) return { ...base, eventos: [] };

  try {
    const detalhe = await rastrear(pedido.melhorEnvioEnvioId);
    return {
      ...base,
      codigoRastreio: detalhe?.tracking ?? pedido.codigoRastreio,
      statusTransportadora: detalhe?.status as string | undefined,
      eventos: (detalhe?.tracking_events ?? []) as unknown[],
    };
  } catch {
    // Melhor Envio fora do ar nao pode derrubar a tela de rastreio do cliente.
    return { ...base, eventos: [] };
  }
}
