import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearStoredAuth,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  loginWithEmail,
  registerWithEmail,
  storeAuth,
  type UserProfile,
} from '../lib/auth';

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    let active = true;
    const storedToken = getStoredToken();
    if (!storedToken) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void fetchCurrentUser(storedToken)
      .then((profile) => {
        if (!active) return;
        if (profile) {
          setUser(profile);
          setToken(storedToken);
        } else {
          clearStoredAuth();
          setUser(null);
          setToken(null);
        }
      })
      .catch(() => {
        if (!active) return;
        clearStoredAuth();
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginWithEmail(email, password);
    storeAuth(response);
    setUser(response.user);
    setToken(response.token);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const response = await registerWithEmail(email, password);
    storeAuth(response);
    setUser(response.user);
    setToken(response.token);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [loading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
