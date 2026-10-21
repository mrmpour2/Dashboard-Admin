import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../services/api/auth";
import { useCurrentUser } from "../hooks/api/useAuth";

import { AuthContext } from "./context";

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });

  useEffect(() => {
    const handleExpired = () => {
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], null);
    };
    window.addEventListener("auth:session-expired", handleExpired);
    return () => window.removeEventListener("auth:session-expired", handleExpired);
  }, [queryClient]);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(["auth", "me"], null);
    },
  });

  const value = useMemo(() => {
    const user = currentUser.data ?? null;
    return {
      user,
      isLoading: currentUser.isLoading,
      isAuthenticated: Boolean(user),
      error: currentUser.error,
      login: loginMutation.mutateAsync,
      isLoggingIn: loginMutation.isPending,
      loginError: loginMutation.error,
      logout: logoutMutation.mutateAsync,
      isLoggingOut: logoutMutation.isPending,
      updateProfile: (updated) => queryClient.setQueryData(["auth", "me"], (previous) => ({ ...previous, ...updated })),
      hasRole: (...roles) => Boolean(user) && (roles.length === 0 || roles.includes(user.role)),
    };
  }, [currentUser, loginMutation, logoutMutation, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
