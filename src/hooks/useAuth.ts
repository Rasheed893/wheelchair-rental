// src/hooks/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}

export function useAuth() {
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
  const isLoggedIn = user !== null;

  return { user, loading, login, logout, isAdmin, isLoggedIn };
}
