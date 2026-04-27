import { createAuthClient } from "better-auth/react";

const CACHE_KEY = "atlas_session_cache";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // 
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp } = authClient;

export async function signOut() {
  // Vider le cache AVANT le signOut
  if (typeof window !== "undefined") {
    localStorage.removeItem(CACHE_KEY);
  }
  
  await authClient.signOut();
  
  if (typeof window !== "undefined") {
    // Supprimer les cookies
    document.cookie = "__Secure-better-auth.session_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;secure;samesite=none";
    document.cookie = "better-auth.session_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    window.location.href = "/";
  }
}

export function useSession() {
  const session = authClient.useSession();

  if (typeof window !== "undefined") {
    if (session.data) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(session.data));
    } else if (!session.isPending) {
      localStorage.removeItem(CACHE_KEY); // ✅ vide le cache si déconnecté
    }
  }

  const cached =
    typeof window !== "undefined"
      ? localStorage.getItem(CACHE_KEY)
      : null;

  return {
    data: session.data ?? (cached ? JSON.parse(cached) : null),
    isPending: session.isPending && !cached,
    error: session.error,
  };
}
