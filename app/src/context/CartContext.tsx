import type { GeracaoImagem, Produto } from '@global-decora/shared';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { cartStorage } from '@/lib/storage';

export interface CartItem {
  produto: Produto;
  quantidade: number;
  /** Quando presente, o cliente encomendou a arte gerada pela IA em vez da original. */
  geracao?: Pick<GeracaoImagem, 'id' | 'tema' | 'imagemUrl'>;
}

/** Linha do carrinho = produto + personalizacao. O mesmo painel com dois temas
 * diferentes sao dois itens, nao um com quantidade 2. */
export function chaveDoItem(item: Pick<CartItem, 'produto' | 'geracao'>) {
  return `${item.produto.id}|${item.geracao?.id ?? ''}`;
}

interface CartContextValue {
  items: CartItem[];
  totalItens: number;
  totalPreco: number;
  addItem: (produto: Produto, quantidade?: number, geracao?: CartItem['geracao']) => void;
  removeItem: (chave: string) => void;
  updateQuantidade: (chave: string, quantidade: number) => void;
  /** Espera a gravação: quem esvazia o carrinho costuma sair da tela em seguida. */
  clear: () => Promise<void>;
  /** Tira do carrinho só o que foi pago, deixando o resto no lugar. */
  removerItens: (chaves: string[]) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    cartStorage.get().then((json) => {
      if (json) {
        try {
          setItems(JSON.parse(json));
        } catch {
          // carrinho salvo corrompido — ignora e comeca vazio
        }
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      cartStorage.set(JSON.stringify(items));
    }
  }, [items, hydrated]);

  function addItem(produto: Produto, quantidade = 1, geracao?: CartItem['geracao']) {
    const chave = chaveDoItem({ produto, geracao });
    setItems((prev) => {
      const existente = prev.find((item) => chaveDoItem(item) === chave);
      if (existente) {
        return prev.map((item) =>
          chaveDoItem(item) === chave ? { ...item, quantidade: item.quantidade + quantidade } : item,
        );
      }
      return [...prev, { produto, quantidade, geracao }];
    });
  }

  function removeItem(chave: string) {
    setItems((prev) => prev.filter((item) => chaveDoItem(item) !== chave));
  }

  function updateQuantidade(chave: string, quantidade: number) {
    if (quantidade <= 0) {
      removeItem(chave);
      return;
    }
    setItems((prev) => prev.map((item) => (chaveDoItem(item) === chave ? { ...item, quantidade } : item)));
  }

  /**
   * Grava o carrinho vazio na hora, sem esperar o efeito que persiste o estado.
   * Depois de fechar o pedido a tela troca na sequência, e se a página for
   * recarregada antes de o efeito rodar o carrinho voltava do armazenamento
   * como se a compra não tivesse acontecido.
   */
  async function clear() {
    setItems([]);
    await cartStorage.set(JSON.stringify([]));
  }

  /**
   * Usado quando um pagamento é confirmado: saem só os itens daquele pedido.
   * Esvaziar tudo levaria junto o que o cliente escolheu depois, enquanto
   * esperava o PIX cair.
   */
  async function removerItens(chaves: string[]) {
    const alvo = new Set(chaves);
    const restantes = items.filter((item) => !alvo.has(chaveDoItem(item)));
    setItems(restantes);
    await cartStorage.set(JSON.stringify(restantes));
  }

  const totalItens = useMemo(() => items.reduce((sum, item) => sum + item.quantidade, 0), [items]);
  const totalPreco = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.produto.preco) * item.quantidade, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{ items, totalItens, totalPreco, addItem, removeItem, removerItens, updateQuantidade, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de CartProvider');
  return ctx;
}
