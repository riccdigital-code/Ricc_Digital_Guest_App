import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/axios";
import { disconnectSocket } from "@/lib/socket";

export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "GUEST";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  propertyId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setSession: (u: AuthUser | null, token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "rb_token";
const USER_KEY = "rb_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on refresh (client only)
  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }
    try {
      const t = window.localStorage.getItem(TOKEN_KEY);
      const u = window.localStorage.getItem(USER_KEY);
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u) as AuthUser);
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persist = useCallback((u: AuthUser | null, t: string | null) => {
    if (typeof window === "undefined") return;
    if (t) window.localStorage.setItem(TOKEN_KEY, t);
    else window.localStorage.removeItem(TOKEN_KEY);
    if (u) window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(USER_KEY);
  }, []);

  const setSession = useCallback((u: AuthUser | null, t: string | null) => {
    setUser(u);
    setToken(t);
    persist(u, t);
  }, [persist]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{ token: string; user: AuthUser }>(
      "/api/auth/login",
      { email, password },
    );
    if (!data?.token || !data?.user) {
      throw new Error("Invalid response from authentication server");
    }
    setSession(data.user, data.token);
    return data.user;
  }, [setSession]);

  const logout = useCallback(() => {
    disconnectSocket();
    setSession(null, null);
  }, [setSession]);

  // Global handler for expired/invalid tokens
  useEffect(() => {
    const id = apiClient.interceptors.response.use(
      (r) => r,
      (err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          if (typeof window !== "undefined" &&
              window.localStorage.getItem(TOKEN_KEY)) {
            setSession(null, null);
          }
        }
        return Promise.reject(err);
      },
    );
    return () => { apiClient.interceptors.response.eject(id); };
  }, [setSession]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, setSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
