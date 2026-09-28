import { useQuery, useMutation } from "@tanstack/react-query";
import type { PublicUser } from "@shared/api";
import type { UserRole } from "@shared/constants";
import type { LoginInput, RegisterInput } from "@shared/validation";
import { api, queryClient } from "./api";

export const ME_KEY = ["/api/auth/me"];

const fetchMe = () => api<PublicUser | null>("GET", "/api/auth/me");

export function useAuth() {
  const query = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 5 * 60_000 });
  return { user: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

function onSignedIn(user: PublicUser) {
  // Drop anything cached for a previous session before storing the new user.
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
  queryClient.setQueryData(ME_KEY, user);
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => api<PublicUser>("POST", "/api/auth/login", input),
    onSuccess: onSignedIn,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) => api<PublicUser>("POST", "/api/auth/register", input),
    onSuccess: onSignedIn,
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api("POST", "/api/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}

export const roleLabel: Record<UserRole, string> = { student: "Student", organizer: "Organizer", admin: "Administrator" };

export const homeFor = (user: PublicUser | null) =>
  !user ? "/" : user.role === "admin" ? "/admin" : user.role === "organizer" ? "/organizer" : "/dashboard";
