"use client";

import { createElement, type PropsWithChildren } from "react";

import { AuthProvider as ContextAuthProvider, useAuth as useContextAuth } from "@/contexts/AuthContext";
import type { AuthUser } from "@/lib/types";

const TOKEN_KEY = "employed_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  signOut: () => void;
  setSession: (nextToken: string, nextUser: AuthUser) => void;
}

export function AuthProvider({ children }: PropsWithChildren) {
  return createElement(ContextAuthProvider, null, children);
}

export function useAuth(): AuthContextValue {
  const context = useContextAuth();

  return {
    user: context.user,
    token: context.token,
    isAuthenticated: Boolean(context.token),
    loading: context.isLoading,
    signOut: context.logout,
    setSession: (nextToken, _nextUser) => {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      window.dispatchEvent(new StorageEvent("storage", { key: TOKEN_KEY, newValue: nextToken }));
    },
  };
}
