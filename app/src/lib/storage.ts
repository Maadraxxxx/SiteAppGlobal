import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'global-decora:token';
const CART_KEY = 'global-decora:carrinho';

export const tokenStorage = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export const cartStorage = {
  get: () => AsyncStorage.getItem(CART_KEY),
  set: (json: string) => AsyncStorage.setItem(CART_KEY, json),
};
