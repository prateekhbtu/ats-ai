import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { authApi, profileApi, PublicProfile } from '../lib/api';

interface AuthContextType {
  user: PublicProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (id_token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (user: PublicProfile) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('auth_token'),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    profileApi
      .get()
      .then(({ profile }) => setUser(profile))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const storeAuth = (newToken: string, newUser: PublicProfile) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (email: string, password: string) => {
    const { token: t, user: u } = await authApi.login(email, password);
    storeAuth(t, u);
  };

  const register = async (email: string, password: string, name: string) => {
    const { token: t, user: u } = await authApi.register(email, password, name);
    storeAuth(t, u);
  };

  const googleLogin = async (id_token: string) => {
    const { token: t, user: u } = await authApi.google(id_token);
    storeAuth(t, u);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { profile } = await profileApi.get();
    setUser(profile);
  }, []);

  const updateUser = useCallback((u: PublicProfile) => {
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        googleLogin,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
