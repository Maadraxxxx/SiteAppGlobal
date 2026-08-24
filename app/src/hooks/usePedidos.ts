import { useQuery } from '@tanstack/react-query';
import { pedidosApi } from '@/api/pedidos';

export function useResumoPedidosMes() {
  return useQuery({ queryKey: ['resumo-pedidos-mes'], queryFn: () => pedidosApi.resumoMes() });
}
