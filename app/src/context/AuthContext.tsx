import type { Usuario } from '@global-decora/shared';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { authApi } from '@/api/auth';
import { tokenStorage } from '@/lib/storage';

interface AuthContextValue {
  usuario: Usuario | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  loginComGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function restoreSession() {
    const token = await tokenStorage.get();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const { usuario } = await authApi.me();
      setUsuario(usuario);
    } catch {
      await tokenStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, senha: string) {
    const { token, usuario } = await authApi.login(email, senha);
    await tokenStorage.set(token);
    setUsuario(usuario);
  }

  async function register(nome: string, email: string, senha: string) {
    const { token, usuario } = await authApi.register(nome, email, senha);
    await tokenStorage.set(token);
    setUsuario(usuario);
  }

  async function loginComGoogle(idToken: string) {
    const { token, usuario } = await authApi.google(idToken);
    await tokenStorage.set(token);
    setUsuario(usuario);
  }

  async function logout() {
    await tokenStorage.clear();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, isLoading, login, register, loginComGoogle, logout, atualizarUsuario: setUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
