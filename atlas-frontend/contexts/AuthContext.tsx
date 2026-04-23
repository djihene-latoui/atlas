"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useSession, signOut } from "@/lib/auth-client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  console.log("SESSION:", { session, isPending });

  const user = session?.user
    ? ({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role:
          ((session.user as Record<string, unknown>).role as string) === "SELLER"
            ? "VENDEUR"
            : ((session.user as Record<string, unknown>).role as string) || "CLIENT",
        image: session.user.image,
      } as User)
    : null;

  const logout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isPending,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
