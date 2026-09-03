import { router } from 'expo-router';

type Href = Parameters<typeof router.push>[0];

/**
 * Rotas que existem em src/app mas que o router.d.ts gerado pelo Expo ainda
 * nao conhece nesta sessao do dev server — ele so regera o arquivo ao iniciar,
 * e o cache atual ainda lista telas ja removidas (as de categoria) e ignora as
 * novas. Reiniciando o `npm run dev` da pra apagar este arquivo e usar as
 * strings direto, com a checagem de rota de volta.
 */
export const ROTAS = {
  checkout: '/checkout' as Href,
  /** Catalogo ja aberto no filtro daquela categoria. */
  catalogoDaCategoria: (slug: string) => `/(tabs)/catalogo?categoria=${slug}` as Href,
  enderecos: '/enderecos' as Href,
  adminPedidos: '/admin/pedidos' as Href,
  adminFinanceiro: '/admin/financeiro' as Href,
  /** Lista de pedidos ja filtrada nos que aguardam pagamento. */
  adminPedidosAguardando: '/admin/pedidos?pagamento=AGUARDANDO' as Href,
  /** Abre a lista de pedidos já com aquele pedido aberto. */
  adminPedido: (pedidoId: string) => `/admin/pedidos?abrir=${pedidoId}` as Href,
  adminProdutos: '/admin/produtos' as Href,
  adminCarrossel: '/admin/banners' as Href,
  adminCategorias: '/admin/categorias' as Href,
  adminAbertura: '/admin/abertura' as Href,
  adminUsuarios: '/admin/usuarios' as Href,
  pedido: (pedidoId: string) => `/pedido/${pedidoId}` as Href,
  rastreio: (pedidoId: string) => `/rastreio/${pedidoId}` as Href,
  pagamento: (pedidoId: string) => `/pagamento/${pedidoId}` as Href,
};
