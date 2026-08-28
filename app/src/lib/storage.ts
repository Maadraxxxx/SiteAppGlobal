import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'global-decora:token';
const CART_KEY = 'global-decora:carrinho';
// Pedido esperando o PIX cair. Guardado pra que fechar o app nao faca o
// cliente perder o aviso de pagamento confirmado.
const PAGAMENTO_KEY = 'global-decora:pagamento-observado';

export const tokenStorage = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export const pagamentoStorage = {
  get: () => AsyncStorage.getItem(PAGAMENTO_KEY),
  set: (id: string) => AsyncStorage.setItem(PAGAMENTO_KEY, id),
  clear: () => AsyncStorage.removeItem(PAGAMENTO_KEY),
};

export const cartStorage = {
  get: () => AsyncStorage.getItem(CART_KEY),
  set: (json: string) => AsyncStorage.setItem(CART_KEY, json),
};
