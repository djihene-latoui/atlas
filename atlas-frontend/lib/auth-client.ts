/**
 * @file lib/auth-client.ts
 * @description Initialisation et export du client BetterAuth côté navigateur.
 * Les cookies de session sont envoyés automatiquement via `credentials: 'include'`.
 *
 * Variable d'environnement requise :
 * - `NEXT_PUBLIC_API_URL` : URL du backend Express (ex: http://localhost:3005)
 *
 * Exports :
 * - `authClient` : instance complète du client BetterAuth
 * - `signIn`     : connexion par email/mot de passe
 * - `signUp`     : inscription avec champs additionnels (role, etc.)
 * - `signOut`    : déconnexion (supprime le cookie de session)
 * - `useSession` : hook React retournant `{ data: session, isPending, error }`
 *                  avec cache localStorage pour éviter le flash de chargement
 */
import { createAuthClient } from "better-auth/react";

const CACHE_KEY = "atlas_session_cache";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp } = authClient;

/**
 * Déconnexion — vide le cache localStorage avant de signOut
 * pour éviter qu'un cache stale réapparaisse au prochain montage.
 */
export async function signOut() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CACHE_KEY);
  }
  await authClient.signOut();
}

/**
 * Hook useSession avec cache localStorage.
 *
 * - Premier rendu : utilise le cache immédiatement → pas de flash
 * - BetterAuth confirme la session en arrière-plan → met à jour le cache
 * - Déconnexion ou session expirée → vide le cache
 */
export function useSession() {
  const session = authClient.useSession();

  if (typeof window !== "undefined") {
    if (session.data) {
      // Session valide → on met à jour le cache
      localStorage.setItem(CACHE_KEY, JSON.stringify(session.data));
    } else if (!session.isPending) {
      // Plus de session et chargement terminé → on vide le cache
      localStorage.removeItem(CACHE_KEY);
    }
  }

  // Lecture du cache pour le rendu initial
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
