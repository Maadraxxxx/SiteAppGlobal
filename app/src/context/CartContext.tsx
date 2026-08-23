import type { Produto } from '@global-decora/shared';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { cartStorage } from '@/lib/storage';

export interface CartItem {
  produto: Produto;
  quantidade: number;
}

interface CartContextValue {
  items: CartItem[];
  totalItens: number;
  totalPreco: number;
  addItem: (produto: Produto, quantidade?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQuantidade: (produtoId: string, quantidade: number) => void;
  clear: () => void;
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

  function addItem(produto: Produto, quantidade = 1) {
    setItems((prev) => {
      const existente = prev.find((item) => item.produto.id === produto.id);
      if (existente) {
        return prev.map((item) =>
          item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + quantidade } : item,
        );
      }
      return [...prev, { produto, quantidade }];
    });
  }

  function removeItem(produtoId: string) {
    setItems((prev) => prev.filter((item) => item.produto.id !== produtoId));
  }

  function updateQuantidade(produtoId: string, quantidade: number) {
    if (quantidade <= 0) {
      removeItem(produtoId);
      return;
    }
    setItems((prev) => prev.map((item) => (item.produto.id === produtoId ? { ...item, quantidade } : item)));
  }

  function clear() {
    setItems([]);
  }

  const totalItens = useMemo(() => items.reduce((sum, item) => sum + item.quantidade, 0), [items]);
  const totalPreco = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.produto.preco) * item.quantidade, 0),
    [items],
  );

  return (
    <CartContext.Provider value={{ items, totalItens, totalPreco, addItem, removeItem, updateQuantidade, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de CartProvider');
  return ctx;
}
