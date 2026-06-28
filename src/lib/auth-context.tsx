import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  setAuth: () => {},
  logout: () => {},
});

import { getCurrentUser } from "./auth.functions";

export function AuthProvider({ children, initialUser, initialToken }: { children: ReactNode; initialUser: User | null; initialToken: string | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [token, setToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem("lj-token");
        if (storedToken) {
          const res = await getCurrentUser({ data: { token: storedToken } });
          if (res.user) {
            setUser(res.user as any);
            setToken(storedToken);
          } else {
            localStorage.removeItem("lj-token");
          }
        }
      } catch (err) {
        console.error("Failed to restore session", err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const setAuth = (u: User | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (t) {
      try { localStorage.setItem("lj-token", t); } catch {}
    } else {
      try { localStorage.removeItem("lj-token"); } catch {}
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try { localStorage.removeItem("lj-token"); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
