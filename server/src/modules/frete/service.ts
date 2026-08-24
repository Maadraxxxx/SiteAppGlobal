import { prisma } from '../../db/prisma';
import { badRequest } from '../../lib/http-error';
import { calcularFrete, type OpcaoFrete, type VolumeEntrada } from '../../lib/melhor-envio';

export interface ItemFrete {
  produtoId: string;
  quantidade: number;
}

/** Medida que o Melhor Envio aceita quando o produto nao tem a dimensao
 * cadastrada. Evita que um produto sem medida derrube a cotacao inteira. */
const PADRAO = { comprimento: 20, largura: 20, altura: 10, peso: 0.5 };

async function montarVolumes(itens: ItemFrete[]): Promise<VolumeEntrada[]> {
  const ids = [...new Set(itens.map((i) => i.produtoId))];
  const produtos = await prisma.produto.findMany({ where: { id: { in: ids }, ativo: true } });

  if (produtos.length !== ids.length) {
    throw badRequest('Algum produto do carrinho nao esta mais disponivel');
  }

  return itens.map((item) => {
    const produto = produtos.find((p) => p.id === item.produtoId);
    if (!produto) throw badRequest('Produto nao encontrado');

    return {
      id: produto.id,
      comprimento: Number(produto.comprimento ?? PADRAO.comprimento),
      largura: Number(produto.largura ?? PADRAO.largura),
      altura: Number(produto.altura ?? PADRAO.altura),
      peso: Number(produto.peso ?? PADRAO.peso),
      valor: Number(produto.preco) * item.quantidade,
      quantidade: item.quantidade,
    };
  });
}

export async function cotar(cepDestino: string, itens: ItemFrete[]): Promise<OpcaoFrete[]> {
  const volumes = await montarVolumes(itens);
  return calcularFrete({ cepDestino, volumes });
}

/**
 * Reconfere no Melhor Envio quanto custa o servico escolhido, em vez de
 * confiar no valor que o app mandou — senao daria pra fechar pedido com
 * frete de um centavo.
 */
export async function precoDoServico(cepDestino: string, itens: ItemFrete[], servicoId: number) {
  const opcoes = await cotar(cepDestino, itens);
  const escolhido = opcoes.find((o) => o.id === servicoId);
  if (!escolhido) throw badRequest('Essa opcao de frete nao esta mais disponivel');
  return escolhido;
}
