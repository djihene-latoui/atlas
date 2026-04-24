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
 *                  avec cache sessionStorage pour éviter le flash de chargement
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL}",
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut } = authClient;

/**
 * Hook useSession avec cache sessionStorage.
 *
 * Au premier rendu, si une session est déjà en cache (même onglet),
 * `isPending` est immédiatement `false` et la sidebar/layout s'affiche
 * sans flash. Le cache est mis à jour dès que BetterAuth confirme la session.
 *
 * Le sessionStorage est vidé automatiquement à la fermeture de l'onglet,
 * donc pas de risque de session fantôme entre deux utilisateurs.
 */
export function useSession() {
  const session = authClient.useSession();

  // Met à jour le cache dès qu'on a une session valide
  if (typeof window !== "undefined") {
    if (session.data) {
      sessionStorage.setItem("atlas_session", JSON.stringify(session.data));
    } else if (!session.isPending) {
      // Session expirée ou déconnexion — on vide le cache
      sessionStorage.removeItem("atlas_session");
    }
  }

  // Lit le cache pour le rendu initial
  const cached =
    typeof window !== "undefined"
      ? sessionStorage.getItem("atlas_session")
      : null;

  return {
    // Si BetterAuth n'a pas encore répondu, on utilise le cache
    data: session.data ?? (cached ? JSON.parse(cached) : null),
    // isPending = false si on a déjà un cache (pas de flash)
    isPending: session.isPending && !cached,
    error: session.error,
  };
}
