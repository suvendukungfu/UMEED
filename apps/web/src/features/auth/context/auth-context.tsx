"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthContext as AuthContextType, Role, Permission } from "@umeed/contracts";

interface AuthState {
  context: AuthContextType | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  hasPermission: (permission: Permission) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  context: null,
  loading: true,
  signIn: async () => false,
  signOut: async () => {},
  switchOrganization: async () => false,
  hasPermission: () => false,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<AuthContextType | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const body = await res.json();
        setContext(body.data);
      } else {
        setContext(null);
      }
    } catch {
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const body = await res.json();
        setContext(body.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      setContext(null);
    }
  };

  const switchOrganization = async (organizationId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/switch-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (res.ok) {
        const body = await res.json();
        setContext(body.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!context) return false;
    return context.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        context,
        loading,
        signIn,
        signOut,
        switchOrganization,
        hasPermission,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

