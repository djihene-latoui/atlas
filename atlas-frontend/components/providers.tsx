"use client";

import { AuthProvider } from "@/contexts/AuthContext";

/**
 * Ce composant regroupe tous les contextes de l'application.
 * On l'utilise pour entourer le contenu dans layout.tsx sans le polluer.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}