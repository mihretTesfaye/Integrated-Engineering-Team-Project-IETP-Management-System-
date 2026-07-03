import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, tokenStore, usersApi, ApiError, type User } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On first load, if we already have a token, try to hydrate the session
  // instead of forcing the person to log in again on every refresh.
  useEffect(() => {
    const hasToken = !!tokenStore.getAccess();
    if (!hasToken) {
      setLoading(false);
      return;
    }
    usersApi
      .me()
      .then(setUser)
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await auth.login(email, password);
      tokenStore.set(res.access, res.refresh);
      // The login response already carries the user, no need for another round trip.
      setUser({
        id: res.user.id,
        full_name: res.user.full_name,
        email: res.user.email,
        role: res.user.role,
        department: res.user.department,
        is_active: true,
        created_at: '',
        updated_at: '',
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? 'Incorrect email or password.'
            : err.message
          : 'Could not reach the server. Is the Django backend running?';
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
