"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (userData: AuthUser) => void;
  logout: (locale?: string) => Promise<void>;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;

        if (data?.success) {
          setUser(data.data.user);
          localStorage.setItem("wr_user", JSON.stringify(data.data.user));
        } else {
          localStorage.removeItem("wr_user");
          setUser(null);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        localStorage.removeItem("wr_user");
        setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback((userData: AuthUser) => {
    localStorage.setItem("wr_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(
    async (locale = "en") => {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("wr_user");
      setUser(null);
      router.push(`/${locale}/auth/login`);
      router.refresh();
    },
    [router],
  );

  const isAdmin = user?.role === "ADMIN";
  const isLoggedIn = Boolean(user);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isAdmin, isLoggedIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
